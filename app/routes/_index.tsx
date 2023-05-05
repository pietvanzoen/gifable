import type { LoaderArgs, V2_MetaArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import type { Prisma } from "@prisma/client";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";

import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";

import styles from "~/styles/search.css";
import MediaList from "~/components/MediaList";
import { getMediaTerms } from "~/utils/media.server";
import { useState } from "react";
import { useHydrated } from "remix-utils";
import { makeTitle } from "~/utils/meta";

const PAGE_SIZE = 25;

type SelectOptions = "all" | "mine" | "not-mine";

export function links() {
  return [{ rel: "stylesheet", href: styles }];
}

export function meta({ location }: V2_MetaArgs<typeof loader>) {
  let title = "Search";
  const params = new URLSearchParams(location.search);
  const search = params.get("search");

  if (search) {
    title = `Search results for '${search}'`;
  }

  return [
    { title: makeTitle([title]) },
    {
      name: "description",
      content: "Search for media",
    },
  ];
}

export async function loader({ request }: LoaderArgs) {
  const userId = await requireUserId(request);
  const params = new URLSearchParams(request.url.split("?")[1]);

  const page = parseInt((params.get("page") || "1").trim(), 10);
  const search = (params.get("search") || "").trim();
  const select = (params.get("select") || "mine").trim();

  const where: Prisma.MediaWhereInput = {};
  if (search) {
    where.comment = { contains: search };
  }
  if (select === "mine") {
    where.userId = userId;
  }
  if (select === "not-mine") {
    where.userId = { not: userId };
  }

  const [mediaCount, media, terms] = await Promise.all([
    db.media.count({ where }),
    db.media.findMany({
      take: page * PAGE_SIZE,
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
    getMediaTerms({
      limit: 40,
      userId: select === "mine" ? userId : undefined,
    }),
  ]);

  return json({
    mediaCount,
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
  const page = parseInt(searchParams.get("page") || "1", 10);

  return (
    <div>
      <header>
        <center>
          <form method="get" action="/">
            <input
              type="search"
              name="search"
              aria-label="Search media"
              placeholder="Search"
              defaultValue={search}
              list="search-terms"
            />
            <datalist id="search-terms">
              {data.terms.map(([term]) => (
                <option key={term} value={term}>
                  {term}
                </option>
              ))}
            </datalist>
            &nbsp;
            <select
              aria-label="Filter media by owner"
              name="select"
              defaultValue={select}
            >
              <option value="mine">My media</option>
              <option value="all">All media</option>
              <option value="not-mine">Not mine</option>
            </select>
            &nbsp;
            <Link role="button" to="/" aria-label="Reset search">
              Reset
            </Link>
            &nbsp;
            <button type="submit">Search</button>
          </form>
        </center>
        <QuickSearch terms={data.terms} currentSearch={search} />
        <br />
      </header>

      <MediaList
        media={data.media}
        showUser={select !== "mine"}
        mediaCount={data.mediaCount}
        pageSize={PAGE_SIZE}
        page={page}
      />
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
      <fieldset>
        <legend>
          <small>Quick search for term</small>
        </legend>
        <small>
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
              <button
                className="link"
                onClick={() => setShowAllTerms((s) => !s)}
              >
                {showAllTerms ? "show less" : "show more"}
              </button>
            </span>
          )}
        </small>
      </fieldset>
    </center>
  );
}

export function ErrorBoundary() {
  return <div className="notice">I did a whoopsies.</div>;
}
