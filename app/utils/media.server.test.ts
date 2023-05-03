import { getCommonCommentTerms } from "./media.server";

describe("getCommonCommentTerms", () => {
  it("returns the most common terms", () => {
    const terms = getCommonCommentTerms(
      [
        { comment: "b, c" },
        { comment: "a" },
        { comment: "a" },
        { comment: "a" },
        { comment: "a, b" },
        { comment: "a" },
        { comment: "a" },
        { comment: "a, b, c" },
      ],
      { limit: 2 }
    );

    expect(terms).toEqual([
      ["a", 7],
      ["b", 3],
    ]);
  });

  it("ignores terms with less than 2 occurrences", () => {
    const terms = getCommonCommentTerms(
      [
        { comment: "b, c" },
        { comment: "a" },
        { comment: "a" },
        { comment: "a" },
        { comment: "a, b" },
        { comment: "a" },
        { comment: "a" },
        { comment: "a, b, c" },
        { comment: "d" },
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
    const terms = getCommonCommentTerms(
      [
        { comment: "a" },
        { comment: "a" },
        { comment: "a" },
        { comment: "d" },
        { comment: "d" },
      ],
      {
        limit: 5,
        filter: ([term, count]) => term !== "d",
      }
    );

    expect(terms).toEqual([["a", 3]]);
  });
});
