import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import type { Prisma } from "@prisma/client";
import { useLoaderData, useSearchParams } from "@remix-run/react";

import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";

import styles from "~/styles/search.css";
import MediaList from "~/components/MediaList";
import { getCommonCommentTerms, getMediaTerms } from "~/utils/media.server";

type SelectOptions = "all" | "mine" | "not-mine";

export function links() {
  return [{ rel: "stylesheet", href: styles }];
}

export async function loader({ request }: LoaderArgs) {
  const userId = await requireUserId(request);
  const params = new URLSearchParams(request.url.split("?")[1]);

  const where: Prisma.MediaWhereInput = {};
  const search = (params.get("search") || "").trim();
  const select = (params.get("select") || "mine").trim();

  if (search) {
    where.comment = { contains: search };
  }
  if (select === "mine") {
    where.userId = userId;
  }
  if (select === "not-mine") {
    where.userId = { not: userId };
  }

  const [media, terms] = await Promise.all([
    db.media.findMany({
      where,
      select: {
        id: true,
        url: true,
        thumbnailUrl: true,
        comment: true,
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
    getMediaTerms(8, select === "mine" ? userId : undefined),
  ]);

  return json({
    userId,
    media,
    terms,
  });
}

export default function MediaRoute() {
  const data = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams({
    search: "",
    select: "mine",
  });

  const select = searchParams.get("select") as SelectOptions;

  return (
    <div>
      <header>
        <center>
          <form method="get" action="/">
            <input
              type="search"
              name="search"
              placeholder="Search"
              defaultValue={searchParams.get("search") || ""}
            />
            &nbsp;
            <select name="select" defaultValue={select}>
              <option value="mine">My media</option>
              <option value="all">All media</option>
              <option value="not-mine">Not mine</option>
            </select>
            &nbsp;
            <button type="submit">Search</button>
          </form>
        </center>
        <center>
          <small>
            <strong>Quick search: </strong>
            {data.terms.map(([term], i) => (
              <span key={term}>
                {i > 0 && ", "}
                <a href={`/?search=${term}`}>{term}</a>
              </span>
            ))}
          </small>
        </center>
        <br />
      </header>

      <MediaList media={data.media} showUser={select !== "mine"} />
    </div>
  );
}

export function ErrorBoundary() {
  return <div className="notice">I did a whoopsies.</div>;
}
