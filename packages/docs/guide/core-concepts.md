# Core Concepts

Understanding these core concepts will help you master mu-parser and build robust parsers for your data validation needs.

## What is a Parser?

A `Parser<T>` is a function that takes unknown input and either returns a value of type `T` or throws a parse error.

```typescript
import { Parser, parse, parseStr, parseNum } from "mu-parser";

// Basic parsers
const stringParser: Parser<string> = parseStr;
const numberParser: Parser<number> = parseNum;

// Usage
const result1 = parse(parseStr, "hello"); // "hello"
const result2 = parse(parseNum, 42); // 42
```

## Parser Combinators

Combinators let you transform and combine parsers to create more complex ones.

### `map` - Transform Results

Transform the result of a successful parse:

```typescript
const upperCaseParser = parseStr.map((s) => s.toUpperCase());
const result = parse(upperCaseParser, "hello"); // "HELLO"
```

### `orElse` - Alternative Parsing

Try one parser, fall back to another if it fails:

```typescript
const stringOrNumber = parseStr.orElse(parseNum);
parse(stringOrNumber, "hello"); // "hello"
parse(stringOrNumber, 42); // 42
```

### `optional` - Optional Values

Make a parser optional (returns `undefined` if parsing fails):

```typescript
const optionalName = parseStr.optional;
parse(optionalName, "Alice"); // "Alice"
parse(optionalName, null); // undefined
```

### `andThen` - Sequential Parsing

Chain parsers together, where the next parser depends on the previous result:

```typescript
import { success, fail } from "mu-parser";

const positiveNumber = parseNum.andThen((n) =>
  n > 0 ? success(n) : fail("Number must be positive"),
);

parse(positiveNumber, 5); // 5
parse(positiveNumber, -1); // throws "Number must be positive"
```

## Combining Parsers

The `combine` function lets you build complex parsers by binding multiple parsers together:

```typescript
import { combine, parseField } from "mu-parser";

const userParser = combine((bind) => {
  const name = bind(parseField("name", parseStr));
  const age = bind(parseField("age", parseNum));
  const email = bind(parseField("email", parseStr).optional);

  return { name, age, email };
});
```

### Why `combine`?

The `combine` function provides a clean way to:

- Access multiple parsed values in the same scope
- Build objects from parsed components
- Maintain type safety throughout the process

## Error Context

Parsers track the path through your data structure, providing detailed error information:

```typescript
const data = {
  users: [
    { name: "Alice", age: 30 },
    { name: "Bob", age: "invalid" }, // Error here
  ],
};

const usersParser = parseField("users", parseList(userParser));

parse(usersParser, data, (error) => {
  console.log(error.reason); // "number expected"
  console.log(error.path); // ["users", 1, "age"]
});
```

## Circular Reference Detection

mu-parser automatically detects circular references in your data:

```typescript
interface Node {
  value: string;
  next?: Node;
}

const nodeParser = combine((bind): Node => {
  const value = bind(parseField("value", parseStr));
  const next = bind(parseField("next", nodeParser).optional);
  return { value, next };
});

const circularData: any = { value: "root" };
circularData.next = circularData; // Circular reference

parse(nodeParser, circularData, (error) => {
  console.log(error.reason); // "circular reference detected"
  console.log(error.path); // ["next"]
});
```

## Type Inference

mu-parser provides excellent TypeScript integration:

```typescript
// Types are automatically inferred
const userParser = combine((bind) => {
  const name = bind(parseField("name", parseStr)); // string
  const age = bind(parseField("age", parseNum)); // number
  const tags = bind(parseField("tags", parseList(parseStr))); // string[]

  return { name, age, tags }; // { name: string, age: number, tags: string[] }
});

// The result type is automatically known
const user = parse(userParser, data); // user has the correct type
```

## Next Steps

- [Error Handling](./error-handling) - Learn advanced error handling techniques
- [Best Practices](./best-practices) - Follow patterns for maintainable parsers
- [API Reference](/api/) - Explore all available parsers and combinators
