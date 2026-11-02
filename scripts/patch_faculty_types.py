with open(r"G:\rpihm-campusos\src\types\faculty.ts", "r", encoding="utf-8") as f:
    content = f.read()

target = """  avatarInitial?: string;
  isSampleRecord?: boolean;
}"""

replacement = """  avatarInitial?: string;
  isSampleRecord?: boolean;
  userAccountId?: string | null;
  hasUserAccount?: boolean;
  userAccountRole?: string | null;
  userAccountEmail?: string | null;
}"""

assert target in content, "target not found in faculty.ts"
content = content.replace(target, replacement, 1)

with open(r"G:\rpihm-campusos\src\types\faculty.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("faculty.ts updated successfully")
