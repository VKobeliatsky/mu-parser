# Getting Started

mu-parser is a TypeScript-first parser combinator library for runtime data validation and parsing. Build type-safe parsers that validate unknown data and transform it into well-typed objects.

## What is mu-parser?

mu-parser provides a functional approach to data validation and parsing. Instead of schema definitions, you build parsers by composing smaller, reusable functions. This gives you:

- **Type Safety**: Full TypeScript support with automatic type inference
- **Composability**: Build complex parsers from simple, reusable components
- **Detailed Errors**: Get precise error messages with exact path information
- **Functional Design**: Clean monadic interface that's easy to reason about

## Installation

Install mu-parser using your preferred package manager:

::: code-group

```bash [npm]
npm install mu-parser
```

```bash [yarn]
yarn add mu-parser
```

```bash [pnpm]
pnpm add mu-parser
```

:::

## Simple Object Parsing

Let's parse a user object:

```typescript
import { parse, parseStr, parseNum, parseField, combine } from "mu-parser";

// Define what a user looks like
interface User {
  name: string;
  age: number;
}

// Build a parser for users
const userParser = combine<User>((bind) => {
  const name = bind(parseField("name", parseStr));
  const age = bind(parseField("age", parseNum));
  return { name, age };
});

// Parse some data
const userData = { name: "Bob", age: 25 };
const user = parse(userParser, userData);

console.log(user); // { name: "Bob", age: 25 } - fully typed!
```

## What's Happening Here?

1. **`combine`** - Lets you build complex parsers by combining simpler ones
2. **`bind`** - Extracts the value from a parser within a combine block
3. **`parseField`** - Parses a specific field from an object
4. **Type inference** - TypeScript knows the result is `User` automatically

## Handling Arrays

Parse arrays of data:

```typescript
import { parseList } from "mu-parser";

// Parse an array of strings
const tagsParser = parseList(parseStr);
const tags = parse(tagsParser, ["typescript", "parsing", "validation"]);
// Result: string[]

// Parse an array of users
const usersParser = parseList(userParser);
const users = parse(usersParser, [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
]);
// Result: User[]
```

## Optional Fields

Handle optional data:

```typescript
const configParser = combine((bind) => {
  const host = bind(parseField("host", parseStr));
  const port = bind(parseField("port", parseNum).optional); // Optional!
  return {
    host,
    port: port ?? 3000, // Provide default
  };
});

const config1 = parse(configParser, { host: "localhost", port: 8080 });
// { host: "localhost", port: 8080 }

const config2 = parse(configParser, { host: "localhost" });
// { host: "localhost", port: 3000 }
```

## Error Handling

When parsing fails, you get detailed information:

```typescript
const badData = { name: "Alice", age: "not a number" };

try {
  parse(userParser, badData);
} catch (error) {
  console.log(error.message);
  // "Parse error: number expected at path 'age'"
}

// Or handle errors gracefully
const result = parse(userParser, badData, (error) => {
  return { error: error.reason, path: error.path };
});
// { error: "number expected", path: ["age"] }
```

## Nested Objects

Parse complex nested structures:

```typescript
interface Address {
  street: string;
  city: string;
}

interface Person {
  name: string;
  address: Address;
}

const addressParser = combine<Address>((bind) => ({
  street: bind(parseField("street", parseStr)),
  city: bind(parseField("city", parseStr)),
}));

const personParser = combine<Person>((bind) => ({
  name: bind(parseField("name", parseStr)),
  address: bind(parseField("address", addressParser)),
}));

const person = parse(personParser, {
  name: "John",
  address: {
    street: "123 Main St",
    city: "Springfield",
  },
});
```

## Next Steps

- [Core Concepts](./core-concepts) - Understand parsers, combinators, and error handling
- [API Reference](/api/) - Explore all available parsers and combinators
