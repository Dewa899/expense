import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state"); // state holds our userId

  const origin = new URL(request.url).origin;

  if (!code || !userId) {
    console.error("Missing code or userId (state) in callback parameters");
    return NextResponse.redirect(`${origin}/?google_sync=error&reason=missing_params`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

    // 1. Exchange auth code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok || tokens.error) {
      console.error("Error exchanging code for token:", tokens);
      return NextResponse.redirect(`${origin}/?google_sync=error&reason=token_exchange_failed`);
    }

    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      // Note: Google only sends a refresh token on the first consent approval.
      // If prompt=consent is used, it should always be sent, but in case it's not, we log a warning.
      console.warn("No refresh_token returned. User might need to re-consent.");
    }

    // 2. Fetch user's Google email
    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userinfo = await userinfoRes.json();
    const googleEmail = userinfo.email || "Unknown Google User";

    // 3. Search or Create folder: 'expense by genlord'
    const folderSearchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='expense by genlord' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const folderSearchData = await folderSearchRes.json();
    let folderId = folderSearchData.files?.[0]?.id;

    if (!folderId) {
      const folderCreateRes = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "expense by genlord",
          mimeType: "application/vnd.google-apps.folder",
        }),
      });
      const folderData = await folderCreateRes.json();
      folderId = folderData.id;
    }

    // 4. Search or Create spreadsheet: 'Expense Export by GENLORD' inside folder
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='Expense Export by GENLORD' and '${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const searchData = await searchRes.json();
    let spreadsheetId = searchData.files?.[0]?.id;

    if (!spreadsheetId) {
      const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Expense Export by GENLORD",
          mimeType: "application/vnd.google-apps.spreadsheet",
          parents: [folderId],
        }),
      });
      const createData = await createRes.json();
      spreadsheetId = createData.id;
    }

    // 5. Save/Update connection in Supabase via service client
    const supabaseService = getSupabaseServiceClient();

    // Fetch existing connection to make sure we don't overwrite a refresh token with null
    // (Google doesn't always send refresh_token on re-authorization if the user already consented)
    let tokenToSave = refreshToken;
    if (!tokenToSave) {
      const { data: existingConn } = await supabaseService
        .from("google_connections")
        .select("refresh_token")
        .eq("user_id", userId)
        .single();
      if (existingConn?.refresh_token) {
        tokenToSave = existingConn.refresh_token;
      } else {
        // If we don't have a refresh token at all, redirect with error
        return NextResponse.redirect(`${origin}/?google_sync=error&reason=no_refresh_token`);
      }
    }

    const { error: upsertError } = await supabaseService
      .from("google_connections")
      .upsert({
        user_id: userId,
        google_email: googleEmail,
        refresh_token: tokenToSave,
        sheet_id: spreadsheetId,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error("Supabase upsert error in Google connection:", upsertError);
      return NextResponse.redirect(`${origin}/?google_sync=error&reason=db_save_failed`);
    }

    return NextResponse.redirect(`${origin}/?google_sync=success`);
  } catch (error: any) {
    console.error("Exception in Google OAuth Callback:", error);
    return NextResponse.redirect(`${origin}/?google_sync=error&reason=exception`);
  }
}
