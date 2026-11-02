with open("src/components/auth/lamp-login.css", "r", encoding="utf-8") as f:
    css = f.read()

# Count curly braces
open_braces = css.count('{')
close_braces = css.count('}')
print(f"Open braces: {open_braces}, Close braces: {close_braces}")
