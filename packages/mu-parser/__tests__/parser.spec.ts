import { test, expect, describe } from "vitest";

import {
  parse,
  combine,
  path,
  success,
  fail,
  withState,
  updateState,
  getState,
} from "../src/parser";
import {
  parseStr,
  parseNum,
  parseLit,
  parseObj,
  parseList,
  parseField,
  parseNull,
} from "../src/parsers";

test("parser simple", () => {
  expect(parse(parseStr, { input: "hello" })).toBe("hello");
  expect(parse(parseNum, { input: 42 })).toBe(42);
  expect(parse(parseLit("hello"), { input: "hello" })).toBe("hello");
  expect(parse(parseNull, { input: null })).toBe(null);
  expect(
    parse(
      parseStr.orElse(() => success("default")),
      { input: null },
    ),
  ).toBe("default");
  expect(parse(parseStr.optional, { input: null })).toBe(undefined);
});

test("parser combine", () => {
  expect(
    parse(
      combine(({ bind }) => {
        const name = bind(parseField("name", parseStr));
        const age = bind(parseField("age", parseNum));
        return `${name} is ${age} years old`;
      }),
      { input: { name: "Alice", age: 30 } },
    ),
  ).toEqual("Alice is 30 years old");

  expect(
    parse(
      combine(({ bind }) => {
        const name = bind(parseField("name", parseStr));
        const age = bind(parseField("age", parseNum));
        const hobbies = bind(
          parseField(
            "hobbies",
            parseList(
              combine(({ bind }) => {
                const name = bind(parseField("name", parseStr));
                const type = bind(parseField("type", parseStr).optional);
                return { name, type };
              }),
            ),
          ),
        );
        return { name, age, hobbies };
      }),
      {
        input: {
          name: "Bob",
          age: 25,
          hobbies: [{ name: "Reading", type: "Leisure" }, { name: "Gaming" }],
        },
      },
    ),
  ).toEqual({
    name: "Bob",
    age: 25,
    hobbies: [{ name: "Reading", type: "Leisure" }, { name: "Gaming" }],
  });

  interface Person {
    name: string;
    age: number;
    friends?: Person[];
  }

  const parsePerson = combine(({ bind }): Person => {
    const name = bind(parseField("name", parseStr));
    const age = bind(parseField("age", parseNum));
    const friends = bind(
      parseField("friends", parseList(parsePerson)).optional,
    );
    return { name, age, friends };
  });

  expect(
    parse(parsePerson, {
      input: {
        name: "Bob",
        age: 25,
        friends: [
          { name: "Charlie", age: 22 },
          { name: "Diana", age: 28 },
        ],
      },
    }),
  ).toEqual({
    name: "Bob",
    age: 25,
    friends: [
      { name: "Charlie", age: 22 },
      { name: "Diana", age: 28 },
    ],
  });
});

test("parser paths", () => {
  expect(parse(parseField("a", path), { input: { a: "hello" } })).toEqual([
    "a",
  ]);

  expect(
    parse(parseField("a", parseList(path)), {
      input: { a: ["hello", "world"] },
    }),
  ).toEqual([
    ["a", 0],
    ["a", 1],
  ]);

  expect(
    parse(parseField("a", parseField("b", path)), { input: { a: { b: 1 } } }),
  ).toEqual(["a", "b"]);

  expect(
    parse(
      parseField(
        "a",
        combine(({ bind }) => bind(parseList(parseField("b", path)))),
      ),
      { input: { a: [{ b: 1 }, { b: 2 }] } },
    ),
  ).toEqual([
    ["a", 0, "b"],
    ["a", 1, "b"],
  ]);
});

