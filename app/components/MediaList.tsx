import type { Media, Prisma } from "@prisma/client";
import { useEffect, useState } from "react";
import type { MediaItemProps } from "./MediaItem";
import MediaItem from "./MediaItem";

import { Link } from "react-router-dom";
import { useNavigation, useSearchParams } from "@remix-run/react";
import { promiseHash, useHydrated } from "remix-utils";
import { db } from "~/utils/db.server";
import styles from "~/styles/search.css";

const PAGE_SIZE = 42;

export const MEDIA_LIST_LINKS = [{ rel: "stylesheet", href: styles }];

export async function loadMedia({
  where,
  page = 1,
}: {
  where: Prisma.MediaWhereInput;
  page: number;
}) {
  return promiseHash({
    count: db.media.count({ where }),
    media: db.media.findMany({
      take: page * PAGE_SIZE,
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
    }),
  });
}

export default function MediaList({
  media,
  mediaCount,
  page,
  showUser = false,
}: {
  media: MediaItemProps["media"][];
  mediaCount?: number;
  page: number;
  showUser: boolean;
}) {
  const [playingId, setPlayingId] = useState<Media["id"]>("");
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout>();
  const [params] = useSearchParams();
  const currentPage = page;
  const previousPage = currentPage - 1;
  params.set("page", (currentPage + 1).toString());

  const currentSearch = params.get("search") || "";

  const showLoadMore = Boolean(mediaCount && media.length < mediaCount);

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

  if (media.length === 0)
    return (
      <center>
        <p>No results{currentSearch ? <> for '{currentSearch}'</> : null} ☹️</p>
      </center>
    );

  return (
    <>
      <div className="results" role="feed">
        {media.map((data, i) => (
          <MediaItem
            id={i === previousPage * PAGE_SIZE - 3 ? "load-more" : undefined}
            key={data.id}
            media={data}
            showUser={showUser}
            isPlaying={playingId === data.id}
            setPlayingId={setPlayingId}
            aria-setsize={mediaCount}
          />
        ))}
      </div>
      <center>
        <p>
          <small>
            Viewing {media.length} of {mediaCount} results.
          </small>
        </p>
      </center>
      {showLoadMore && (
        <center>
          <br />
          <LoadMoreButton params={params} />
        </center>
      )}
      <center>
        <small>
          <br />
          <a href="#top">Back to top</a>
        </small>
      </center>
    </>
  );
}

function LoadMoreButton({ params }: { params: URLSearchParams }) {
  const isHydrated = useHydrated();
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";

  return (
    <Link
      className="button"
      to={`?${params}${isHydrated ? "" : "#load-more"}`}
      preventScrollReset={true}
      replace={true}
      aria-disabled={isLoading}
    >
      🎉 {isLoading ? "Loading..." : "Load more"}
    </Link>
  );
}
