import { test, expect } from "vitest";

import { parse, combine, str, num, lit, obj, list, field, parseNull, path, success, fail } from "../src/parser";

test("parser simple", () => {
  expect(parse(str, "hello")).toBe("hello");
  expect(parse(num, 42)).toBe(42);
  expect(parse(lit("hello"), "hello")).toBe("hello");
  expect(parse(parseNull, null)).toBe(null);
  expect(parse(str.orElse(success("default")), null)).toBe("default");
  expect(parse(str.optional, null)).toBe(undefined);
});

test("parser combine", () => {
  expect(parse(combine(({ bind }) => {
    const name = bind(field("name", str));
    const age = bind(field("age", num));
    return `${name} is ${age} years old`;
  }), { name: "Alice", age: 30 })).toEqual("Alice is 30 years old");

  expect(parse(combine(({ bind }) => {
    const name = bind(field("name", str));
    const age = bind(field("age", num));
    const hobbies = bind(field("hobbies", list(combine(({ bind }) => {
      const name = bind(field("name", str));
      const type = bind(field("type", str).optional);
      return { name, type };
    }))));
    return { name, age, hobbies };
  }), {
    name: "Bob",
    age: 25,
    hobbies: [{ name: "Reading", type: "Leisure" }, { name: "Gaming" }],
  })).toEqual({
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
    const name = bind(field("name", str));
    const age = bind(field("age", num));
    const friends = bind(field("friends", list(parsePerson)).optional);
    return { name, age, friends };
  });

  expect(parse(parsePerson, {
    name: "Bob",
    age: 25,
    friends: [
      { name: "Charlie", age: 22 },
      { name: "Diana", age: 28 },
    ],
  })).toEqual({
    name: "Bob",
    age: 25,
    friends: [
      { name: "Charlie", age: 22 },
      { name: "Diana", age: 28 },
    ],
  });
});

test("parser paths", () => {
  expect(
    parse(field("a", path), { a: "hello" })
  ).toEqual(
    ["a"]
  );

  expect(
    parse(field("a", list(path)), { a: ["hello", "world"] })
  ).toEqual(
    [["a", "0"], ["a", "1"]]
  );

  expect(
    parse(field("a", field("b", path)), { a: { b: 1 } })
  ).toEqual(
    ["a", "b"]
  );

  expect(
    parse(field("a", combine(({ bind }) => bind(list(field("b", path))))), { a: [{ b: 1 }, { b: 2 }] })
  ).toEqual(
    [["a", "0", "b"], ["a", "1", "b"]]
  );
});

test("parser errors", () => {
  expect(
    parse(str, 42, (error) => ([error.reason, error.path]))
  ).toEqual(
    ["string expected", []]
  );
  expect(
    parse(num, "hello", (error) => ([error.reason, error.path]))
  ).toEqual(
    ["number expected", []]
  );
  expect(
    parse(lit("hello"), "world", (error) => ([error.reason, error.path]))
  ).toEqual(
    ["expected value hello", []]
  );

  expect(
    parse(parseNull, 42, (error) => ([error.reason, error.path]))
  ).toEqual(
    ["expected value null", []]
  );
  expect(
    parse(obj, "hello", (error) => ([error.reason, error.path]))
  ).toEqual(
    ["object expected", []]
  );
  expect(
    parse(field("a", num), {}, (error) => ([error.reason, error.path]))
  ).toEqual(
    ["property 'a' expected", []]
  );
  expect(
    parse(list(num), "hello", (error) => ([error.reason, error.path]))
  ).toEqual(
    ["array expected", []]
  );

  expect(
    parse(list(num), [1, "hello", 3], (error) => ([error.reason, error.path]))
  ).toEqual(
    ["number expected", ["1"]]
  );

  expect(
    parse(field("a", field("b", num)), { a: {} }, (error) => ([error.reason, error.path]))
  ).toEqual(
    ["property 'b' expected", ["a"]]
  );

  expect(
    parse(field("a", list(num)), { a: 'hello' }, (error) => ([error.reason, error.path]))
  ).toEqual(
    ["array expected", ["a"]]
  );

  expect(
    parse(field("a", list(num)), { a: [1, "hello", 3] }, (error) => ([error.reason, error.path]))
  ).toEqual(
    ["number expected", ["a", "1"]]
  );

  expect(
    parse(field("a", list(field("b", path))), { a: [{ b: 1 }, { c: 2 }] }, (error) => ([error.reason, error.path]))
  ).toEqual(
    ["property 'b' expected", ["a", "1"]]
  );
});

test("recursive parser", () => {
  interface Recursive {
    value: string;
    next?: Recursive;
  }

  const parseRecursive = combine(({ bind }): Recursive => {
    const value = bind(field("value", str));
    const next = bind(field("next", parseRecursive));
    return { value, next };
  });

  const input: Recursive = {
    value: "root",
  }

  input.next = input;

  expect(
    parse(parseRecursive, input, (error) => ([error.reason, error.path]))
  ).toEqual(
    ["circular reference detected", ["next"]]
  );
});

test("union parser", () => {
  expect(
    parse(list(combine(({ bind }) => {
      const type = bind(field("type", str));
      if (type === "string") {
        return bind(field("value", str));
      } else if (type === "number") {
        const value = bind(field("value", num));

        if (value < 0) {
          return bind(fail("negative number not allowed"));
        }

        return value;
      } else {
        return bind(fail("unknown type"));
      }

    })), [{ type: "string", value: "hello" }, { type: "number", value: 42 }])
  ).toEqual(
    ["hello", 42]
  );
});