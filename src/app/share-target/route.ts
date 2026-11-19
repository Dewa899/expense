import { NextResponse } from "next/server";

/**
 * Fallback for the Web Share Target when the service worker is not active yet.
 * The service worker (public/sw.js) normally intercepts this POST and stores the
 * shared receipt; here we just redirect so the user still lands in the app.
 */
export async function POST(request: Request) {
	return NextResponse.redirect(new URL("/?from=share&nosw=1", request.url), 303);
}

export async function GET(request: Request) {
	return NextResponse.redirect(new URL("/", request.url), 303);
}
