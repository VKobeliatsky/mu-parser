import { expect, describe, it } from "vitest";
import { parse, parseStr } from "mu-parser";

describe("mu-parser", () => {
  it("exists", () => {
    const result = parse(parseStr, { input: "Hello World!" });

    expect(result).toBe("Hello World!");
  });
});
