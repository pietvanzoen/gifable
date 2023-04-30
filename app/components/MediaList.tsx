import type { Media } from "@prisma/client";
import { useEffect, useState } from "react";
import type { MediaItemProps } from "./MediaItem";
import MediaItem from "./MediaItem";

import styles from "~/styles/search.css";

export function links() {
  return [{ rel: "stylesheet", href: styles }];
}

export default function MediaList({
  media,
  showUser = false,
}: {
  media: MediaItemProps["media"][];
  showUser?: boolean;
}) {
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
    <>
      {media.length === 0 ? <p>No results.</p> : null}
      <div className="results">
        {media.map((data) => (
          <MediaItem
            key={data.id}
            media={data}
            showUser={showUser}
            isPlaying={playingId === data.id}
            setPlayingId={setPlayingId}
          />
        ))}
      </div>
    </>
  );
}
