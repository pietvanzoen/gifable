import type { Media } from "@prisma/client";
import { useEffect, useState } from "react";
import type { MediaItemProps } from "./MediaItem";
import MediaItem from "./MediaItem";

import styles from "~/styles/search.css";
import { Link } from "react-router-dom";
import { useSearchParams } from "@remix-run/react";
import { useHydrated } from "remix-utils";

export function links() {
  return [{ rel: "stylesheet", href: styles }];
}

export default function MediaList({
  media,
  mediaCount,
  page,
  pageSize,
  showUser = false,
}: {
  media: MediaItemProps["media"][];
  mediaCount?: number;
  page: number;
  pageSize: number;
  showUser: boolean;
}) {
  const [playingId, setPlayingId] = useState<Media["id"]>("");
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout>();
  const [search] = useSearchParams();
  const isHydrated = useHydrated();
  const currentPage = page;
  const previousPage = currentPage - 1;
  search.set("page", (currentPage + 1).toString());

  const showLoadMore = mediaCount && media.length < mediaCount;

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
    <>
      {media.length === 0 ? <p>No results.</p> : null}
      <div className="results" role="feed">
        {media.map((data, i) => (
          <MediaItem
            id={i === previousPage * pageSize ? "load-more" : undefined}
            key={data.id}
            media={data}
            showUser={showUser}
            isPlaying={playingId === data.id}
            setPlayingId={setPlayingId}
            aria-setsize={mediaCount}
          />
        ))}
      </div>
      {showLoadMore && (
        <center>
          <br />
          <Link
            role="button"
            to={`/?${search}${isHydrated ? "" : "#load-more"}`}
            preventScrollReset={true}
          >
            🎉 Load more
          </Link>
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
