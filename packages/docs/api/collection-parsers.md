# Collection Parsers

Parsers for handling arrays, objects, and their fields.

## Array Parsers

### `parseList`

Parse arrays where each element is validated by the same parser.

```typescript
function parseList<T>(itemParser: Parser<T>): Parser<T[]>;
```

**Parameters:**

- `itemParser` - Parser to apply to each array element

**Example:**

```typescript
// Array of strings
const stringList = parseList(parseStr);
parse(stringList, ["a", "b", "c"]); // ["a", "b", "c"]
parse(stringList, ["a", 42, "c"]); // throws ParseError at index 1

// Array of numbers
const numberList = parseList(parseNum);
parse(numberList, [1, 2, 3]); // [1, 2, 3]

// Array of objects
const userList = parseList(userParser);
parse(userList, [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
]); // User[]
```

**Error Handling:**
Errors include the array index in the path:

```typescript
parse(parseList(parseNum), [1, "invalid", 3], (error) => error.path); // [1] - error at index 1
```

## Object Field Parsers

### `parseField`

Extract and parse a specific field from an object.

```typescript
function parseField<T>(
  name: string | number | symbol,
  fieldParser: Parser<T>,
): Parser<T>;
```

**Parameters:**

- `name` - The field name/key to extract
- `fieldParser` - Parser to apply to the field value

**Example:**

```typescript
// String fields
const nameParser = parseField("name", parseStr);
parse(nameParser, { name: "Alice", age: 30 }); // "Alice"

// Number fields
const ageParser = parseField("age", parseNum);
parse(ageParser, { name: "Alice", age: 30 }); // 30

// Nested objects
const addressParser = parseField("address", parseObj);
parse(addressParser, {
  name: "Alice",
  address: { street: "123 Main St" },
}); // { street: "123 Main St" }
```

**Different Key Types:**

```typescript
// String keys
parseField("name", parseStr);

// Number keys (array indices)
parseField(0, parseStr); // First element of array

// Symbol keys
const sym = Symbol("key");
parseField(sym, parseNum);
```

**Error Handling:**

```typescript
// Missing field
parse(
  parseField("missing", parseStr),
  { name: "Alice" },
  (error) => error.reason,
); // "property 'missing' expected"

// Wrong type in field
parse(parseField("age", parseNum), { age: "not a number" }, (error) => [
  error.reason,
  error.path,
]); // ["number expected", ["age"]]
```

## Nested Object Parsing

### Complex Object Structures

Use `combine` with `parseField` to parse complex objects:

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
  tags: string[];
}

const addressParser = combine(
  ({ bind }): Address => ({
    street: bind(parseField("street", parseStr)),
    city: bind(parseField("city", parseStr)),
    zipCode: bind(parseField("zipCode", parseStr)),
  }),
);

const personParser = combine(
  ({ bind }): Person => ({
    name: bind(parseField("name", parseStr)),
    age: bind(parseField("age", parseNum)),
    address: bind(parseField("address", addressParser)),
    tags: bind(parseField("tags", parseList(parseStr))),
  }),
);

const person = parse(personParser, {
  name: "John",
  age: 30,
  address: {
    street: "123 Main St",
    city: "Springfield",
    zipCode: "12345",
  },
  tags: ["developer", "typescript"],
});
```

### Optional Fields

Handle optional object fields:

```typescript
const configParser = combine(({ bind }) => {
  const host = bind(parseField("host", parseStr));
  const port = bind(parseField("port", parseNum).optional);
  const ssl = bind(parseField("ssl", parseBool).optional);

  return {
    host,
    port: port ?? 3000, // Default port
    ssl: ssl ?? false, // Default SSL
  };
});

// Works with missing optional fields
parse(configParser, { host: "localhost" });
// { host: "localhost", port: 3000, ssl: false }

// Works with provided optional fields
parse(configParser, { host: "localhost", port: 8080, ssl: true });
// { host: "localhost", port: 8080, ssl: true }
```

## Dynamic Field Parsing

### Conditional Fields

Parse different fields based on a discriminator:

```typescript
interface Dog {
  type: "dog";
  breed: string;
  goodBoy: boolean;
}

