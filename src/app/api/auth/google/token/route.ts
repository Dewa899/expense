import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    // Read Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
    }

    const supabaseToken = authHeader.substring(7);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

    // Authenticate user with Supabase using their token
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${supabaseToken}`
        }
      }
    });

    const { data: { user }, error: authError } = await client.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get Google connection details
    const { data: connection, error: dbError } = await client
      .from("google_connections")
      .select("refresh_token, sheet_id, google_email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (dbError || !connection) {
      return NextResponse.json({ connected: false });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

    // Refresh Google Access Token
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: connection.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      console.error("Error refreshing Google token:", data);
      return NextResponse.json({ connected: false, error: "refresh_failed" });
    }

    return NextResponse.json({
      connected: true,
      accessToken: data.access_token,
      sheetId: connection.sheet_id,
      googleEmail: connection.google_email,
    });
  } catch (err: any) {
    console.error("Exception refreshing Google token:", err);
    return NextResponse.json({ connected: false, error: "internal_error" });
  }
}
