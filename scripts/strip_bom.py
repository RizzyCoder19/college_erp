with open("src/app/login/page.tsx", "rb") as f:
    data = f.read()
if data.startswith(b'\xef\xbb\xbf'):
    data = data[3:]
    with open("src/app/login/page.tsx", "wb") as f:
        f.write(data)
    print("Stripped BOM from src/app/login/page.tsx")
