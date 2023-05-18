import { Prisma } from "@prisma/client";
import type { LoaderArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";

export async function loader({ request }: LoaderArgs) {
  await requireUserId(request);

  const query = Prisma.sql`SELECT id FROM "Media" ORDER BY RANDOM() LIMIT 1;`;
  const [randomMedia] = (await db.$queryRaw(query)) as [{ id: number }];

  if (!randomMedia) {
    return redirect("/media/new");
  }

  return redirect(`/media/${randomMedia.id}?random=true`);
}
