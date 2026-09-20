import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("referral");
  if (!code) return NextResponse.next();
  const url = new URL("/api/referrals/capture", request.url);
  url.searchParams.set("referral", code);
  return NextResponse.redirect(url);
}

export const config = { matcher: "/" };
