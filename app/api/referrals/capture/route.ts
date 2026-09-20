import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { linkReferral, referralCookie, validReferralCode } from "@/db/referrals";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.headers.set("Cache-Control", "no-store");
  const code = request.nextUrl.searchParams.get("referral") ?? "";
  if (!validReferralCode(code)) return response;
  const session = await auth.api.getSession({ headers: request.headers });
  if (session && !session.session.impersonatedBy) {
    await linkReferral(session.user.id, code);
    response.cookies.delete(referralCookie);
  } else if (!session) {
    response.cookies.set(referralCookie, code, {
      httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax",
      path: "/", maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}
