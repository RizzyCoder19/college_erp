import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const redirectPath = searchParams.get("redirect") || "/modules/students";

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Authenticating...</title>
</head>
<body style="background:#08090c;color:#fff;font-family:sans-serif;padding:2rem;">
  <p>Authenticating institutional session...</p>
  <script>
    document.cookie = "${SESSION_COOKIE_NAME}=${token}; path=/; max-age=604800; SameSite=Lax";
    window.location.replace("${redirectPath}");
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Set-Cookie": `${SESSION_COOKIE_NAME}=${token}; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}; SameSite=Lax`,
    },
  });
}

export async function POST() {
  return new NextResponse(null, { status: 404 });
}

