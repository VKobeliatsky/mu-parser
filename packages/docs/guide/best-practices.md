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
const parseUserPreferences = combine<UserPreferences>(({ bind }) => {
  const theme = bind(
    parseField("theme", parseLit("light").orElse(parseLit("dark"))),
  );
  const notifications = bind(parseField("notifications", parseBool));
  return { theme, notifications };
});

// ✅ Good: Explicit return type catches mismatches
const parseUser = combine<User>(({ bind }) => {
  const name = bind(parseField("name", parseStr));
  const age = bind(parseField("age", parseNum));
  const preferences = bind(parseField("preferences", parseUserPreferences));
  return { name, age, preferences };
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

## Build Custom Primitive Parsers

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
    const result = parse(userParser, input, (error) => [
      error.reason,
      error.path,
    ]);
    expect(result).toBe(["Invalid email format", ["email"]]);
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
