# Parser Combinators

Advanced functions for combining, transforming, and composing parsers.

## Core Combinators

### `map`

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

### `orElse`

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

### `andThen`

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

### `optional`

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

## Advanced Combinators

### Validation Combinators

```typescript
// Range validation
const parseRange = (min: number, max: number) =>
  parseNum.andThen((n) =>
    n >= min && n <= max
      ? success(n)
      : fail(`Must be between ${min} and ${max}`),
  );

// Length validation
const parseMinLength = (minLen: number) =>
  parseStr.andThen((s) =>
    s.length >= minLen
      ? success(s)
      : fail(`Must be at least ${minLen} characters`),
  );

// Pattern validation
const parsePattern = (regex: RegExp, message: string) =>
  parseStr.andThen((s) => (regex.test(s) ? success(s) : fail(message)));

const parseEmail = parsePattern(
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  "Invalid email format",
);
```

### Transformation Combinators

```typescript
// Parse and transform
const parseDate = parseStr.andThen((s) => {
  const date = new Date(s);
  return isNaN(date.getTime()) ? fail("Invalid date string") : success(date);
});

// Parse with normalization
const parseNormalizedString = parseStr
  .map((s) => s.trim())
  .map((s) => s.toLowerCase())
  .andThen((s) => (s.length > 0 ? success(s) : fail("String cannot be empty")));

// Type coercion
const parseStringAsNumber = parseStr.andThen((s) => {
  const num = Number(s);
  return isNaN(num) ? fail("Cannot convert to number") : success(num);
});
```

### Conditional Combinators

```typescript
// Conditional parsing based on value
const parseConditional =
  <T>(condition: (value: T) => boolean, errorMessage: string) =>
  (parser: Parser<T>): Parser<T> =>
    parser.andThen((value) =>
      condition(value) ? success(value) : fail(errorMessage),
    );

const parsePositive = parseConditional(
  (n: number) => n > 0,
  "Must be positive",
);

const positiveNumberParser = parsePositive(parseNum);

// Multi-branch conditional
const parseGrade = parseStr.andThen((grade) => {
  switch (grade.toUpperCase()) {
    case "A":
      return success(90);
    case "B":
      return success(80);
    case "C":
      return success(70);
    case "D":
      return success(60);
    case "F":
      return success(0);
    default:
      return fail(`Invalid grade: ${grade}`);
  }
});
```

## Utility Combinators

### `oneOf`

Parse one of several literal values:

```typescript
const oneOf = <T extends readonly (string | number | null | undefined)[]>(
  ...values: T
): Parser<T[number]> =>
  values.reduce(
    (acc, value) => acc.orElse(parseLit(value)),
    fail(`Expected one of: ${values.join(", ")}`) as Parser<T[number]>,
  );

const parseStatus = oneOf("active", "inactive", "pending");
parse(parseStatus, "active"); // "active"
parse(parseStatus, "unknown"); // throws error
```

### `tuple`

TODO

### `record`

TODO

## See Also

- [Basic Parsers](./basic-parsers) - Primitive type parsers
- [Collection Parsers](./collection-parsers) - Array and object parsers
