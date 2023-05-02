import type { Media, PrismaClient } from "@prisma/client";

type TermsOptions = {
  limit?: number;
  filter?: (term: [string, number]) => boolean;
  randomize?: boolean;
};

export function getCommonCommentTerms(
  media: Pick<Media, "comment">[],
  { limit = 5, filter = () => true, randomize = false }: TermsOptions
) {
  const terms = media.reduce((terms, m) => {
    m.comment?.split(",").forEach((c) => {
      const term = c.trim().toLowerCase();
      terms[term] = (terms[term] || 0) + 1;
    });
    return terms;
  }, {} as Record<string, number>);

  return Object.entries(terms)
    .filter(([term, count]) => count > 1 && filter([term, count]))
    .sort((a, b) => {
      if (randomize) {
        return Math.random() - 0.5;
      }
      return b[1] - a[1];
    })
    .slice(0, limit);
}

export async function getMediaTerms(
  db: PrismaClient,
  options?: TermsOptions & { userId?: string }
) {
  const { userId, ...termsOptions } = options || {};
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

  return getCommonCommentTerms(media, termsOptions);
}
