import { PrismaClient } from "@prisma/client";
import { register } from "~/utils/session.server";
const db = new PrismaClient();

const SEED_JSON_URL = process.env.SEED_JSON_URL;

async function seed() {
  const username = process.env.SEED_USER || "test";
  const password = process.env.SEED_PASSWORD || "Trustno1";

  console.log(`Seeding database with user ${username}`);

  const user = await register({ username, password, isAdmin: true });
  const media = await getMedia();
  await Promise.all(
    media.map((media: any) => {
      return db.media.create({ data: { ...media, userId: user.id } });
    })
  );
}

seed();

async function getMedia() {
  if (SEED_JSON_URL) {
    console.log(`Fetching media from ${SEED_JSON_URL}`);
    const res = await fetch(SEED_JSON_URL);
    return res.json();
  }
  console.log(`Using default media`);
  return [
    {
      url: "https://xn--vi8h.piet.me/pedro-hug.gif",
      comment: `Pedro pascal, hug`,
    },
    {
      url: "https://xn--vi8h.piet.me/happydance.gif",
      comment: `Seinfeld, happy dance`,
    },
    {
      url: "https://xn--vi8h.piet.me/vibes.gif",
      comment: `Vibes, cat`,
    },
  ];
}
