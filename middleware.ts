import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const basicAuth = req.headers.get("authorization");

  if (basicAuth) {
    const authValue = basicAuth.split(" ")[1];
    const [user, pwd] = atob(authValue).split(":");

    if (
      user === process.env.BASIC_AUTH_USER &&
      pwd === process.env.BASIC_AUTH_PASS
    ) {
      return NextResponse.next();
    }
  }

  return new Response("Auth Required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Secure Area"',
    },
  });
}

// Protège toutes les pages sauf les assets
export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
