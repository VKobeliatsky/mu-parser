# Basic Parsers

These parsers handle primitive data types and simple validation patterns.

## `parseStr`

Parses string values.

```typescript
const parseStr: Parser<string>;
```

**Example:**

```typescript
parse(parseStr, "hello"); // "hello"
parse(parseStr, 42); // throws ParseError: "string expected"
```

## `parseNum`

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

## `parseLit`

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

Convenience parser for `null` values.

```typescript
const parseNull: Parser<null>;
```

**Example:**

```typescript
parse(parseNull, null); // null
parse(parseNull, undefined); // throws ParseError: "expected value null"
```

## `parseObj`

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

## See Also

- [Collection Parsers](./collection-parsers) - For arrays and object fields
- [Parser Combinators](./combinators) - For combining and transforming parsers
