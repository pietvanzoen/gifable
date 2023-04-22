import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import type { Media, Prisma } from "@prisma/client";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";

import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";

import styles from "~/styles/search.css";
import { useEffect, useState } from "react";

export function links() {
  return [{ rel: "stylesheet", href: styles }];
}

export async function loader({ request }: LoaderArgs) {
  const userId = await requireUserId(request);
  const params = new URLSearchParams(request.url.split("?")[1]);

  const where: Prisma.MediaWhereInput = { userId };
  const search = (params.get("search") || "").trim();
  if (search) {
    where.comment = { contains: search };
  }

  return json({
    media: await db.media.findMany({
      where,
      select: {
        id: true,
        url: true,
        thumbnailUrl: true,
        comment: true,
        width: true,
        height: true,
        color: true,
        altText: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  });
}

export default function MediaRoute() {
  const data = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const [playingId, setPlayingId] = useState<Media["id"]>("");
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout>();

  useEffect(() => {
    if (playingId) {
      clearInterval(intervalId);
      setIntervalId(
        setInterval(() => {
          setPlayingId("");
        }, 10_000)
      );
    } else {
      clearInterval(intervalId);
      setIntervalId(undefined);
    }
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingId]);

  return (
    <div>
      <header>
        <form method="get" action="/">
          <input
            type="search"
            name="search"
            placeholder="Search"
            defaultValue={searchParams.get("search") || ""}
          />
        </form>
      </header>

      {data.media.length === 0 ? <p>No results.</p> : null}

      <div className="results">
        {data.media.map((data) => (
          <MediaItem
            media={data}
            key={data.id}
            isPlaying={playingId === data.id}
            setPlayingId={setPlayingId}
          />
        ))}
      </div>
    </div>
  );
}

function MediaItem(props: {
  media: Pick<
    Media,
    "id" | "url" | "thumbnailUrl" | "width" | "height" | "color" | "altText"
  >;
  isPlaying: boolean;
  setPlayingId: (id: Media["id"]) => void;
}) {
  const { id, url, thumbnailUrl, width, height, color, altText } = props.media;
  const { isPlaying, setPlayingId } = props;
  return (
    <figure className="media">
      <div className="img-wrapper">
        <Link prefetch="intent" to={`/media/${id}`}>
          <img
            loading="lazy"
            src={isPlaying || !thumbnailUrl ? url : thumbnailUrl}
            alt={altText || ""}
            width={width || 300}
            height={height || 200}
            style={{ backgroundColor: color || "#0e0e0e" }}
          />
        </Link>
        {thumbnailUrl ? (
          <button
            className="play"
            onClick={() => setPlayingId(id)}
            dangerouslySetInnerHTML={{
              __html: isPlaying ? "&#x23F8;" : "&#x23F5;",
            }}
          />
        ) : null}
      </div>
      <figcaption>{url.split("/").pop()}</figcaption>
    </figure>
  );
}

export function ErrorBoundary() {
  return <div className="notice">I did a whoopsies.</div>;
}
