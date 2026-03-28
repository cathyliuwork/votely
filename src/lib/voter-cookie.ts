export const VOTER_COOKIE = "votely_voter";
const MAX_AGE = 60 * 60 * 24 * 400; // ~400 days

export function voterCookieOptions(token: string) {
  return {
    name: VOTER_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  };
}
