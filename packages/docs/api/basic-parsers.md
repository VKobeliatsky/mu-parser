# Basic Parsers

These parsers handle primitive data types and simple validation patterns.

## String Parsers

### `parseStr`

Parses string values.

```typescript
const parseStr: Parser<string>;
```

**Example:**

```typescript
parse(parseStr, "hello"); // "hello"
parse(parseStr, 42); // throws ParseError: "string expected"
```

## Number Parsers

### `parseNum`

Parses number values.

```typescript
const parseNum: Parser<number>;
```

**Example:**

```typescript
parse(parseNum, 42); // 42
parse(parseNum, 3.14); // 3.14
parse(parseNum, "42"); // throws ParseError: "number expected"
```

## Literal Parsers

### `parseLit`

Parses a specific literal value using strict equality (`===`).

```typescript
function parseLit<Val extends string | number | null | undefined>(
  value: Val,
): Parser<Val>;
```

**Parameters:**

- `value` - The exact value to match

**Example:**

```typescript
const parseActive = parseLit("active");
parse(parseActive, "active"); // "active"
parse(parseActive, "inactive"); // throws ParseError: "expected value active"

const parseZero = parseLit(0);
parse(parseZero, 0); // 0
parse(parseZero, 1); // throws ParseError: "expected value 0"
```

### `parseNull`

Convenience parser for `null` values.

```typescript
const parseNull: Parser<null>;
```

**Example:**

```typescript
parse(parseNull, null); // null
parse(parseNull, undefined); // throws ParseError: "expected value null"
```

## Object Parsers

### `parseObj`

Parses object values (excludes `null`).

```typescript
const parseObj: Parser<Record<string | number | symbol, unknown>>;
```

**Example:**

```typescript
parse(parseObj, { a: 1, b: 2 }); // { a: 1, b: 2 }
parse(parseObj, [1, 2, 3]); // [1, 2, 3] (arrays are objects)
parse(parseObj, null); // throws ParseError: "object expected"
parse(parseObj, "string"); // throws ParseError: "object expected"
```

## Boolean Parsers

While not included in the core library, you can easily create boolean parsers:

```typescript
const parseBool = parser((target, ctx) => {
  if (typeof target === "boolean") {
    return target;
  }
  throw ctx.parseError("boolean expected");
});

// Or parse string representations
const parseBoolString = parseLit("true")
  .map(() => true)
  .orElse(parseLit("false").map(() => false));

parse(parseBool, true); // true
parse(parseBoolString, "true"); // true
parse(parseBoolString, "false"); // false
```

## Custom Primitive Parsers

You can create custom parsers for other primitive types:

### Date Parser

```typescript
const parseDate = parser((target, ctx) => {
  if (target instanceof Date) {
    return target;
  }
  if (typeof target === "string") {
    const date = new Date(target);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  throw ctx.parseError("valid date expected");
});

parse(parseDate, new Date()); // Date object
parse(parseDate, "2023-12-25"); // Date object
parse(parseDate, "invalid-date"); // throws ParseError
```

### BigInt Parser

```typescript
const parseBigInt = parser((target, ctx) => {
  if (typeof target === "bigint") {
    return target;
  }
  if (typeof target === "string" || typeof target === "number") {
    try {
      return BigInt(target);
    } catch {
      throw ctx.parseError("valid bigint expected");
    }
  }
  throw ctx.parseError("bigint expected");
});

parse(parseBigInt, 123n); // 123n
parse(parseBigInt, "123"); // 123n
parse(parseBigInt, 123); // 123n
```

## Validation Helpers

### Range Validation

```typescript
const parseRange = (min: number, max: number) =>
  parseNum.andThen((n) =>
    n >= min && n <= max
      ? success(n)
      : fail(`Number must be between ${min} and ${max}`),
  );

const parsePercentage = parseRange(0, 100);
parse(parsePercentage, 50); // 50
parse(parsePercentage, 150); // throws ParseError: "Number must be between 0 and 100"
```

### String Length Validation

```typescript
const parseMinLength = (minLength: number) =>
  parseStr.andThen((s) =>
    s.length >= minLength
      ? success(s)
      : fail(`String must be at least ${minLength} characters`),
  );

const parsePassword = parseMinLength(8);
parse(parsePassword, "password123"); // "password123"
parse(parsePassword, "short"); // throws ParseError
```

### Pattern Validation

```typescript
const parsePattern = (pattern: RegExp, errorMessage: string) =>
  parseStr.andThen((s) => (pattern.test(s) ? success(s) : fail(errorMessage)));

const parseEmail = parsePattern(
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  "Invalid email format",
);

const parsePhoneNumber = parsePattern(
  /^\d{3}-\d{3}-\d{4}$/,
  "Phone number must be in format XXX-XXX-XXXX",
);

parse(parseEmail, "user@example.com"); // "user@example.com"
parse(parseEmail, "not-an-email"); // throws ParseError: "Invalid email format"
```

## Union Types

Create parsers for union types:

```typescript
const parseStatus = parseLit("active")
  .orElse(parseLit("inactive"))
  .orElse(parseLit("pending"));

type Status = "active" | "inactive" | "pending";

parse(parseStatus, "active"); // "active" (typed as Status)
parse(parseStatus, "unknown"); // throws ParseError
```

## See Also

- [Collection Parsers](./collection-parsers) - For arrays and object fields
- [Parser Combinators](./combinators) - For combining and transforming parsers
