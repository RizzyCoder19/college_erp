import os

files = ["src/app/login/page.tsx", "src/components/auth/AnimatedLampLogin.tsx", "src/components/auth/lamp-login.css"]
for fn in files:
    with open(fn, "rb") as f:
        data = f.read(3)
        has_bom = (data == b'\xef\xbb\xbf')
        print(f"{fn}: has_bom = {has_bom}")
