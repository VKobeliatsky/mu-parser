export interface Parser<T> {
  run(ctx: ParserState): [T, ParserState];
  andThen<R>(f: (a: T) => Parser<R>): Parser<R>;
  orElse<R>(parser: Parser<R>): Parser<T | R>;
  map<R>(f: (t: T) => R): Parser<R>;
  readonly optional: Parser<undefined | T>;
}

class ParserState {
  static empty(input: unknown) {
    return new ParserState(input, [], new Set());
  }

  protected constructor(
    readonly input: unknown,
    readonly path: ReadonlyArray<string | number | symbol>,
    private readonly visited: Set<unknown>,
  ) {}

  getPath() {
    return [...this.path];
  }

  visiting(path: string | symbol | number, target: unknown) {
    if (this.visited.has(target)) {
      throw this.parseError("circular reference detected");
    }
    return new ParserState(
      target,
      [...this.path, path],
      new Set([...this.visited, target]),
    );
  }

  parseError(reason: string) {
    return new ParseError(reason, this.path);
  }
}

class ParseError {
  constructor(
    public readonly reason: string,
    public readonly path: ReadonlyArray<string | number | symbol>,
  ) {}
}

export const parser = <T>(
  run: (ctx: ParserState) => [T, ParserState],
): Parser<T> => ({
  run,
  andThen: <R>(f: (a: T) => Parser<R>) =>
    parser((ctx) => {
      const [a, newCtx] = run(ctx);
      return f(a).run(newCtx);
    }),
  orElse: <R>(p: Parser<R>) =>
    parser((ctx) => {
      let result: T | R;
      let nextCtx: ParserState;

      try {
        const [t, tCtx] = run(ctx);
        result = t;
        nextCtx = tCtx;
      } catch (e) {
        if (e instanceof ParseError) {
          const [r, rCtx] = p.run(ctx);
          result = r;
          nextCtx = rCtx;
        } else {
          throw e;
        }
      }

      return [result, nextCtx];
    }),

  map: (f) =>
    parser((ctx) => {
      const [res, newCtx] = run(ctx);
      return [f(res), newCtx];
    }),
  get optional() {
    return this.orElse(success(undefined));
  },
});

export function parse<T>(parser: Parser<T>, input: unknown): T;
export function parse<T1, T2>(
  parser: Parser<T1>,
  input: unknown,
  onError: (error: ParseError) => T2,
): T1 | T2;
export function parse<T1, T2>(
  parser: Parser<T1>,
  input: unknown,
  onError?: (error: ParseError) => T2,
): T1 | T2 {
  try {
    return parser.run(ParserState.empty(input))[0];
  } catch (e) {
    if (e instanceof ParseError) {
      if (onError) {
        return onError(e);
      }
      throw new Error(
        `Parse error: ${e.reason} at path ${e.path.map((p) => `'${String(p)}'`).join(".")}`,
      );
    }
    throw e;
  }
}

interface CombineCtx {
  bind: <R>(parser: Parser<R>) => R;
}

export const combine = <T>(parsers: (ctx: CombineCtx) => T): Parser<T> =>
  parser((ctx) => {
    return [
      parsers({
        bind: (parser) => {
          const [res, newCtx] = parser.run(ctx);
          ctx = newCtx;
          return res;
        },
      }),
      ctx,
    ];
  });

export const path: Parser<ReadonlyArray<string | number | symbol>> = parser(
  (ctx) => [[...ctx.path] as const, ctx],
);
export const success = <T>(val: T): Parser<T> => parser((ctx) => [val, ctx]);
export const fail = (reason: string): Parser<never> =>
  parser((ctx) => {
    throw ctx.parseError(reason);
  });
