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

## Your First Parser

Let's start with a simple example:

```typescript
import { parse, parseStr, parseNum } from "mu-parser";

// Parse a string
const name = parse(parseStr, "Alice"); // string
console.log(name); // "Alice"

// Parse a number
const age = parse(parseNum, 30); // number
console.log(age); // 30
```

The `parse` function takes a parser and some unknown data, returning a typed result or throwing an error if parsing fails.

## Basic Validation

```typescript
import { parse, parseStr, parseNum } from "mu-parser";

// This works
const validString = parse(parseStr, "hello"); // ✅ "hello"

// This throws an error
try {
  const invalidString = parse(parseStr, 42); // ❌ throws error
} catch (error) {
  console.log(error.message); // "Parse error: string expected at path "
}
```

## Next Steps

- [Quick Start](./quick-start) - Learn the basics with hands-on examples
- [Core Concepts](./core-concepts) - Understand parsers, combinators, and error handling
