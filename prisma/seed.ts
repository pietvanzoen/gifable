import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function seed() {
  const kody = await db.user.create({
    data: {
      username: "kody",
      // this is a hashed version of "twixrox"
      passwordHash:
        "$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1u",
    },
  });
  await Promise.all(
    getMedia().map((media) => {
      return db.media.create({ data: { ...media, userId: kody.id } });
    })
  );
}

seed();

function getMedia() {
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
