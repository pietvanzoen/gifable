import type { Media, User } from "@prisma/client";
import { Link } from "@remix-run/react";
import { useHydrated } from "remix-utils";
import { getTitle } from "~/utils/media";

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
  const { showUser, isPlaying, setPlayingId, media, ...restProps } = props;
  const { id, url, thumbnailUrl, width, height, color, altText } = media;
  const title = getTitle(url);
  return (
    <figure id={props.id} className="media" {...restProps}>
      <div className="img-wrapper">
        <Link prefetch="intent" to={`/media/${id}`} aria-label={`View media`}>
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
            tabIndex={-1}
            onClick={() => setPlayingId(id)}
            dangerouslySetInnerHTML={{
              __html: isPlaying ? "&#x23F8;&#xFE0E;" : "&#x23F5;&#xFE0E;",
            }}
          />
        ) : null}
      </div>
      <figcaption>
        {title}
        {showUser ? ` by ${props.media.user.username}` : null}
      </figcaption>
    </figure>
  );
}
