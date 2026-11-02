with open('src/components/auth/AnimatedLampLogin.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('// lamp-login.css bundled in globals.css', 'import "./lamp-login.css";')

with open('src/components/auth/AnimatedLampLogin.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Added import "./lamp-login.css";')
