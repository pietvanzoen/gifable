import type { LoaderArgs } from "@remix-run/node";
import type { Prisma } from "@prisma/client";

import { db } from "~/utils/db.server";

import { unauthorized } from "remix-utils";

export async function loader({ request }: LoaderArgs) {
  const auth = request.headers.get("Authorization");
  if (!auth) {
    return unauthorized({ message: "Unauthorized" });
  }

  const token = auth.replace("Bearer ", "");
  const [user] = await db.user.findMany({
    where: { apiToken: token },
    select: { id: true },
  });

  if (!user) {
    return unauthorized({ message: "Unauthorized" });
  }

  const params = new URLSearchParams(request.url.split("?")[1]);
  const where: Prisma.MediaWhereInput = { userId: user.id };
  const search = (params.get("search") || "").trim();

  if (search) {
    where.labels = { contains: search };
  }

  const data = await db.media.findMany({
    where,
    select: {
      id: true,
      url: true,
      thumbnailUrl: true,
      labels: true,
      width: true,
      height: true,
      color: true,
      altText: true,
      user: {
        select: {
          username: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