interface Cat {
  type: "cat";
  breed: string;
  livesLeft: number;
}

type Pet = Dog | Cat;

const petParser = combine(({ bind }): Pet => {
  const type = bind(parseField("type", parseStr));
  const breed = bind(parseField("breed", parseStr));

  if (type === "dog") {
    const goodBoy = bind(parseField("goodBoy", parseBool));
    return { type: "dog", breed, goodBoy };
  } else if (type === "cat") {
    const livesLeft = bind(parseField("livesLeft", parseNum));
    return { type: "cat", breed, livesLeft };
  } else {
    return bind(fail(`Unknown pet type: ${type}`));
  }
});
```

### All Fields of Same Type

Parse all fields of an object with the same parser:

```typescript
const parseStringRecord = parser((target, ctx) => {
  const obj = parseObj.run(target, ctx);
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    result[key] = parseStr.run(value, ctx.pushPath(key));
  }

  return result;
});

parse(parseStringRecord, { a: "hello", b: "world" });
// { a: "hello", b: "world" }
```

## Array of Objects

Common patterns for parsing arrays of objects:

```typescript
// Array of users
const usersParser = parseList(
  combine(({ bind }) => ({
    id: bind(parseField("id", parseNum)),
    name: bind(parseField("name", parseStr)),
    email: bind(parseField("email", parseEmail).optional),
  })),
);

// Array of mixed objects
const itemsParser = parseList(
  combine(({ bind }) => {
    const type = bind(parseField("type", parseStr));
    const name = bind(parseField("name", parseStr));

    switch (type) {
      case "product":
        const price = bind(parseField("price", parseNum));
        return { type: "product", name, price };
      case "service":
        const duration = bind(parseField("duration", parseStr));
        return { type: "service", name, duration };
      default:
        return bind(fail(`Unknown item type: ${type}`));
    }
  }),
);
```

## Nested Arrays

Handle arrays within arrays:

```typescript
// Array of arrays
const matrixParser = parseList(parseList(parseNum));
parse(matrixParser, [
  [1, 2],
  [3, 4],
  [5, 6],
]); // number[][]

// Objects with nested arrays
const classParser = combine(({ bind }) => ({
  name: bind(parseField("name", parseStr)),
  students: bind(
    parseField(
      "students",
      parseList(
        combine(({ bind }) => ({
          name: bind(parseField("name", parseStr)),
          grades: bind(parseField("grades", parseList(parseNum))),
        })),
      ),
    ),
  ),
}));
```

## Error Path Tracking

Collection parsers provide detailed error paths:

```typescript
const data = {
  users: [
    { name: "Alice", age: 30 },
    { name: "Bob", age: "invalid" }, // Error here
    { name: "Charlie", age: 25 },
  ],
};

const usersParser = parseField(
  "users",
  parseList(
    combine(({ bind }) => ({
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

## Performance Tips

### Reuse Parsers

```typescript
// ✅ Good: Create parser once, reuse
const itemParser = combine(({ bind }) => ({
  id: bind(parseField("id", parseNum)),
  name: bind(parseField("name", parseStr)),
}));

const listParser = parseList(itemParser);

// ❌ Bad: Creating parser in loop
function parseItems(items: unknown) {
  return parse(
    parseList(
      combine(({ bind }) => ({
        id: bind(parseField("id", parseNum)),
        name: bind(parseField("name", parseStr)),
      })),
    ),
    items,
  );
}
```

### Shallow vs Deep Parsing

```typescript
// Parse only what you need
const shallowUserParser = combine(({ bind }) => ({
  id: bind(parseField("id", parseNum)),
  name: bind(parseField("name", parseStr)),
  // Skip complex nested fields if not needed
}));
```

## See Also

- [Basic Parsers](./basic-parsers) - For primitive types
- [Parser Combinators](./combinators) - For advanced combination patterns
