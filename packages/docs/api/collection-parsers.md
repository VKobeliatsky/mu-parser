# Collection Parsers

Parsers for handling arrays, objects, and their fields.

## `parseList`

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

## `parseField`

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

## Example: Nested Object Parsing

```typescript
// Array of arrays
const matrixParser = parseList(parseList(parseNum));
parse(matrixParser, [
  [1, 2],
  [3, 4],
  [5, 6],
]); // number[][]

// Objects with nested arrays
const classParser = combine((bind) => ({
  name: bind(parseField("name", parseStr)),
  students: bind(
    parseField(
      "students",
      parseList(
        combine((bind) => ({
          name: bind(parseField("name", parseStr)),
          grades: bind(parseField("grades", parseList(parseNum))),
        })),
      ),
    ),
  ),
}));
```

## See Also

- [Basic Parsers](./basic-parsers) - For primitive types
- [Parser Combinators](./combinators) - For advanced combination patterns
