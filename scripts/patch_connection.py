with open('src/lib/auth/guards.ts', 'r', encoding='utf-8') as f:
    g = f.read()

g = g.replace('import { cookies } from \"next/headers\";', 'import { cookies } from \"next/headers\";\nimport { connection } from \"next/server\";')
g = g.replace('  try {\n    const cookieStore = await cookies();', '  try {\n    try { await connection(); } catch {}\n    const cookieStore = await cookies();')

with open('src/lib/auth/guards.ts', 'w', encoding='utf-8') as f:
    f.write(g)
print('Updated guards.ts with connection()')

with open('src/lib/auth/session.ts', 'r', encoding='utf-8') as f:
    s = f.read()

s = s.replace('import crypto from \"crypto\";', 'import crypto from \"crypto\";\nimport { connection } from \"next/server\";')
s = s.replace('export async function verifySessionToken(rawToken: string): Promise<SessionVerificationResult | null> {\n  try {\n    if (!rawToken', 'export async function verifySessionToken(rawToken: string): Promise<SessionVerificationResult | null> {\n  try {\n    try { await connection(); } catch {}\n    if (!rawToken')

with open('src/lib/auth/session.ts', 'w', encoding='utf-8') as f:
    f.write(s)
print('Updated session.ts with connection()')
