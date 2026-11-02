import json
with open("dev-admin-credentials.json", "r", encoding="utf-8") as f:
    d = json.load(f)
print("Keys:", list(d.keys()))
print("Email:", d.get("email"))
print("Has password:", bool(d.get("password")))
print("Password length:", len(d.get("password", "")))
