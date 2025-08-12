# API Reference

Complete reference for all parsers, combinators, and utilities provided by mu-parser.

## Core Functions

### `parse`

Execute a parser on unknown data.

```typescript
function parse<T>(parser: Parser<T>, target: unknown): T;
function parse<T1, T2>(
  parser: Parser<T1>,
  target: unknown,
  onError: (error: ParseError) => T2,
): T1 | T2;
```

**Parameters:**

- `parser` - The parser to execute
- `target` - The data to parse
- `onError` - Optional error handler function

**Returns:** The parsed result or the error handler result

**Example:**

```typescript
// Basic usage
const result = parse(parseStr, "hello"); // "hello"

// With error handling
const result = parse(parseStr, 42, (error) => `Error: ${error.reason}`);
// "Error: string expected"
```

### `parser`

Create a custom parser from a function.

```typescript
function parser<T>(run: (target: unknown, ctx: ParserCtx) => T): Parser<T>;
```

**Parameters:**

- `run` - Function that performs the parsing logic

**Example:**

```typescript
const parsePositiveNumber = parser((target, ctx) => {
  if (typeof target !== "number") {
    throw ctx.parseError("number expected");
  }
  if (target <= 0) {
    throw ctx.parseError("positive number expected");
  }
  return target;
});
```

### `combine`

Combine multiple parsers into a single parser.

```typescript
function combine<T>(parsers: (ctx: CombineCtx) => T): Parser<T>;
```

**Parameters:**

- `parsers` - Function that receives a context with a `bind` method

**Example:**

```typescript
const userParser = combine(({ bind }) => {
  const name = bind(parseField("name", parseStr));
  const age = bind(parseField("age", parseNum));
  return { name, age };
});
```

## Utility Functions

### `success`

Create a parser that always succeeds with the given value.

```typescript
function success<T>(val: T): Parser<T>;
```

### `fail`

Create a parser that always fails with the given error message.

```typescript
function fail(reason: string): Parser<never>;
```

### `path`

Parser that returns the current path in the data structure.

```typescript
const path: Parser<(string | number | symbol)[]>;
```

## Parser Interface

All parsers implement the `Parser<T>` interface:

```typescript
interface Parser<T> {
  run(target: unknown, ctx: ParserCtx): T;
  andThen<R>(f: (a: T) => Parser<R>): Parser<R>;
  orElse<R>(parser: Parser<R>): Parser<T | R>;
  map<R>(f: (t: T) => R): Parser<R>;
  readonly optional: Parser<undefined | T>;
}
```

### Methods

#### `andThen`

Chain parsers sequentially, where the next parser depends on the result of the current one.

```typescript
const validatedAge = parseNum.andThen((age) =>
  age >= 0 ? success(age) : fail("Age must be non-negative"),
);
```

#### `orElse`

Try an alternative parser if the current one fails.

```typescript
const stringOrNumber = parseStr.orElse(parseNum);
```

#### `map`

Transform the result of a successful parse.

```typescript
const upperCase = parseStr.map((s) => s.toUpperCase());
```

#### `optional`

Make a parser optional (returns `undefined` instead of failing).

```typescript
const optionalEmail = parseStr.optional;
```

## Error Types

### `ParseError`

Error thrown when parsing fails.

```typescript
class ParseError {
  constructor(
    public readonly reason: string,
    public readonly path: (string | number | symbol)[],
  );
}
```

**Properties:**

- `reason` - Description of why parsing failed
- `path` - Path to the location where parsing failed

## Parser Context

### `ParserCtx`

Internal context used during parsing (rarely used directly).

```typescript
class ParserCtx {
  getPath(): (string | number | symbol)[];
  visit(target: unknown): ParserCtx;
  pushPath(name: string | number | symbol): ParserCtx;
  parseError(reason: string): ParseError;
}
```

### `CombineCtx`

Context provided to the `combine` function.

```typescript
interface CombineCtx {
  bind<R>(parser: Parser<R>): R;
}
```

## See Also

- [Basic Parsers](./basic-parsers) - String, number, and literal parsers
- [Collection Parsers](./collection-parsers) - Array and object field parsers
- [Parser Combinators](./combinators) - Advanced combination patterns
