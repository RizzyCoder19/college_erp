import { PrismaClient } from "@prisma/client";
import { createSession, verifySessionToken } from "../src/lib/auth/session";

const prisma = new PrismaClient();

async function run() {
  const admin = await prisma.userAccount.findFirst({ where: { role: "SYSTEM_ADMIN" } });
  console.log("Admin user:", admin?.email);
  if (!admin) return;

  const { token, session } = await createSession(admin.id);
  console.log("Created session:", session.id, "token length:", token.length);

  const verified = await verifySessionToken(token);
  console.log("Verified result:", verified);

  await prisma.session.delete({ where: { id: session.id } });
}

run().then(() => {
  prisma.$disconnect();
  process.exit(0);
}).catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
