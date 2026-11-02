import fs from "fs";

let content = fs.readFileSync("src/lib/auth/session.ts", "utf8");

content = content.replace(
  "  designation?: string | null;\n  departmentName?: string | null;\n}",
  "  designation?: string | null;\n  departmentName?: string | null;\n  isFirstLogin?: boolean;\n}"
);

content = content.replace(
  "      designation: staff?.designation || (session.user.role === \"SYSTEM_ADMIN\" ? \"System Administrator\" : null),\n      departmentName: staff?.department?.name || null,",
  "      designation: staff?.designation || (session.user.role === \"SYSTEM_ADMIN\" ? \"System Administrator\" : null),\n      departmentName: staff?.department?.name || null,\n      isFirstLogin: session.user.lastLoginAt === null,"
);

fs.writeFileSync("src/lib/auth/session.ts", content, "utf8");
console.log("Updated session.ts");
