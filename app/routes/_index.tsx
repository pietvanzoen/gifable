import type { LoaderArgs, V2_MetaArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import type { Prisma } from "@prisma/client";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";

import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";

import styles from "~/styles/search.css";
import MediaList from "~/components/MediaList";
import { getMediaLabels } from "~/utils/media.server";
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
    where.labels = { contains: search };
  }
  if (select === "mine") {
    where.userId = userId;
  }
  if (select === "not-mine") {
    where.userId = { not: userId };
  }

  const [user, mediaCount, media, labels] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { preferredLabels: true },
    }),
    db.media.count({ where }),
    db.media.findMany({
      take: page * PAGE_SIZE,
      where,
      select: {
        id: true,
        url: true,
        thumbnailUrl: true,
        labels: true,
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
    getMediaLabels({
      limit: 100,
      userId: select === "mine" ? userId : undefined,
    }),
  ]);

  return json({
    user,
    mediaCount,
    media,
    labels,
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
              list="search-labels"
              style={{ marginRight: "0.2em" }}
            />
            <datalist id="search-labels">
              {data.labels.map(([label]) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </datalist>
            <select
              aria-label="Filter media by owner"
              name="select"
              defaultValue={select}
              style={{ marginRight: "0.2em" }}
            >
              <option value="mine">My media</option>
              <option value="all">All media</option>
              <option value="not-mine">Not mine</option>
            </select>
            <Link
              role="button"
              to="/"
              aria-label="Reset search"
              style={{ marginRight: "0.2em" }}
            >
              Reset
            </Link>
            <button type="submit">Search</button>
          </form>
        </center>
        <QuickSearch
          labels={data.labels}
          preferredLabels={data.user?.preferredLabels || ""}
          currentSearch={search}
          currentSelect={select}
        />
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
  labels,
  currentSearch,
  preferredLabels = "",
  currentSelect,
}: {
  labels: [string, number][];
  preferredLabels?: string;
  currentSearch: string;
  currentSelect: SelectOptions;
}) {
  const limit = 6;
  const isHydrated = useHydrated();
  const [showAllLabels, setShowAllLabels] = useState(false);

  const preferredLabelsList = preferredLabels
    .split(",")
    .filter(Boolean)
    .map((s) => [s.trim(), 0]);

  const sortedLabels = [...labels].sort((a, b) => b[1] - a[1]);

  const labelsList = showAllLabels
    ? labels
    : preferredLabelsList.concat([...sortedLabels]).slice(0, limit);

  return (
    <center role="group" aria-labelledby="quick-search-header">
      <small>
        <strong id="quick-search-header">Search for label:</strong>&nbsp;
        {labelsList.map(([label, count], i) => (
          <span key={label}>
            {i > 0 && ", "}
            <Link
              className={currentSearch === label ? "active" : ""}
              to={`/?search=${label}&select=${currentSelect}`}
            >
              {label}
            </Link>
            {showAllLabels ? <small> ({count})</small> : null}
          </span>
        ))}
        {labels.length > limit && isHydrated && (
          <>
            &nbsp;&nbsp;
            <button
              className="link"
              onClick={() => setShowAllLabels((s) => !s)}
            >
              {showAllLabels ? "show less" : "show more"}
            </button>
          </>
        )}
      </small>
    </center>
  );
}

export function ErrorBoundary() {
  return <div className="notice">I did a whoopsies.</div>;
}
