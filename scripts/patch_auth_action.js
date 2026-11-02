const fs = require('fs');

let content = fs.readFileSync('src/lib/actions/auth.ts', 'utf8');

const target = `    // Establish session (stores SHA-256 hash at rest, returns raw token)
    const { token } = await createSession(user.id);

    // Update last login timestamp
    await prisma.userAccount.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });`;

const replacement = `    // Capture if this is the account's first login before updating timestamp
    const isFirstLogin = user.lastLoginAt === null;

    // Establish session (stores SHA-256 hash at rest, returns raw token)
    const { token } = await createSession(user.id);

    // Update last login timestamp
    await prisma.userAccount.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });`;

content = content.replace(target, replacement);

content = content.replace(
  `departmentName: user.staff?.department?.name || null,\n    };`,
  `departmentName: user.staff?.department?.name || null,\n      isFirstLogin,\n    };`
);

fs.writeFileSync('src/lib/actions/auth.ts', content, 'utf8');
console.log('Updated auth.ts with isFirstLogin');
