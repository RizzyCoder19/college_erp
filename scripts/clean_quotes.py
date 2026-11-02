with open("src/components/auth/AnimatedLampLogin.tsx", "r", encoding="utf-8") as f:
    c = f.read()
c = c.replace('\\"', '"')
with open("src/components/auth/AnimatedLampLogin.tsx", "w", encoding="utf-8") as f:
    f.write(c)
print("Cleaned quotes in AnimatedLampLogin.tsx")
