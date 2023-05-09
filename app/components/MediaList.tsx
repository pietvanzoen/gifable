import type { Media } from "@prisma/client";
import { useEffect, useState } from "react";
import type { MediaItemProps } from "./MediaItem";
import MediaItem from "./MediaItem";

import styles from "~/styles/search.css";
import { Link } from "react-router-dom";
import { useSearchParams } from "@remix-run/react";
import { useHydrated } from "remix-utils";
import { useInView } from "react-cool-inview";

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
            id={i === previousPage * pageSize - 3 ? "load-more" : undefined}
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
  let button: HTMLAnchorElement | null = null;
  const isHydrated = useHydrated();

  const { observe } = useInView<HTMLAnchorElement>({
    // For better UX, we can grow the root margin so the data will be loaded earlier
    rootMargin: "50px 0px",
    // When the last item comes to the viewport
    onEnter: ({ unobserve }) => {
      // Pause observe when loading data
      unobserve();
      // Load more data
      button?.click();
    },
  });

  return (
    <Link
      ref={(element) => {
        observe(element);
        button = element;
      }}
      role="button"
      to={`/?${params}${isHydrated ? "" : "#load-more"}`}
      preventScrollReset={true}
      replace={true}
    >
      🎉 Load more
    </Link>
  );
}
