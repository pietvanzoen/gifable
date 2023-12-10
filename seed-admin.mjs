//@ts-check
import { PrismaClient } from "@prisma/client";
import bycrypt from "bcryptjs";

const db = new PrismaClient();

const log = (/** @type {string} */ message) =>
  console.log(`ADMIN SEED: ${message}`);

async function main() {
  const { ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;

  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    return;
  }

  const admin = await db.user.findUnique({
    where: {
      username: ADMIN_USERNAME,
    },
  });

  if (admin) {
    log(`Admin user '${ADMIN_USERNAME}' already exists`);
    return;
  }

  log(`Seeding admin user '${ADMIN_USERNAME}'`);

  await db.user.create({
    data: {
      username: ADMIN_USERNAME,
      passwordHash: await bycrypt.hash(ADMIN_PASSWORD, 10),
      isAdmin: true,
    },
  });

  log(`Admin user '${ADMIN_USERNAME}' created`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
