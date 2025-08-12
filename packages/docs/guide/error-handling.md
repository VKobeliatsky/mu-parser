# Error Handling

mu-parser provides comprehensive error handling with detailed path information to help you quickly identify and fix parsing issues.

## Basic Error Handling

When parsing fails, mu-parser throws a detailed error:

```typescript
import { parse, parseStr, parseNum } from "mu-parser";

try {
  parse(parseStr, 42);
} catch (error) {
  console.log(error.message);
  // "Parse error: string expected at path "
}
```

## Graceful Error Handling

Use the optional error handler to catch and transform errors:

```typescript
const result = parse(parseStr, 42, (error) => `Failed: ${error.reason}`);
// "Failed: string expected"
```

## Error Objects

Parse errors contain detailed information:

```typescript
parse(parseStr, 42, (error) => {
  console.log(error.reason); // "string expected"
  console.log(error.path); // [] (empty path for root level)
  return null;
});
```

## Path Information

For nested data, errors include the exact path where parsing failed:

```typescript
import { parseField, parseList, combine } from "mu-parser";

const data = {
  users: [
    { name: "Alice", age: 30 },
    { name: "Bob", age: "invalid" }, // Error here
  ],
};

const userParser = combine(({ bind }) => ({
  name: bind(parseField("name", parseStr)),
  age: bind(parseField("age", parseNum)),
}));

const usersParser = parseField("users", parseList(userParser));

parse(usersParser, data, (error) => {
  console.log(error.reason); // "number expected"
  console.log(error.path); // ["users", 1, "age"]

  // Build a human-readable path
  const pathString = error.path.map((p) => `'${String(p)}'`).join(".");
  console.log(`Error at ${pathString}: ${error.reason}`);
  // "Error at 'users'.'1'.'age': number expected"
});
```

## Custom Error Messages

Create parsers with custom error messages:

```typescript
import { fail, success } from "mu-parser";

const parseEmail = parseStr.andThen((str) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str) ? success(str) : fail("Invalid email format");
});

parse(parseEmail, "not-an-email", (error) => {
  console.log(error.reason); // "Invalid email format"
});
```

## Error Recovery Patterns

### Try Multiple Alternatives

```typescript
const flexibleParser = parseStr
  .orElse(parseNum.map(String)) // Convert number to string
  .orElse(success("default")); // Ultimate fallback

parse(flexibleParser, "hello"); // "hello"
parse(flexibleParser, 42); // "42"
parse(flexibleParser, null); // "default"
```

### Partial Success

TODO

## Debugging Tips

### Add Context to Errors

```typescript
const parseUserId = parseNum.andThen((id) =>
  id > 0 ? success(id) : fail(`Invalid user ID: ${id}. Must be positive.`),
);
```

### Log Parse Paths

```typescript
import { path } from "mu-parser";

const debugParser = combine(({ bind }) => {
  const currentPath = bind(path);
  console.log("Parsing at path:", currentPath);

  const name = bind(parseField("name", parseStr));
  return { name };
});
```

## Next Steps

- [Best Practices](./best-practices) - Learn patterns for maintainable parsers
- [API Reference](/api/) - Explore all error-related functions
