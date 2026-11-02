with open('src/components/auth/AnimatedLampLogin.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('const [isOn, setIsOn] = useState(false);', 'const [isOn, setIsOn] = useState(true);')
text = text.replace('const [themeIndex, setThemeIndex] = useState(-1); // -1 = off', 'const [themeIndex, setThemeIndex] = useState(0); // 0 = warm default')

with open('src/components/auth/AnimatedLampLogin.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Updated AnimatedLampLogin.tsx default state')

with open('src/components/auth/lamp-login.css', 'r', encoding='utf-8') as f:
    css = f.read()

font_import = "@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');\n\n"
if '@import url' not in css:
    css = font_import + css

old_card_rule = '''  opacity: 0;
  transform: translateX(30px) scale(0.97);
  filter: blur(8px);
  pointer-events: none;'''

new_card_rule = '''  opacity: 0.95;
  transform: translateX(0) scale(1);
  filter: none;
  pointer-events: auto;'''

if old_card_rule in css:
    css = css.replace(old_card_rule, new_card_rule)
    print('Updated .login-card visibility rule')

with open('src/components/auth/lamp-login.css', 'w', encoding='utf-8') as f:
    f.write(css)
print('Updated lamp-login.css successfully')
