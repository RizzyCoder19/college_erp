const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      },
      staff: true
    }
  });
  console.log("=== USERS & ROLES ===");
  for (const u of users) {
    console.log({
      id: u.id,
      email: u.email,
      name: u.name,
      roleName: u.role?.name,
      staffId: u.staffId,
      staffName: u.staff?.fullName,
      staffDesignation: u.staff?.designation,
      permissions: u.role?.permissions?.map(p => p.permission.name)
    });
  }

  console.log("\n=== ROLES IN DB ===");
  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: { permission: true }
      }
    }
  });
  for (const r of roles) {
    console.log(`Role: ${r.name} (${r.description || "no desc"})`);
    console.log(`  Permissions (${r.permissions.length}):`, r.permissions.map(p => p.permission.name).join(", "));
  }

  console.log("\n=== ALL PERMISSIONS IN DB ===");
  const permissions = await prisma.permission.findMany();
  console.log(permissions.map(p => p.name).join(", "));

  await prisma.$disconnect();
}

main().catch(console.error);
