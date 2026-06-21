import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-client";

// Helper to translate database transaction type to sheet-compatible string
function formatTransactionType(type: string): string {
  const t = type.toLowerCase();
  if (t === "income" || t.includes("pemasukan")) {
    return "Pemasukan / Income";
  }
  return "Pengeluaran / Expense";
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
    }

    const supabaseToken = authHeader.substring(7);

    // 1. Authenticate user with Supabase
    const supabaseService = getSupabaseServiceClient();
    const { data: { user }, error: authError } = await supabaseService.auth.getUser(supabaseToken);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch Google credentials & settings
    const [connRes, settingsRes, txsRes] = await Promise.all([
      supabaseService.from("google_connections").select("refresh_token, sheet_id").eq("user_id", user.id).single(),
      supabaseService.from("user_settings").select("custom_field_defs").eq("user_id", user.id).single(),
      supabaseService.from("transactions").select("*").eq("user_id", user.id).order("date", { ascending: true })
    ]);

    if (connRes.error || !connRes.data) {
      return NextResponse.json({ error: "Google Sheets integration is not connected.", code: "NOT_CONNECTED" }, { status: 404 });
    }

    const { refresh_token: refreshToken, sheet_id: sheetId } = connRes.data;
    const customFields = settingsRes.data?.custom_field_defs || [];
    const transactions = txsRes.data || [];

    // 3. Get Google access token using refresh token
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error) {
      console.error("Google token refresh error:", tokenData);
      return NextResponse.json({ error: "Could not authenticate with Google." }, { status: 400 });
    }

    const googleToken = tokenData.access_token;

    // 4. Group transactions by month (Indonesian Month Year names, e.g. "Juni 2026")
    const groupedTransactions: Record<string, typeof transactions> = {};
    transactions.forEach((tx) => {
      const dateObj = new Date(tx.date);
      // Format as e.g., "Juni 2026"
      const sheetName = dateObj.toLocaleString("id-ID", { month: "long", year: "numeric" });
      if (!groupedTransactions[sheetName]) {
        groupedTransactions[sheetName] = [];
      }
      groupedTransactions[sheetName].push(tx);
    });

    // 5. Query sheet metadata to check existing tabs
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`, {
      headers: { Authorization: `Bearer ${googleToken}` }
    });
    const metadata = await metaRes.json();
    if (!metaRes.ok) {
      console.error("Sheets metadata fetch failed:", metadata);
      return NextResponse.json({ error: "Spreadsheet not found or inaccessible in Google Drive." }, { status: 400 });
    }

    const existingSheets = metadata.sheets || [];

    // Prepare core headers matching the spreadsheet specifications
    const coreHeaders = ["Date / Tanggal", "Name / Nama", "Amount / Jumlah", "Type / Tipe", "Category / Kategori", "Note / Catatan"];
    const customFieldNames = customFields.map((f: any) => f.name);
    const allHeaders = [...coreHeaders, ...customFieldNames];

    // Process each month group
    for (const sheetName of Object.keys(groupedTransactions)) {
      let existingTab = existingSheets.find((s: any) => s.properties?.title === sheetName);
      let targetSheetId: number;

      if (!existingTab) {
        // Create new tab/sheet
        const createRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
          method: "POST",
          headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [{ addSheet: { properties: { title: sheetName } } }]
          }),
        });
        const createData = await createRes.json();
        if (!createRes.ok) {
          console.error(`Failed to create tab for ${sheetName}:`, createData);
          continue;
        }
        targetSheetId = createData.replies[0].addSheet.properties.sheetId;
      } else {
        targetSheetId = existingTab.properties.sheetId;
        // Clear existing values in the sheet
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A1:Z1000:clear`, {
          method: "POST",
          headers: { Authorization: `Bearer ${googleToken}` }
        });
      }

      // Build values matrix
      const values = [allHeaders];
      groupedTransactions[sheetName].forEach((t) => {
        const row = [
          new Date(t.date).toLocaleString("id-ID"),
          t.name,
          Math.abs(t.amount).toString(), // Store absolute positive value
          formatTransactionType(t.type),
          t.category,
          t.note || "",
          ...customFieldNames.map((name: string) => {
            const rawCustom = t.custom_fields || {};
            return rawCustom[name] || "";
          })
        ];
        values.push(row);
      });

      // Write values
      const lastColLetter = String.fromCharCode(65 + allHeaders.length - 1);
      const writeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A1:${lastColLetter}${values.length}?valueInputOption=USER_ENTERED`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });

      if (!writeRes.ok) {
        console.error(`Failed to write values for ${sheetName}:`, await writeRes.json());
      }

      // Apply styling formatting (frozen header, green theme, alternating columns width, stripes)
      const requests = [
        { updateDimensionProperties: { range: { sheetId: targetSheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 1 }, properties: { pixelSize: 200 }, fields: "pixelSize" } },
        { updateDimensionProperties: { range: { sheetId: targetSheetId, dimension: "COLUMNS", startIndex: 1, endIndex: 2 }, properties: { pixelSize: 280 }, fields: "pixelSize" } },
        { updateDimensionProperties: { range: { sheetId: targetSheetId, dimension: "COLUMNS", startIndex: 2, endIndex: 3 }, properties: { pixelSize: 140 }, fields: "pixelSize" } },
        { updateDimensionProperties: { range: { sheetId: targetSheetId, dimension: "COLUMNS", startIndex: 3, endIndex: 4 }, properties: { pixelSize: 160 }, fields: "pixelSize" } },
        { updateDimensionProperties: { range: { sheetId: targetSheetId, dimension: "COLUMNS", startIndex: 4, endIndex: 5 }, properties: { pixelSize: 200 }, fields: "pixelSize" } },
        { updateDimensionProperties: { range: { sheetId: targetSheetId, dimension: "COLUMNS", startIndex: 5, endIndex: 6 }, properties: { pixelSize: 400 }, fields: "pixelSize" } },
        { addConditionalFormatRule: { rule: { ranges: [{ sheetId: targetSheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: allHeaders.length }], booleanRule: { condition: { type: "CUSTOM_FORMULA", values: [{ userEnteredValue: "=ISODD(ROW())" }] }, format: { backgroundColor: { red: 0.95, green: 0.98, blue: 0.96 } } } }, index: 0 }},
        { repeatCell: { range: { sheetId: targetSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: allHeaders.length }, cell: { userEnteredFormat: { backgroundColor: { red: 0.06, green: 0.72, blue: 0.5 }, textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10, bold: true }, horizontalAlignment: "CENTER" } }, fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)" }},
        { updateSheetProperties: { properties: { sheetId: targetSheetId, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } },
      ];

      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ requests }),
      });
    }

    // Clean up original Sheet1 if multiple tabs exist
    const updatedMetaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`, {
      headers: { Authorization: `Bearer ${googleToken}` }
    });
    const updatedMetadata = await updatedMetaRes.json();
    const sheets = updatedMetadata.sheets || [];
    const sheet1 = sheets.find((s: any) => s.properties?.title === "Sheet1");
    if (sheet1 && sheets.length > 1) {
      try {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
          method: "POST",
          headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ requests: [{ deleteSheet: { sheetId: sheet1.properties.sheetId } }] }),
        });
      } catch (e) {}
    }

    return NextResponse.json({ success: true, sheetId });
  } catch (error: any) {
    console.error("Exception in Google Sheets Export:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
