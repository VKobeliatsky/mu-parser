# Best Practices

Follow these patterns to build maintainable, reusable, and robust parsers with mu-parser.

## Building Reusable Parsers

Create reusable parsers for common patterns instead of repeating validation logic:

```typescript
import { parseStr, parseNum, success, fail } from "mu-parser";

// ✅ Good: Reusable parsers
const parsePositiveNumber = parseNum.andThen((n) =>
  n > 0 ? success(n) : fail("Number must be positive"),
);

const parseNonEmptyString = parseStr.andThen((s) =>
  s.length > 0 ? success(s) : fail("String cannot be empty"),
);

const parseEmail = parseStr.andThen((str) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str) ? success(str) : fail("Invalid email format");
});

// Now use them everywhere
const userParser = combine(({ bind }) => ({
  name: bind(parseField("name", parseNonEmptyString)),
  age: bind(parseField("age", parsePositiveNumber)),
  email: bind(parseField("email", parseEmail)),
}));
```

## Type Annotations

Be explicit about return types for complex parsers to catch errors early:

```typescript
interface User {
  name: string;
  age: number;
  preferences: UserPreferences;
}

interface UserPreferences {
  theme: "light" | "dark";
  notifications: boolean;
}

// ✅ Good: Explicit return type
const parseUserPreferences = combine(({ bind }): UserPreferences => {
  const theme = bind(
    parseField("theme", parseLit("light").orElse(parseLit("dark"))),
  );
  const notifications = bind(parseField("notifications", parseBool));
  return { theme, notifications };
});

// ✅ Good: Explicit return type catches mismatches
const parseUser = combine(({ bind }): User => {
  const name = bind(parseField("name", parseStr));
  const age = bind(parseField("age", parseNum));
  const preferences = bind(parseField("preferences", parseUserPreferences));
  return { name, age, preferences };
});
```

## Handle Optional Fields Consistently

Choose a consistent pattern for optional fields:

```typescript
// ✅ Option 1: Use .optional and provide defaults
const configParser = combine(({ bind }) => {
  const host = bind(parseField("host", parseStr));
  const port = bind(parseField("port", parseNum).optional);
  const timeout = bind(parseField("timeout", parseNum).optional);

  return {
    host,
    port: port ?? 3000, // Default port
    timeout: timeout ?? 5000, // Default timeout
  };
});

// ✅ Option 2: Use orElse with meaningful defaults
const configParser2 = combine(({ bind }) => {
  const host = bind(parseField("host", parseStr));
  const port = bind(parseField("port", parseNum).orElse(success(3000)));
  const timeout = bind(parseField("timeout", parseNum).orElse(success(5000)));

  return { host, port, timeout };
});
```

## Composition Over Complexity

Break complex parsers into smaller, focused pieces:

```typescript
// ❌ Bad: One giant parser
const messyParser = combine(({ bind }) => {
  const name = bind(
    parseField(
      "name",
      parseStr.andThen((s) =>
        s.length > 0 ? success(s) : fail("Name required"),
      ),
    ),
  );
  const email = bind(
    parseField(
      "email",
      parseStr.andThen((s) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(s) ? success(s) : fail("Invalid email");
      }),
    ),
  );
  const age = bind(
    parseField(
      "age",
      parseNum.andThen((n) =>
        n >= 18 ? success(n) : fail("Must be 18 or older"),
      ),
    ),
  );
  return { name, email, age };
});

// ✅ Good: Composed from smaller parsers
const parseName = parseNonEmptyString;
const parseEmail = parseStr.andThen(validateEmail);
const parseAdultAge = parseNum.andThen((age) =>
  age >= 18 ? success(age) : fail("Must be 18 or older"),
);

const userParser = combine(({ bind }) => ({
  name: bind(parseField("name", parseName)),
  email: bind(parseField("email", parseEmail)),
  age: bind(parseField("age", parseAdultAge)),
}));
```

## Error Messages

Write clear, actionable error messages:

```typescript
// ❌ Bad: Vague error messages
const badAgeParser = parseNum.andThen((n) =>
  n > 0 ? success(n) : fail("invalid"),
);

// ✅ Good: Clear, specific error messages
const goodAgeParser = parseNum.andThen((n) => {
  if (n < 0) return fail("Age cannot be negative");
  if (n > 150) return fail("Age must be less than 150");
  if (!Number.isInteger(n)) return fail("Age must be a whole number");
  return success(n);
});
```

## Organize Parser Modules

Structure your parsers in logical modules:

```typescript
// parsers/common.ts
export const parsePositiveNumber = parseNum.andThen((n) =>
  n > 0 ? success(n) : fail("Must be positive"),
);

export const parseEmail = parseStr.andThen(validateEmail);

// parsers/user.ts
import { parsePositiveNumber, parseEmail } from "./common";

export const parseUser = combine(({ bind }) => ({
  id: bind(parseField("id", parsePositiveNumber)),
  email: bind(parseField("email", parseEmail)),
  name: bind(parseField("name", parseNonEmptyString)),
}));

// parsers/product.ts
export const parseProduct = combine(({ bind }) => ({
  id: bind(parseField("id", parsePositiveNumber)),
  price: bind(parseField("price", parsePositiveNumber)),
  name: bind(parseField("name", parseNonEmptyString)),
}));
```

## Performance Considerations

### Avoid Creating Parsers in Loops

```typescript
// ❌ Bad: Creates new parsers on each iteration
function parseItems(expectedCount: number) {
  return parseList(
    combine(({ bind }) => {
      const id = bind(parseField("id", parseNum));
      // ... other fields
      return { id };
    }),
  );
}

// ✅ Good: Create parser once, reuse
const itemParser = combine(({ bind }) => {
  const id = bind(parseField("id", parseNum));
  // ... other fields
  return { id };
});

function parseItems(expectedCount: number) {
  return parseList(itemParser);
}
```

## Testing Patterns

Write comprehensive tests for your parsers:

```typescript
import { describe, test, expect } from "vitest";

describe("userParser", () => {
  test("parses valid user", () => {
    const input = { name: "Alice", age: 30, email: "alice@example.com" };
    const result = parse(userParser, input);
    expect(result).toEqual(input);
  });

  test("rejects invalid email", () => {
    const input = { name: "Alice", age: 30, email: "not-an-email" };
    const result = parse(userParser, input, (error) => error.reason);
    expect(result).toBe("Invalid email format");
  });

  test("provides detailed error paths", () => {
    const input = {
      name: "Alice",
      age: "not-a-number",
      email: "alice@example.com",
    };
    const result = parse(userParser, input, (error) => error);
    expect(result.path).toEqual(["age"]);
    expect(result.reason).toBe("number expected");
  });
});
```

## Migration and Versioning

Handle schema changes gracefully:

```typescript
// Support multiple versions
const parseUserV1 = combine(({ bind }) => ({
  name: bind(parseField("name", parseStr)),
  age: bind(parseField("age", parseNum)),
}));

const parseUserV2 = combine(({ bind }) => ({
  name: bind(parseField("name", parseStr)),
  age: bind(parseField("age", parseNum)),
  email: bind(parseField("email", parseEmail).optional), // New optional field
}));

// Flexible parser that handles both versions
const parseUserFlexible = parseUserV2.orElse(
  parseUserV1.map((user) => ({ ...user, email: undefined })),
);
```

## Next Steps

- [API Reference](/api/) - Explore all available parsers and combinators
