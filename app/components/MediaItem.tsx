import type { Media, User } from "@prisma/client";
import { Link } from "@remix-run/react";
import { useHydrated } from "remix-utils";

export type MediaItemProps = {
  media: Pick<
    Media,
    "id" | "url" | "thumbnailUrl" | "width" | "height" | "color" | "altText"
  > & { user: Pick<User, "username"> };
  isPlaying: boolean;
  id?: string;
  setPlayingId: (id: Media["id"]) => void;
  showUser?: boolean;
};

export default function MediaItem(props: MediaItemProps) {
  const isHydrated = useHydrated();
  const { id, url, thumbnailUrl, width, height, color, altText } = props.media;
  const { showUser, isPlaying, setPlayingId } = props;
  return (
    <figure id={props.id} className="media">
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
        {thumbnailUrl && isHydrated ? (
          <button
            className="play"
            onClick={() => setPlayingId(id)}
            dangerouslySetInnerHTML={{
              __html: isPlaying ? "&#x23F8;" : "&#x23F5;",
            }}
          />
        ) : null}
      </div>
      <figcaption>
        {url.split("/").pop()}
        {showUser ? ` by ${props.media.user.username}` : null}
      </figcaption>
    </figure>
  );
}
