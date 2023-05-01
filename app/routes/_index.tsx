import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import type { Prisma } from "@prisma/client";
import {
  Link,
  NavLink,
  useLoaderData,
  useSearchParams,
} from "@remix-run/react";

import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";

import styles from "~/styles/search.css";
import MediaList from "~/components/MediaList";
import { getMediaTerms } from "~/utils/media.server";
import { useState } from "react";
import { useHydrated } from "remix-utils";

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
    getMediaTerms(25, select === "mine" ? userId : undefined),
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

  const search = searchParams.get("search") || "";
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
              defaultValue={search}
            />
            &nbsp;
            <select name="select" defaultValue={select}>
              <option value="mine">My media</option>
              <option value="all">All media</option>
              <option value="not-mine">Not mine</option>
            </select>
            &nbsp;
            <button type="submit">Search</button>
            &nbsp;
            <Link role="button" to="/">
              Clear
            </Link>
          </form>
        </center>
        <QuickSearch terms={data.terms} currentSearch={search} />
        <br />
      </header>

      <MediaList media={data.media} showUser={select !== "mine"} />
    </div>
  );
}

function QuickSearch({
  terms,
  currentSearch,
}: {
  terms: [string, number][];
  currentSearch: string;
}) {
  const limit = 6;
  const isHydrated = useHydrated();
  const [showAllTerms, setShowAllTerms] = useState(false);
  const termsList = showAllTerms ? terms : terms.slice(0, limit);
  return (
    <center>
      <small>
        <strong>Quick search: </strong>
        {termsList.map(([term, count], i) => (
          <span key={term}>
            {i > 0 && ", "}
            <Link
              className={currentSearch === term ? "active" : ""}
              to={`/?search=${term}`}
            >
              {term}
            </Link>
            {showAllTerms ? <small> ({count})</small> : null}
          </span>
        ))}
        {terms.length > limit && isHydrated && (
          <span>
            ,&nbsp;
            <button className="link" onClick={() => setShowAllTerms((s) => !s)}>
              {showAllTerms ? "show less" : "show more"}
            </button>
          </span>
        )}
      </small>
    </center>
  );
}

export function ErrorBoundary() {
  return <div className="notice">I did a whoopsies.</div>;
}
