# Parser Combinators

Advanced functions for combining, transforming, and composing parsers.

## `map`

Transform the result of a successful parse.

```typescript
parser.map<R>(f: (t: T) => R): Parser<R>
```

**Example:**

```typescript
const upperCaseParser = parseStr.map((s) => s.toUpperCase());
parse(upperCaseParser, "hello"); // "HELLO"

const doubleParser = parseNum.map((n) => n * 2);
parse(doubleParser, 21); // 42

// Chain transformations
const processedParser = parseStr
  .map((s) => s.trim())
  .map((s) => s.toLowerCase())
  .map((s) => s.replace(/\s+/g, "-"));

parse(processedParser, "  Hello World  "); // "hello-world"
```

## `orElse`

Try an alternative parser if the current one fails.

```typescript
parser.orElse<R>(alternative: Parser<R>): Parser<T | R>
```

**Example:**

```typescript
// Simple alternative
const stringOrNumber = parseStr.orElse(parseNum);
parse(stringOrNumber, "hello"); // "hello"
parse(stringOrNumber, 42); // 42

// Multiple alternatives
const flexibleParser = parseStr
  .orElse(parseNum)
  .orElse(parseBool)
  .orElse(parseNull);

// With defaults
const withDefault = parseStr.orElse(success("default"));
parse(withDefault, 42); // "default"
```

## `andThen`

Chain parsers sequentially, where the next parser depends on the previous result.

```typescript
parser.andThen<R>(f: (a: T) => Parser<R>): Parser<R>
```

**Example:**

```typescript
// Conditional parsing
const parseEvenNumber = parseNum.andThen((n) =>
  n % 2 === 0 ? success(n) : fail("Expected even number"),
);

parse(parseEvenNumber, 4); // 4
parse(parseEvenNumber, 3); // throws "Expected even number"

// Dependent parsing
const parseUserById = parseNum.andThen((id) => {
  if (id === 1) {
    return success({ id: 1, name: "Admin", role: "admin" });
  } else if (id > 1) {
    return success({ id, name: "User", role: "user" });
  } else {
    return fail("Invalid user ID");
  }
});
```

## `optional`

Make any parser optional (returns `undefined` instead of failing).

```typescript
parser.optional: Parser<undefined | T>
```

**Example:**

```typescript
const optionalEmail = parseStr.optional;
parse(optionalEmail, "user@example.com"); // "user@example.com"
parse(optionalEmail, null); // undefined

// In object parsing
const userParser = combine(({ bind }) => ({
  name: bind(parseField("name", parseStr)),
  email: bind(parseField("email", parseStr).optional),
  phone: bind(parseField("phone", parseStr).optional),
}));
```

## `combine`

Build complex parsers by combining multiple simpler parsers.

```typescript
function combine<T>(parsers: (ctx: CombineCtx) => T): Parser<T>;
```

The `combine` function is the primary way to build complex parsers from simpler ones. It provides a context with a `bind` method that extracts values from parsers within the same scope.

**Example:**

```typescript
// Basic object parsing
const userParser = combine(({ bind }) => {
  const name = bind(parseField("name", parseStr));
  const age = bind(parseField("age", parseNum));
  const email = bind(parseField("email", parseStr).optional);

  return { name, age, email };
});

// Conditional logic within combine
const configParser = combine(({ bind }) => {
  const env = bind(parseField("env", parseStr));
  const port = bind(parseField("port", parseNum));

  // You can use regular JavaScript logic
  const isDev = env === "development";
  const defaultPort = isDev ? 3000 : 80;

  return {
    env,
    port: port || defaultPort,
    isDevelopment: isDev,
  };
});

// Nested combine blocks
const personParser = combine(({ bind }) => {
  const name = bind(parseField("name", parseStr));
  const address = bind(
    parseField(
      "address",
      combine(({ bind }) => ({
        street: bind(parseField("street", parseStr)),
        city: bind(parseField("city", parseStr)),
        zipCode: bind(parseField("zipCode", parseStr)),
      })),
    ),
  );

  return { name, address };
});
```

**Key Features:**

- **Type Safety**: The result type is automatically inferred from the return statement
- **Error Propagation**: If any bound parser fails, the entire combine block fails
- **Scope**: All bound values are available in the same scope for building the result
- **Flexibility**: You can use any JavaScript logic within the combine block

**Context Object:**

The `bind` function in the context extracts the value from a parser:

```typescript
interface CombineCtx {
  bind<R>(parser: Parser<R>): R;
}
```

**Advanced Usage:**

```typescript
// Dynamic parsing based on previous results
const dynamicParser = combine(({ bind }) => {
  const type = bind(parseField("type", parseStr));

  switch (type) {
    case "user":
      const userId = bind(parseField("id", parseNum));
      const userName = bind(parseField("name", parseStr));
      return { type: "user", id: userId, name: userName };

    case "admin":
      const adminId = bind(parseField("id", parseNum));
      const permissions = bind(parseField("permissions", parseList(parseStr)));
      return { type: "admin", id: adminId, permissions };

    default:
      // You can bind to fail() to trigger an error
      return bind(fail(`Unknown type: ${type}`));
  }
});

// Validation within combine
const validatedUserParser = combine(({ bind }) => {
  const name = bind(parseField("name", parseStr));
  const age = bind(parseField("age", parseNum));
  const email = bind(parseField("email", parseStr));

  // Validate relationships between fields
  if (age < 13 && email.includes("@work.")) {
    return bind(fail("Users under 13 cannot have work emails"));
  }

  return { name, age, email };
});
```

## Utility Combinators

### `oneOf`

TODO

### `tuple`

TODO

### `record`

TODO

## See Also

- [Basic Parsers](./basic-parsers) - Primitive type parsers
- [Collection Parsers](./collection-parsers) - Array and object parsers
