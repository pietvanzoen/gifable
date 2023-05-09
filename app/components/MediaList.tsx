import type { Media } from "@prisma/client";
import { useEffect, useState } from "react";
import type { MediaItemProps } from "./MediaItem";
import MediaItem from "./MediaItem";

import styles from "~/styles/search.css";
import { Link, useSearchParams, useNavigate } from "@remix-run/react";
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
  const isHydrated = useHydrated();
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
        <>
          <br />
          {isHydrated ? (
            <AutoLoadMore params={params} />
          ) : (
            <LoadMoreButton params={params} />
          )}
        </>
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
  return (
    <center>
      <Link
        role="button"
        to={`/?${params}#load-more`}
        preventScrollReset={true}
        replace={true}
      >
        🎉 Load more
      </Link>
    </center>
  );
}

function AutoLoadMore({ params }: { params: URLSearchParams }) {
  const navigate = useNavigate();
  const TIMEOUT_SECONDS = 5;
  const [autoLoadEnabled, setAutoLoadEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const { observe } = useInView<HTMLProgressElement>({
    onEnter: ({ unobserve }) => {
      unobserve();
      setIsLoading(true);
    },
  });

  useEffect(() => {
    if (!isLoading) return;
    const timeout = setTimeout(() => {
      if (!autoLoadEnabled) return;
      navigate(`/?${params}`, { replace: true, preventScrollReset: true });
      setIsLoading(false);
      observe();
    }, TIMEOUT_SECONDS * 1000);

    return () => clearTimeout(timeout);
  }, [autoLoadEnabled, isLoading]);

  return (
    <div ref={observe}>
      <label>Auto loading more media...</label>
      <button onClick={() => setAutoLoadEnabled(false)}>
        Cancel auto loading
      </button>
      {isLoading && (
        <progress
          className="auto-load-progress"
          value="100"
          max="100"
        ></progress>
      )}
    </div>
  );
}