test("parser errors", () => {
  expect(
    parse(parseStr, { input: 42 }, (error) => [error.reason, error.path]),
  ).toEqual(["string expected", []]);
  expect(
    parse(parseNum, { input: "hello" }, (error) => [error.reason, error.path]),
  ).toEqual(["number expected", []]);
  expect(
    parse(parseLit("hello"), { input: "world" }, (error) => [
      error.reason,
      error.path,
    ]),
  ).toEqual(["expected value hello", []]);

  expect(
    parse(parseNull, { input: 42 }, (error) => [error.reason, error.path]),
  ).toEqual(["expected value null", []]);
  expect(
    parse(parseObj, { input: "hello" }, (error) => [error.reason, error.path]),
  ).toEqual(["object expected", []]);
  expect(
    parse(parseField("a", parseNum), { input: {} }, (error) => [
      error.reason,
      error.path,
    ]),
  ).toEqual(["property 'a' expected", []]);
  expect(
    parse(parseList(parseNum), { input: "hello" }, (error) => [
      error.reason,
      error.path,
    ]),
  ).toEqual(["array expected", []]);

  expect(
    parse(parseList(parseNum), { input: [1, "hello", 3] }, (error) => [
      error.reason,
      error.path,
    ]),
  ).toEqual(["number expected", [1]]);

  expect(
    parse(
      parseField("a", parseField("b", parseNum)),
      { input: { a: {} } },
      (error) => [error.reason, error.path],
    ),
  ).toEqual(["property 'b' expected", ["a"]]);

  expect(
    parse(
      parseField("a", parseList(parseNum)),
      { input: { a: "hello" } },
      (error) => [error.reason, error.path],
    ),
  ).toEqual(["array expected", ["a"]]);

  expect(
    parse(
      parseField("a", parseList(parseNum)),
      { input: { a: [1, "hello", 3] } },
      (error) => [error.reason, error.path],
    ),
  ).toEqual(["number expected", ["a", 1]]);

  expect(
    parse(
      parseField("a", parseList(parseField("b", path))),
      { input: { a: [{ b: 1 }, { c: 2 }] } },
      (error) => [error.reason, error.path],
    ),
  ).toEqual(["property 'b' expected", ["a", 1]]);

  const symField = Symbol("symField");
  expect(
    parse(
      parseField(symField, parseNum),
      { input: { [symField]: "a" } },
      (error) => [error.reason, error.path],
    ),
  ).toEqual(["number expected", [symField]]);

  expect(
    parse(parseField(symField, parseNum), { input: { a: 42 } }, (error) => [
      error.reason,
      error.path,
    ]),
  ).toEqual(["property 'Symbol(symField)' expected", []]);
});

describe("recursive parsers", () => {
  test("deep", () => {
    interface Recursive {
      value: string;
      next?: Recursive;
    }

    const parseRecursive = combine(({ bind }): Recursive => {
      const value = bind(parseField("value", parseStr));
      const next = bind(parseField("next", parseRecursive));
      return { value, next };
    });

    const input: Recursive = {
      value: "root",
    };

    input.next = input;

    expect(
      parse(
        parseRecursive,
        {
          input,
        },
        (error) => [error.reason, error.path],
      ),
    ).toEqual(["circular reference detected", ["next"]]);
  });
  test("same level", () => {
    const leaf = {
      foo: "bar",
    };
    const parseLeaf = combine(({ bind }) => {
      const bar = bind(parseField("foo", parseLit("bar")));
      return { foo: bar };
    });

    const root = {
      a: leaf,
      b: leaf,
    };

    const result = parse(
      combine(({ bind }) => {
        const a = bind(parseField("a", parseLeaf));
        const b = bind(parseField("b", parseLeaf));

        return { a, b };
      }),
      { input: root },
    );

    expect(result).toEqual({
      a: { foo: "bar" },
      b: { foo: "bar" },
    });
  });
});

test("union parser", () => {
  const parser = parseList(
    combine(({ bind }) => {
      const type = bind(parseField("type", parseStr));
      if (type === "string") {
        const value = bind(parseField("value", parseStr));
        return {
          type,
          value,
        } as const;
      } else if (type === "number") {
        const value = bind(parseField("value", parseNum));

        if (value < 0) {
          return bind(fail("negative number not allowed"));
        }

        return {
          type,
          value,
        } as const;
      } else {
        return bind(fail("unknown type"));
      }
    }),
  );

  const result: Array<
    | {
        readonly type: "string";
        readonly value: string;
      }
    | {
        readonly type: "number";
        readonly value: number;
      }
  > = parse(parser, {
    input: [
      { type: "string", value: "hello" },
      { type: "number", value: 42 },
    ],
  });

  expect(result).toEqual([
    { type: "string", value: "hello" },
    { type: "number", value: 42 },
  ]);
});

describe("user state", () => {
  test("logger", () => {
    const withLogger = withState<string[]>(combine);
    const log = (entry: string) =>
      withLogger(({ bind }) => {
        bind(updateState((st) => st.concat(entry)));
        return undefined;
      });

    const parserStrOrLog = withLogger(({ bind }) => {
      const x = bind(
        parseStr.orElse((err) =>
          log(`string expected at: [${err.path.join(", ")}]`),
        ),
      );
      const logs = bind(getState());
      return [x, logs];
    });

    expect(parse(parserStrOrLog, { input: 42, initialState: [] })).toEqual([
      undefined,
      ["string expected at: []"],
    ]);
  });
});
