import { expect, describe, test, it } from "vitest";
import {
  combine,
  runParser,
  parseField,
  parseList,
  parseLit,
  parseNull,
  parseNum,
  parseObj,
  parseStr,
  path,
  success,
  input,
  fail,
  withState,
  updateState,
  getState,
} from "mu-parser";

const errorToPair = (error: {
  reason: string;
  path: readonly (string | number | symbol)[];
}) => [error.reason, error.path] as const;

describe("import mu-parser", () => {
  describe("basic parsers", () => {
    test("parseStr", () => {
      expect(runParser(parseStr, { input: "hello" })).toEqual("hello");
    });
    test("parseNum", () => {
      expect(runParser(parseNum, { input: 42 })).toEqual(42);
    });
    test("parseLit", () => {
      expect(runParser(parseLit("hello"), { input: "hello" })).toEqual("hello");
    });
    test("parseNull", () => {
      expect(runParser(parseNull, { input: null })).toEqual(null);
    });
    test("parseObj", () => {
      expect(runParser(parseObj, { input: {} })).toEqual({});
    });
    test("parseList", () => {
      expect(
        runParser(parseList(parseStr), { input: ["hello", "world"] }),
      ).toEqual(["hello", "world"]);
    });
    test("parseField", () => {
      expect(
        runParser(parseField("foo", parseLit("bar")), {
          input: { foo: "bar" },
        }),
      ).toEqual("bar");
    });
  });

  describe("runParser", () => {
    describe("errors", () => {
      describe("no handler", () => {
        it("throws", () => {
          expect(() => {
            runParser(parseStr, { input: 42 });
          }).toThrow(`string expected at path ""`);

          expect(() => runParser(parseNum, { input: "hello" })).toThrow(
            `number expected at path ""`,
          );

          expect(() =>
            runParser(parseLit("hello"), { input: "world" }),
          ).toThrow(`expected value "hello" at path ""`);

          expect(() => runParser(parseNull, { input: 42 })).toThrow(
            `expected value "null" at path ""`,
          );

          expect(() => runParser(parseObj, { input: "hello" })).toThrow(
            `object expected at path ""`,
          );

          expect(() =>
            runParser(parseField("a", parseNum), { input: {} }),
          ).toThrow(`property 'a' expected at path ""`);

          expect(() =>
            runParser(parseList(parseNum), { input: "hello" }),
          ).toThrow(`array expected at path ""`);
        });

        test("paths", () => {
          expect(() =>
            runParser(parseList(parseNum), { input: [1, "hello", 3] }),
          ).toThrow(`number expected at path "/1"`);

          expect(() =>
            runParser(parseField("a", parseField("b", parseNum)), {
              input: { a: {} },
            }),
          ).toThrow(`property 'b' expected at path "/a"`);

          expect(() =>
            runParser(
              parseField("a", parseList(parseField("b", success(undefined)))),
              { input: { a: [{ b: 1 }, { c: 2 }] } },
            ),
          ).toThrow(`property 'b' expected at path "/a/1"`);
        });
      });
      describe("given handler", () => {
        it("called with reason and path", () => {
          expect(runParser(parseStr, { input: 42 }, errorToPair)).toEqual([
            "string expected",
            [],
          ]);

          expect(runParser(parseNum, { input: "hello" }, errorToPair)).toEqual([
            "number expected",
            [],
          ]);

          expect(
            runParser(parseLit("hello"), { input: "world" }, errorToPair),
          ).toEqual([`expected value "hello"`, []]);

          expect(runParser(parseNull, { input: 42 }, errorToPair)).toEqual([
            `expected value "null"`,
            [],
          ]);

          expect(runParser(parseObj, { input: "hello" }, errorToPair)).toEqual([
            "object expected",
            [],
          ]);

          expect(
            runParser(parseField("a", parseNum), { input: {} }, errorToPair),
          ).toEqual(["property 'a' expected", []]);

          expect(
            runParser(parseList(parseNum), { input: "hello" }, errorToPair),
          ).toEqual(["array expected", []]);
        });

        test("paths", () => {
          expect(
            runParser(
              parseList(parseNum),
              { input: [1, "hello", 3] },
              errorToPair,
            ),
          ).toEqual(["number expected", [1]]);

          expect(
            runParser(
              parseField("a", parseField("b", parseNum)),
              { input: { a: {} } },
              errorToPair,
            ),
          ).toEqual(["property 'b' expected", ["a"]]);

          expect(
            runParser(
              parseField("a", parseList(parseNum)),
              { input: { a: "hello" } },
              errorToPair,
            ),
          ).toEqual(["array expected", ["a"]]);

          expect(
            runParser(
              parseField("a", parseList(parseNum)),
              { input: { a: [1, "hello", 3] } },
              errorToPair,
            ),
          ).toEqual(["number expected", ["a", 1]]);

          expect(
            runParser(
              parseField("a", parseList(parseField("b", success(undefined)))),
              { input: { a: [{ b: 1 }, { c: 2 }] } },
              errorToPair,
            ),
          ).toEqual(["property 'b' expected", ["a", 1]]);

          const symField = Symbol("symField");
          expect(
            runParser(
              parseField(symField, parseNum),
              { input: { [symField]: "a" } },
              errorToPair,
            ),
          ).toEqual(["number expected", [symField]]);

          expect(
            runParser(
              parseField(symField, parseNum),
              { input: { a: 42 } },
              errorToPair,
            ),
          ).toEqual(["property 'Symbol(symField)' expected", []]);
        });
      });
    });
  });

  describe("combine", () => {
    it("binds parsers", () => {
      const parseHobby = combine((bind) => {
        const name = bind(parseField("name", parseStr));
        const type = bind(parseField("type", parseStr).optional);
        return { name, type };
      });

      const parsePerson = combine((bind) => {
        const name = bind(parseField("name", parseStr));
        const age = bind(parseField("age", parseNum));
        const hobbies = bind(parseField("hobbies", parseList(parseHobby)));
        return { name, age, hobbies };
      });

      expect(
        runParser(parsePerson, {
          input: {
            name: "Bob",
            age: 25,
            hobbies: [{ name: "Reading", type: "Leisure" }, { name: "Gaming" }],
          },
        }),
      ).toEqual({
        name: "Bob",
        age: 25,
        hobbies: [{ name: "Reading", type: "Leisure" }, { name: "Gaming" }],
      });
    });

    describe("recursive input", () => {
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
  });

  describe("input", () => {
    it("returns current input", () => {
      expect(runParser(input, { input: 42 })).toBe(42);
    });
  });

  describe("success", () => {
    it("always succeeds with a given value", () => {
      expect(runParser(success(42), { input: "foo" })).toBe(42);
    });
  });
  describe("fail", () => {
    it("always fails with a given reason", () => {
      expect(
        runParser(
          parseField("foo", parseField("bar", fail("always fails"))),
          { input: { foo: { bar: 42 } } },
          errorToPair,
        ),
      ).toEqual([`always fails`, ["foo", "bar"]]);
    });
  });

  describe("path", () => {
    it("returns current path of the parser", () => {
      expect(
        runParser(parseField("a", path), { input: { a: "hello" } }),
      ).toEqual(["a"]);

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
        runParser(parseField("a", parseList(parseField("b", path))), {
          input: { a: [{ b: 1 }, { b: 2 }] },
        }),
      ).toEqual([
        ["a", 0, "b"],
        ["a", 1, "b"],
      ]);
    });
  });

  describe("withState", () => {
    it("binds a state type to combine", () => {
      const withLogs = withState<string[]>(combine);
      const log = (entry: string) =>
        withLogs((bind) => {
          bind(updateState((logs) => logs.concat([entry])));
        });

      const parseStrOrLog = withLogs((bind) => {
        const x = bind(parseStr.orElse(log(`string expected`)));
        const logs = bind(getState());
        return [x, logs] as const;
      });

      const [result, entries] = runParser(parseStrOrLog, {
        input: 42,
        initialState: [],
      });

      expect(result).toEqual(undefined);
      expect(entries).toEqual(["string expected"]);
    });
  });
});
