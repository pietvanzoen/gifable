import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  isRouteErrorResponse,
  Link,
  Outlet,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";

import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";

export async function action({ params, request }: ActionArgs) {
  const form = await request.formData();
  if (form.get("intent") !== "delete") {
    throw new Response(`The intent ${form.get("intent")} is not supported`, {
      status: 400,
    });
  }

  const userId = await requireUserId(request);
  const media = await db.media.findUnique({
    where: { id: params.mediaId },
  });
  if (!media) {
    throw new Response("Can't delete what does not exist", {
      status: 404,
    });
  }
  if (media.userId !== userId) {
    throw new Response("Pssh, nice try. That's not your media", {
      status: 403,
    });
  }
  await db.media.delete({ where: { id: params.mediaId } });
  return redirect("/");
}

export async function loader({ request, params }: LoaderArgs) {
  const userId = await requireUserId(request);
  const media = await db.media.findUnique({
    where: { id: params.mediaId },
    include: {
      user: {
        select: {
          username: true,
        },
      },
    },
  });
  if (!media) {
    console.log("Media not found", params.mediaId);
    throw new Response("What a media! Not found.", {
      status: 404,
    });
  }
  return json({ userId, media });
}

export default function MediaRoute() {
  const { userId, media } = useLoaderData<typeof loader>();
  const isMine = media.userId === userId;

  const {
    url = "",
    comment = "",
    altText = "",
    size,
    createdAt,
    width,
    height,
    color,
  } = media;
  const title = url.split("/").pop();

  return (
    <div>
      <h2>
        <center>{title}</center>
      </h2>
      <figure>
        <center>
          <img
            src={url}
            alt={comment || ""}
            width={width || 300}
            height={height || 200}
            style={{ backgroundColor: color || "#ccc" }}
          />
        </center>
      </figure>

      <Outlet />

      <center>
        <fieldset>
          <legend>
            <strong>Copy to clipboard</strong>
          </legend>
          <button
            type="button"
            aria-label="Copy URL to clipboard"
            onClick={() => copyToClipboard(url)}
          >
            🔗 URL
          </button>
          &nbsp;
          <button
            type="button"
            aria-label="Copy alt text to clipboard"
            onClick={() => copyToClipboard(altText || "")}
          >
            💬 Alt text
          </button>
          &nbsp;
          <button
            type="button"
            aria-label="Copy Markdown to clipboard"
            onClick={() => copyToClipboard(`![${altText}](${url})`)}
          >
            📝 Markdown
          </button>
        </fieldset>
      </center>

      <table style={{ width: "100%" }} role="grid" aria-labelledby="meta-title">
        <caption id="meta-title">
          <h3>Info</h3>
        </caption>
        <tbody role="presentation">
          <tr role="presentation">
            <th tabIndex={0}>URL</th>
            <td tabIndex={-1}>
              <a href={url}>{url}</a>
            </td>
          </tr>
          <tr role="presentation">
            <th tabIndex={-1}>Comment</th>
            <td tabIndex={-1}>{comment}</td>
          </tr>
          <tr role="presentation">
            <th tabIndex={-1}>Alt text</th>
            <td tabIndex={-1}>{altText}</td>
          </tr>
          <tr role="presentation">
            <th tabIndex={-1}>Size</th>
            <td tabIndex={-1}>
              {width} ⅹ {height} • {bytesToSize(size)}
            </td>
          </tr>
          <tr role="presentation">
            <th tabIndex={-1}>Added</th>
            <td tabIndex={-1}>
              <time dateTime={createdAt}>
                {new Date(createdAt).toLocaleString("GB-en", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              </time>
            </td>
          </tr>
          {isMine ? null : (
            <tr role="presentation">
              <th tabIndex={-1}>User</th>
              <td tabIndex={-1}>{media.user.username}</td>
            </tr>
          )}
        </tbody>
      </table>

      {isMine ? (
        <center>
          <Link to={`/media/${media.id}/edit`} className="button">
            ✏️ Edit info
          </Link>{" "}
          &nbsp;
          <form method="post" style={{ display: "inline-block" }}>
            <button name="intent" type="submit" value="delete">
              🗑️ Delete
            </button>
          </form>
        </center>
      ) : null}
    </div>
  );
}

export function ErrorBoundary() {
  let error = useRouteError();
  if (isRouteErrorResponse(error)) {
    switch (error.status) {
      case 400: {
        return (
          <div className="notice">What you're trying to do is not allowed.</div>
        );
      }
      case 404: {
        return (
          <div className="notice">
            <h1>Media not found</h1>
          </div>
        );
      }
      case 403: {
        return <div className="notice">Sorry, but this is not your media.</div>;
      }
      default: {
        throw new Error(`Unhandled error: ${error.status}`);
      }
    }
  } else if (error instanceof Error) {
    return (
      <div className="notice">
        <h1>Error</h1>
        <p>{error.message}</p>
        <p>The stack trace is:</p>
        <pre>{error.stack}</pre>
      </div>
    );
  } else {
    return <h1>Unknown Error</h1>;
  }
}

function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text);
  } else {
    console.error(`navigator.clipboard.writeText is not supported.`, {
      text,
    });
  }
}

function bytesToSize(bytes?: number | null | undefined) {
  if (!bytes) return "";
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 Byte";
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
  return Math.round(bytes / Math.pow(1024, i)) + " " + sizes[i];
}
