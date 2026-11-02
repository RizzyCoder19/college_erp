import json
import sqlite3
import hashlib
import base64

with open("dev-admin-credentials.json", "r", encoding="utf-8") as f:
    creds = json.load(f)

email = creds["email"]
password = creds["password"]

# Verify scrypt hash with sqlite record
import crypto_verify
