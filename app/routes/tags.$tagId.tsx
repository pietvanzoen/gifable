import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { notFound } from "remix-utils";
import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";

import styles from "~/styles/search.css";
import MediaItem from "~/components/MediaItem";

export function links() {
  return [{ rel: "stylesheet", href: styles }];
}

export async function loader({ request, params }: LoaderArgs) {
  await requireUserId(request);
  const tag = await db.tag.findUnique({
    where: {
      id: params.tagId,
    },
  });
  if (!tag) {
    throw notFound({ message: "Tag not found" });
  }
  const media = await db.media.findMany({
    where: {
      tags: {
        some: {
          id: params.tagId,
        },
      },
    },
  });

  return json({ tag, media });
}

export default function TagRoute() {
  const { tag, media } = useLoaderData<typeof loader>();

  return (
    <>
      <h1>Tagged {tag.name}</h1>
      <div className="results">
        {media.map((media) => (
          <MediaItem key={media.id} media={media} showUser={true} />
        ))}
      </div>
    </>
  );
}
