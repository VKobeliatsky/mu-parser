---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "&micro;-parser"
  text: "TypeScript-first parser combinators"
  tagline: Build type-safe parsers that validate unknown data and transform it into well-typed objects
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/

features:
  - title: 🔒 Type-safe
    details: Full TypeScript support with automatic type inference. Know exactly what types you're working with at compile time.
  - title: 🧩 Composable
    details: Build complex parsers from simple, reusable components using functional composition patterns.
  - title: 🐛 Detailed Errors
    details: Get precise error reporting with full path information to quickly identify and fix parsing issues.
  - title: 🎯 Functional
    details: Clean monadic interface with map, andThen, orElse methods for elegant parser composition.
  - title: 🔄 Circular Detection
    details: Automatic detection of circular references prevents infinite loops in recursive data structures.
  - title: ⚡ Zero Dependencies
    details: Lightweight library with no external dependencies, perfect for any TypeScript project.
---

## Gettings Started

```typescript
import { parse, combine, parseStr, parseNum, parseField } from "mu-parser";

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

const addressParser = combine<Address>(({ bind }) => {
  const street: = bind(parseField("street", parseStr));
  const city = bind(parseField("city", parseStr));
  const zipCode = bind(parseField("zipCode", parseStr));

  return { street, cite, zipCode };
});

const personParser = combine<Person>(({ bind }) => {
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
```
