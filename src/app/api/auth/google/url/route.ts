import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "";

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${new URL(request.url).origin}/api/auth/google/callback`;
    const scope = [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/userinfo.email"
    ].join(" ");

    // access_type=offline forces Google to return a refresh_token
    // prompt=consent forces Google to show consent screen (required to get refresh_token)
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${encodeURIComponent(userId)}`;

    return NextResponse.json({ url: authUrl });
  } catch (error: any) {
    console.error("Error generating auth URL:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
