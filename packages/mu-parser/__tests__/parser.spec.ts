import { test, expect, describe } from "vitest";

import {
  runParser,
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
  expect(runParser(parseStr, { input: "hello" })).toBe("hello");
  expect(runParser(parseNum, { input: 42 })).toBe(42);
  expect(runParser(parseLit("hello"), { input: "hello" })).toBe("hello");
  expect(runParser(parseNull, { input: null })).toBe(null);
  expect(runParser(parseStr.orElse(success("default")), { input: null })).toBe(
    "default",
  );
  expect(runParser(parseStr.optional, { input: null })).toBe(undefined);
});

test("parser combine", () => {
  expect(
    runParser(
      combine((bind) => {
        const name = bind(parseField("name", parseStr));
        const age = bind(parseField("age", parseNum));
        return `${name} is ${age} years old`;
      }),
      { input: { name: "Alice", age: 30 } },
    ),
  ).toEqual("Alice is 30 years old");

  expect(
    runParser(
      combine((bind) => {
        const name = bind(parseField("name", parseStr));
        const age = bind(parseField("age", parseNum));
        const hobbies = bind(
          parseField(
            "hobbies",
            parseList(
              combine((bind) => {
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

  const parsePerson = combine((bind): Person => {
    const name = bind(parseField("name", parseStr));
    const age = bind(parseField("age", parseNum));
    const friends = bind(
      parseField("friends", parseList(parsePerson)).optional,
    );
    return { name, age, friends };
  });

  expect(
    runParser(parsePerson, {
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
  expect(runParser(parseField("a", path), { input: { a: "hello" } })).toEqual([
    "a",
  ]);

  expect(
    runParser(parseField("a", parseList(path)), {
      input: { a: ["hello", "world"] },
    }),
  ).toEqual([
    ["a", 0],
    ["a", 1],
  ]);

  expect(
    runParser(parseField("a", parseField("b", path)), {
      input: { a: { b: 1 } },
    }),
  ).toEqual(["a", "b"]);

  expect(
    runParser(
      parseField(
        "a",
        combine((bind) => bind(parseList(parseField("b", path)))),
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
    runParser(parseStr, { input: 42 }, (error) => [error.reason, error.path]),
  ).toEqual(["string expected", []]);
  expect(
    runParser(parseNum, { input: "hello" }, (error) => [
      error.reason,
      error.path,
    ]),
  ).toEqual(["number expected", []]);
  expect(
    runParser(parseLit("hello"), { input: "world" }, (error) => [
      error.reason,
      error.path,
    ]),
  ).toEqual([`expected value "hello"`, []]);

  expect(
    runParser(parseNull, { input: 42 }, (error) => [error.reason, error.path]),
  ).toEqual([`expected value "null"`, []]);
  expect(
    runParser(parseObj, { input: "hello" }, (error) => [
      error.reason,
      error.path,
    ]),
  ).toEqual(["object expected", []]);
  expect(
    runParser(parseField("a", parseNum), { input: {} }, (error) => [
      error.reason,
      error.path,
    ]),
  ).toEqual(["property 'a' expected", []]);
  expect(
    runParser(parseList(parseNum), { input: "hello" }, (error) => [
      error.reason,
      error.path,
    ]),
  ).toEqual(["array expected", []]);

  expect(
    runParser(parseList(parseNum), { input: [1, "hello", 3] }, (error) => [
      error.reason,
      error.path,
    ]),
  ).toEqual(["number expected", [1]]);

  expect(
    runParser(
      parseField("a", parseField("b", parseNum)),
      { input: { a: {} } },
      (error) => [error.reason, error.path],
    ),
  ).toEqual(["property 'b' expected", ["a"]]);

  expect(
    runParser(
      parseField("a", parseList(parseNum)),
      { input: { a: "hello" } },
      (error) => [error.reason, error.path],
    ),
  ).toEqual(["array expected", ["a"]]);

  expect(
    runParser(
      parseField("a", parseList(parseNum)),
      { input: { a: [1, "hello", 3] } },
      (error) => [error.reason, error.path],
    ),
  ).toEqual(["number expected", ["a", 1]]);

  expect(
    runParser(
      parseField("a", parseList(parseField("b", path))),
      { input: { a: [{ b: 1 }, { c: 2 }] } },
      (error) => [error.reason, error.path],
    ),
  ).toEqual(["property 'b' expected", ["a", 1]]);

  const symField = Symbol("symField");
  expect(
    runParser(
      parseField(symField, parseNum),
      { input: { [symField]: "a" } },
      (error) => [error.reason, error.path],
    ),
  ).toEqual(["number expected", [symField]]);

  expect(
    runParser(parseField(symField, parseNum), { input: { a: 42 } }, (error) => [
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

    const parseRecursive = combine((bind): Recursive => {
      const value = bind(parseField("value", parseStr));
      const next = bind(parseField("next", parseRecursive));
      return { value, next };
    });

    const input: Recursive = {
      value: "root",
    };

    input.next = input;

    expect(
      runParser(
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
    const parseLeaf = combine((bind) => {
      const bar = bind(parseField("foo", parseLit("bar")));
      return { foo: bar };
    });

    const root = {
      a: leaf,
      b: leaf,
    };

    const result = runParser(
      combine((bind) => {
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
    combine((bind) => {
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
  > = runParser(parser, {
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
      withLogger((bind) => {
        bind(updateState((entries) => entries.concat(entry)));
        return undefined;
      });

    const parserStrOrLog = withLogger((bind) => {
      const x = bind(
        parseStr.recover((err) =>
          log(`string expected at: [${err.path.join(", ")}]`),
        ),
      );
      const logs = bind(getState());
      return [x, logs] as const;
    });

    const [result, entries] = runParser(parserStrOrLog, {
      input: 42,
      initialState: [],
    });

    expect(result).toEqual(undefined);
    expect(entries).toEqual(["string expected at: []"]);
  });
});
