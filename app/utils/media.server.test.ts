import { getCommonLabelsTerms } from "./media.server";

describe("getCommonLabelsTerms", () => {
  it("returns the most common terms", () => {
    const terms = getCommonLabelsTerms(
      [
        { labels: "b, c" },
        { labels: "a" },
        { labels: "a" },
        { labels: "a" },
        { labels: "a, b" },
        { labels: "a" },
        { labels: "a" },
        { labels: "a, b, c" },
      ],
      { limit: 2 }
    );

    expect(terms).toEqual([
      ["a", 7],
      ["b", 3],
    ]);
  });

  it("ignores terms with less than 2 occurrences", () => {
    const terms = getCommonLabelsTerms(
      [
        { labels: "b, c" },
        { labels: "a" },
        { labels: "a" },
        { labels: "a" },
        { labels: "a, b" },
        { labels: "a" },
        { labels: "a" },
        { labels: "a, b, c" },
        { labels: "d" },
      ],
      { limit: 5 }
    );

    expect(terms).toEqual([
      ["a", 7],
      ["b", 3],
      ["c", 2],
    ]);
  });

  it("accepts an optional filter", () => {
    const terms = getCommonLabelsTerms(
      [
        { labels: "a" },
        { labels: "a" },
        { labels: "a" },
        { labels: "d" },
        { labels: "d" },
      ],
      {
        limit: 5,
        filter: ([term, count]) => term !== "d",
      }
    );

    expect(terms).toEqual([["a", 3]]);
  });
});
