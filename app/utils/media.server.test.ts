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
      2
    );

    expect(terms).toEqual([
      ["a", 7],
      ["b", 3],
    ]);
  });
});
