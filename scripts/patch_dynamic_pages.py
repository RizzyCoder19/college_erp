with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

if 'export const dynamic' not in c:
    c = 'export const dynamic = "force-dynamic";\n\n' + c
    with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
        f.write(c)
    print('Added force-dynamic to src/app/page.tsx')

with open('src/app/login/page.tsx', 'r', encoding='utf-8') as f:
    c2 = f.read()

if 'export const dynamic' not in c2:
    c2 = 'export const dynamic = "force-dynamic";\n\n' + c2
    with open('src/app/login/page.tsx', 'w', encoding='utf-8') as f:
        f.write(c2)
    print('Added force-dynamic to src/app/login/page.tsx')
