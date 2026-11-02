with open("src/lib/actions/auth.ts", "r", encoding="utf-8") as f:
    c = f.read()

old_cookie = '''    // Set secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });'''

new_cookie = '''    // Set HTTP-only cookie (only flag Secure when actually served over HTTPS, allowing local HTTP/mobile LAN access)
    const isHttps = (process.env.NEXTAUTH_URL?.startsWith("https://") || process.env.PUBLIC_URL?.startsWith("https://") || process.env.VERCEL_URL?.startsWith("https://")) ?? false;
    const isSecure = process.env.NODE_ENV === "production" && isHttps;

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });'''

if old_cookie in c:
    c = c.replace(old_cookie, new_cookie)
    print("Patched cookieStore.set to support local/mobile HTTP deployments")
else:
    print("Warning: old_cookie not found")

with open("src/lib/actions/auth.ts", "w", encoding="utf-8") as f:
    f.write(c)
