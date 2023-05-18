import type { LoaderArgs, V2_MetaArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import type { Prisma } from "@prisma/client";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";

import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";

import styles from "~/styles/search.css";
import MediaList from "~/components/MediaList";
import { getMediaLabels } from "~/utils/media.server";
import { useEffect, useState } from "react";
import { useHydrated } from "remix-utils";
import { makeTitle } from "~/utils/meta";
import { withZod } from "@remix-validated-form/with-zod";
import { z } from "zod";
import { ValidatedForm } from "remix-validated-form";

const PAGE_SIZE = 25;

type SelectOptions = "" | "all" | "not-mine";

const searchValidator = withZod(
  z.object({
    search: z.string().optional(),
  })
);

export function links() {
  return [{ rel: "stylesheet", href: styles }];
}

export function meta({ location }: V2_MetaArgs<typeof loader>) {
  let title = "Search";
  let selectTitle = "";
  const params = new URLSearchParams(location.search);
  const search = params.get("search");
  const select = params.get("select");

  if (search) {
    title = `Search results for '${search}'`;
  }

  if (select === "not-mine") {
    selectTitle = "not mine";
  }
  if (select === "all") {
    selectTitle = "all";
  }

  return [
    { title: makeTitle([title, selectTitle].filter(Boolean)) },
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
  const select = (params.get("select") || "").trim();

  const where: Prisma.MediaWhereInput = {};
  if (search) {
    where.labels = { contains: search };
  }
  if (select === "") {
    where.userId = userId;
  }
  if (select === "not-mine") {
    where.userId = { not: userId };
  }

  const [user, mediaCount, totalMediaCount, media, labels] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { preferredLabels: true },
    }),
    db.media.count({ where }),
    select === "" ? db.media.count({ where: { userId } }) : null,
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
      userId:
        select === ""
          ? userId
          : select === "not-mine"
          ? { not: userId }
          : undefined,
    }),
  ]);

  return json({
    user,
    mediaCount,
    totalMediaCount,
    media,
    labels,
  });
}

export default function MediaRoute() {
  const { media, mediaCount, totalMediaCount, user, labels } =
    useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams({
    search: "",
    select: "",
  });

  const search = searchParams.get("search") || "";
  const select = searchParams.get("select") as SelectOptions;
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [searchValue, setSearchValue] = useState(search);

  const emptyUserCollection = select === "" && totalMediaCount === 0;

  useEffect(() => {
    setSearchValue(search);
  }, [search]);

  return (
    <>
      <header>
        <center>
          <ValidatedForm
            id="search-form"
            action="/"
            method="get"
            validator={searchValidator}
          >
            <input
              type="search"
              name="search"
              aria-label="Search media"
              placeholder="Search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              style={{ marginRight: "0.2em" }}
            />
            <div className="button-group">
              <Link
                role="button"
                className={select === "" ? "active" : ""}
                to={`/?search=${search}`}
              >
                Mine
              </Link>
              <Link
                role="button"
                className={select === "not-mine" ? "active" : ""}
                to={`/?search=${search}&select=not-mine`}
              >
                Not Mine
              </Link>
              <Link
                role="button"
                className={select === "all" ? "active" : ""}
                to={`/?search=${search}&select=all`}
              >
                All
              </Link>
            </div>
            &nbsp;
            <input type="hidden" name="select" value={select} tabIndex={-1} />
            <button type="submit" aira-label="Submit search">
              🔎 Search
            </button>
          </ValidatedForm>
        </center>

        <QuickSearch
          labels={labels || []}
          preferredLabels={user?.preferredLabels || ""}
          currentSearch={search}
          currentSelect={select}
        />
        <br />
      </header>

      <MediaList
        media={media}
        showUser={select !== ""}
        mediaCount={mediaCount}
        pageSize={PAGE_SIZE}
        page={page}
      />

      {emptyUserCollection && (
        <div className="notice">
          <h3>Hi! Looks like you're new here 👋</h3>
          <p>
            <strong>Welcome!</strong> Would you like to...
          </p>
          <Link role="button" to="/media/new" style={{ lineBreak: "normal" }}>
            🚀 Add a file
          </Link>
          <p>or</p>
          <Link role="button" to="/?select=all">
            💡 Find some inspiration
          </Link>
        </div>
      )}
    </>
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

  const maxCount = sortedLabels[0]?.[1] || 0;

  return (
    <center role="group" aria-labelledby="quick-search-header">
      <small>
        {labelsList.length ? (
          <>
            <strong id="quick-search-header">Search for label:</strong>&nbsp;
          </>
        ) : null}
        {labelsList.map(([label, count], i) => (
          <span key={`${label}-${count}`}>
            {i > 0 && ", "}
            <Link
              className={currentSearch === label ? "active" : ""}
              onClick={() => setShowAllLabels(false)}
              to={`/?search=${label}&select=${currentSelect}`}
              style={
                showAllLabels
                  ? { fontSize: getFontSize(count as number, maxCount) }
                  : undefined
              }
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
              <strong>{showAllLabels ? "show less" : "show more"}</strong>
            </button>
          </>
        )}
      </small>
    </center>
  );
}

function getFontSize(count: number, max: number) {
  const minSize = 1;
  const maxSize = 1.8;
  const size = minSize + (maxSize - minSize) * (count / max);
  return `${size}em`;
}

export function ErrorBoundary() {
  return <div className="notice">I did a whoopsies.</div>;
}
