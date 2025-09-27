# mu-parser

A TypeScript-first parser combinator library for runtime data validation and parsing. Build type-safe parsers that validate unknown data and transform it into well-typed objects.

## Features

- 🔒 **Type-safe**: Full TypeScript support with automatic type inference
- 🧩 **Composable**: Build complex parsers from simple, reusable components
- 🎯 **Functional**: Clean monadic interface with `map`, `andThen`, `orElse`
- 🐛 **Detailed errors**: Precise error reporting with full path information
- 🔄 **Circular detection**: Automatic detection of circular references
- ⚡ **Zero dependencies**: Lightweight with no external dependencies

## Installation

```bash
npm install mu-parser
# or
yarn add mu-parser
# or
pnpm add mu-parser
```

## Quick Start

```typescript
import { parse, parseStr, parseNum, parseField, combine } from "mu-parser";

interface Address {
  street: string;
  city: string;
  zipCode: string;
}

interface Person {
  name: string;
  age: number;
  address: Address;
}

const addressParser = combine<Address>((bind) => {
  const street: = bind(parseField("street", parseStr));
  const city = bind(parseField("city", parseStr));
  const zipCode = bind(parseField("zipCode", parseStr));

  return { street, cite, zipCode };
});

const personParser = combine<Person>((bind) => {
  const name = bind(parseField("name", parseStr));
  const age = bind(parseField("age", parseNum));
  const address = bind(parseField("address", addressParser));

  return { name, age, address };
});

const person = parse(personParser, {
  name: "John",
  age: 30,
  address: {
    street: "123 Main St",
    city: "Springfield",
    zipCode: "12345",
  },
});
// Result: { name: "John", age: 30, address: { ... } } with full type safety
```

## Core Concepts

### Parsers

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

### Combining Parsers

Use `combine` to build complex parsers from simpler ones:

```typescript
import { combine, parseField, parseStr, parseNum, parseList } from "mu-parser";

interface User {
  name: string;
  age: number;
  hobbies: string[];
}

const userParser = combine<User>((bind) => {
  const name = bind(parseField("name", parseStr));
  const age = bind(parseField("age", parseNum));
  const hobbies = bind(parseField("hobbies", parseList(parseStr)));
  return { name, age, hobbies };
});

const user = parse(userParser, {
  name: "Alice",
  age: 30,
  hobbies: ["reading", "swimming"],
});
```

### Error Handling

Parsers provide detailed error information including the exact path where parsing failed:

```typescript
import { parse, parseField, parseNum } from "mu-parser";

// This will throw a detailed error
try {
  parse(parseField("age", parseNum), { age: "not a number" });
} catch (error) {
  console.log(error.message);
  // "Parse error: number expected at path 'age'"
}

// Or handle errors gracefully
const result = parse(
  parseField("age", parseNum),
  { age: "not a number" },
  (error) => `Error: ${error.reason} at ${error.path.join(".")}`,
);
// "Error: number expected at age"
```

## API Reference

### Basic Parsers

```typescript
import { parseStr, parseNum, parseLit, parseNull, parseObj } from "mu-parser";

parseStr; // Parser<string>
parseNum; // Parser<number>
parseLit("hello"); // Parser<"hello"> - literal value
parseNull; // Parser<null>
parseObj; // Parser<Record<string | number | symbol, unknown>>
```

### Collection Parsers

```typescript
import { parseList, parseField } from "mu-parser";

// Parse arrays
const numbersParser = parseList(parseNum);
parse(numbersParser, [1, 2, 3]); // number[]

// Parse object fields
const nameParser = parseField("name", parseStr);
parse(nameParser, { name: "Alice" }); // string
```

### Parser Combinators

```typescript
// Optional parsing
const optionalName = parseStr.optional;
parse(optionalName, null); // undefined
parse(optionalName, "Alice"); // "Alice"

// Alternative parsing
const stringOrNumber = parseStr.orElse(parseNum);
parse(stringOrNumber, "hello"); // "hello"
parse(stringOrNumber, 42); // 42

// Transform results
const upperCaseName = parseStr.map((s) => s.toUpperCase());
parse(upperCaseName, "alice"); // "ALICE"

// Chain parsers
const validatedAge = parseNum.andThen((age) =>
  age >= 0 ? success(age) : fail("Age must be non-negative"),
);
```

## Examples

### Basic Validation

```typescript
import { parse, parseStr, parseNum, parseLit } from "mu-parser";

// Validate specific values
const statusParser = parseLit("active").orElse(parseLit("inactive"));
const status = parse(statusParser, "active"); // "active"

// Optional fields
const configParser = combine((bind) => {
  const host = bind(parseField("host", parseStr));
  const port = bind(parseField("port", parseNum).optional);
  return { host, port: port ?? 3000 };
});
```

### Nested Objects

