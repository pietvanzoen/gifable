import { Link, useLocation } from "@remix-run/react";
import { useState } from "react";
import { useHydrated } from "remix-utils";

export default function QuickSearch({
  title = "Search for label:",
  labels,
  preferredLabels = "",
}: {
  title?: string;
  labels: [string, number][];
  preferredLabels?: string;
}) {
  const limit = 6;
  const isHydrated = useHydrated();
  const [showAllLabels, setShowAllLabels] = useState(false);
  const location = useLocation();

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
            <strong id="quick-search-header">{title}</strong>&nbsp;
          </>
        ) : null}
        <span id="quick-search-labels">
          {labelsList.map(([label, count], i) => {
            const params = new URLSearchParams(location.search);
            const isActive = params.get("search") === label;
            params.set("search", `${label}`);

            return (
              <span key={`${label}-${count}`}>
                {i > 0 && ", "}
                <Link
                  aria-current={isActive ? "page" : "false"}
                  onClick={() => setShowAllLabels(false)}
                  to={`?${params}`}
                  aria-label={`Search for media with label "${label}"`}
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
            );
          })}
        </span>
        {labels.length > limit && isHydrated && (
          <>
            &nbsp;&nbsp;
            <button
              className="link"
              aria-label="Toggle show more labels"
              aria-expanded={showAllLabels}
              aria-controls="quick-search-labels"
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
