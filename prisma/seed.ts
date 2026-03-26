import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("Lacrosse4#", 12);

  await prisma.user.upsert({
    where: { email: "steed.clark1@gmail.com" },
    update: { password: hashedPassword, role: "admin", firstName: "Steed", lastName: "Clark" },
    create: {
      email: "steed.clark1@gmail.com",
      name: "Steed Clark",
      firstName: "Steed",
      lastName: "Clark",
      password: hashedPassword,
      mfaEnabled: true,
      role: "admin",
    },
  });

  console.log("Admin user seeded successfully");
}

main().catch(console.error).finally(() => prisma.$disconnect());
