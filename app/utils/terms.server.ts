import type { Media, PrismaClient } from "@prisma/client";

export function getCommonCommentTerms(
  media: Pick<Media, "comment">[],
  limit: number
) {
  const terms = {} as Record<string, number>;
  media.forEach((m) => {
    m.comment?.split(",").forEach((c) => {
      const term = c.trim().toLowerCase();
      terms[term] = (terms[term] || 0) + 1;
    });
  });

  return Object.entries(terms)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export async function getMediaTerms(
  db: PrismaClient,
  limit: number = 5,
  userId?: string
) {
  const where = userId ? { userId } : {};
  const media = await db.media.findMany({
    where: {
      ...where,
      OR: [{ comment: { not: null } }, { comment: { not: "" } }],
    },
    select: {
      comment: true,
    },
  });

  return getCommonCommentTerms(media, limit);
}
