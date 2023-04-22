import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import type { Prisma } from "@prisma/client";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";

import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";

import styles from "~/styles/search.css";

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
        {data.media.map(
          ({ id, url, width, height, comment, color, altText }) => (
            <figure key={id}>
              <Link prefetch="intent" to={`/media/${id}`}>
                <img
                  loading="lazy"
                  src={url}
                  alt={altText || ""}
                  width={width || 300}
                  height={height || 200}
                  style={{ backgroundColor: color || "#0e0e0e" }}
                />
              </Link>
              <figcaption>{url.split("/").pop()}</figcaption>
            </figure>
          )
        )}
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return <div className="notice">I did a whoopsies.</div>;
}
