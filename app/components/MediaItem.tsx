import type { Media, User } from "@prisma/client";
import { Link } from "@remix-run/react";
import { useHydrated } from "remix-utils";
import { getTitle } from "~/utils/media";

export type MediaItemProps = {
  media: Pick<
    Media,
    | "id"
    | "url"
    | "thumbnailUrl"
    | "width"
    | "height"
    | "color"
    | "altText"
    | "fileHash"
  > & { user: Pick<User, "username"> };
  isPlaying: boolean;
  id?: string;
  setPlayingId: (id: Media["id"]) => void;
  showUser?: boolean;
};

export default function MediaItem(props: MediaItemProps) {
  const isHydrated = useHydrated();
  const { showUser, isPlaying, setPlayingId, media, ...restProps } = props;
  const { id, url, thumbnailUrl, width, height, color, altText, fileHash } =
    media;
  const { username } = media.user;
  const title = getTitle(url);
  const thumb = `${thumbnailUrl}?hash=${fileHash}`;
  const image = `${url}?hash=${fileHash}`;
  return (
    <figure id={props.id} className="media" {...restProps}>
      <div className="img-wrapper">
        <Link prefetch="intent" to={`/media/${id}`} aria-label={`View media`}>
          <img
            loading="lazy"
            src={isPlaying || !thumbnailUrl ? image : thumb}
            alt={altText || ""}
            width={width || 300}
            height={height || 200}
            style={{ backgroundColor: color || "#0e0e0e" }}
          />
        </Link>
        {url.endsWith(".gif") && isHydrated ? (
          <button
            className="play"
            tabIndex={-1}
            onClick={() => setPlayingId(isPlaying ? "" : id)}
            dangerouslySetInnerHTML={{
              __html: isPlaying ? "&#x23F8;&#xFE0E;" : "&#x23F5;&#xFE0E;",
            }}
          />
        ) : null}
      </div>
      <figcaption>
        {title}
        {showUser && (
          <>
            &nbsp;by <Link to={`/users/${username}`}>{username}</Link>
          </>
        )}
      </figcaption>
    </figure>
  );
}