```typescript
interface Address {
  street: string;
  city: string;
  zipCode: string;
}

interface Person {
  name: string;
  age: number;
  address: Address;
}

const addressParser = combine<Address>((bind) => ({
  street: bind(parseField("street", parseStr)),
  city: bind(parseField("city", parseStr)),
  zipCode: bind(parseField("zipCode", parseStr)),
}));

const personParser = combine<Person>((bind) => ({
  name: bind(parseField("name", parseStr)),
  age: bind(parseField("age", parseNum)),
  address: bind(parseField("address", addressParser)),
}));

const person = parse(personParser, {
  name: "John",
  age: 30,
  address: {
    street: "123 Main St",
    city: "Springfield",
    zipCode: "12345",
  },
});
```

### Arrays and Lists

```typescript
import { parseList, parseField, combine } from "mu-parser";

// Array of primitives
const tagsParser = parseList(parseStr);
const tags = parse(tagsParser, ["typescript", "parsing", "validation"]);

// Array of objects
const itemParser = combine((bind) => ({
  id: bind(parseField("id", parseNum)),
  name: bind(parseField("name", parseStr)),
  price: bind(parseField("price", parseNum)),
}));

const cartParser = parseList(itemParser);
const cart = parse(cartParser, [
  { id: 1, name: "Apple", price: 1.5 },
  { id: 2, name: "Banana", price: 0.75 },
]);
```

### Union Types

```typescript
interface StringValue {
  type: "string";
  value: string;
}

interface NumberValue {
  type: "number";
  value: number;
}

type Value = StringValue | NumberValue;

const valueParser = combine<Value>((bind) => {
  const type = bind(parseField("type", parseStr));

  if (type === "string") {
    const value = bind(parseField("value", parseStr));
    return { type: "string", value } as const;
  } else if (type === "number") {
    const value = bind(parseField("value", parseNum));
    return { type: "number", value } as const;
  } else {
    return bind(fail(`Unknown type: ${type}`));
  }
});

const result = parse(valueParser, { type: "string", value: "hello" });
// { type: "string", value: "hello" }
```

### Recursive Structures

```typescript
interface TreeNode {
  value: string;
  children?: TreeNode[];
}

const treeParser = combine<TreeNode>((bind) => {
  const value = bind(parseField("value", parseStr));
  const children = bind(parseField("children", parseList(treeParser)).optional);
  return { value, children };
});

const tree = parse(treeParser, {
  value: "root",
  children: [
    { value: "child1" },
    {
      value: "child2",
      children: [{ value: "grandchild1" }],
    },
  ],
});
```

### Custom Validation

```typescript
import { parser, success, fail } from "mu-parser";

// Custom email validator
const parseEmail = parseStr.andThen((str) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str) ? success(str) : fail("Invalid email format");
});

// Custom range validator
const parseRange = (min: number, max: number) =>
  parseNum.andThen((num) =>
    num >= min && num <= max
      ? success(num)
      : fail(`Number must be between ${min} and ${max}`),
  );

const ageParser = parseRange(0, 120);
const age = parse(ageParser, 25); // 25
```

## Error Handling

### Path Information

When parsing fails, you get detailed path information:

```typescript
const data = {
  users: [
    { name: "Alice", age: 30 },
    { name: "Bob", age: "invalid" }, // Error here
  ],
};

const usersParser = parseField(
  "users",
  parseList(
    combine((bind) => ({
      name: bind(parseField("name", parseStr)),
      age: bind(parseField("age", parseNum)),
    })),
  ),
);

parse(usersParser, data, (error) => {
  console.log(error.reason); // "number expected"
  console.log(error.path); // ["users", 1, "age"]
});
```

### Graceful Error Handling

```typescript
// Provide default values on error
const safeParser = parseNum.orElse(success(0));
const result = parse(safeParser, "not a number"); // 0

// Custom error handling
const result2 = parse(parseNum, "not a number", (error) => ({
  error: error.reason,
  path: error.path,
}));
// { error: "number expected", path: [] }
```

## Best Practices

### 1. Build Reusable Parsers

```typescript
// Create reusable parsers for common patterns
const parsePositiveNumber = parseNum.andThen((n) =>
  n > 0 ? success(n) : fail("Number must be positive"),
);

const parseNonEmptyString = parseStr.andThen((s) =>
  s.length > 0 ? success(s) : fail("String cannot be empty"),
);
```

### 2. Use Type Annotations

```typescript
// Be explicit about return types for complex parsers
const parseUser = combine((bind): User => {
  // implementation
});
```

### 3. Handle Optional Fields Consistently

```typescript
// Prefer using .optional over orElse(success(undefined))
const optionalField = parseField("optional", parseStr).optional;

// Or provide meaningful defaults
const withDefault = parseField("count", parseNum).orElse(success(0));
```

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## License

MIT License - see LICENSE file for details.
