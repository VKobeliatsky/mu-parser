export interface Parser<T> {
  run(target: unknown, ctx: ParserCtx): T;
  andThen<R>(f: (a: T) => Parser<R>): Parser<R>;
  orElse<R>(parser: Parser<R>): Parser<T | R>;
  map<R>(f: (t: T) => R): Parser<R>;
  readonly optional: Parser<undefined | T>;
}

class ParserCtx {
  static empty = new ParserCtx();
  constructor(
    private readonly path: (string | number | symbol)[] = [],
    private readonly visited: Set<unknown> = new Set(),
  ) {}

  getPath() {
    return [...this.path];
  }

  visit(target: unknown) {
    if (this.visited.has(target)) {
      throw this.parseError("circular reference detected");
    }
    return new ParserCtx(this.path, new Set([...this.visited, target]));
  }

  pushPath(name: string | number | symbol) {
    return new ParserCtx([...this.path, name], this.visited);
  }

  parseError(reason: string) {
    return new ParseError(reason, this.path);
  }
}

class ParseError {
  constructor(
    public readonly reason: string,
    public readonly path: (string | number | symbol)[],
  ) {}
}

export const parser = <T>(
  run: (target: unknown, ctx: ParserCtx) => T,
): Parser<T> => ({
  run,
  andThen: (f) =>
    parser((target, ctx) => {
      const a = run(target, ctx);
      return f(a).run(target, ctx);
    }),
  orElse: (p) =>
    parser((target, ctx) => {
      try {
        return run(target, ctx);
      } catch (e) {
        if (e instanceof ParseError) {
          return p.run(target, ctx);
        }
        throw e;
      }
    }),

  map: (f) => parser((target, ctx) => f(run(target, ctx))),
  get optional() {
    return this.orElse(success(undefined));
  },
});

export function parse<T>(parser: Parser<T>, target: unknown): T;
export function parse<T1, T2>(
  parser: Parser<T1>,
  target: unknown,
  onError: (error: ParseError) => T2,
): T1 | T2;
export function parse<T1, T2>(
  parser: Parser<T1>,
  target: unknown,
  onError?: (error: ParseError) => T2,
): T1 | T2 {
  try {
    return parser.run(target, ParserCtx.empty);
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
  parser((target, ctx) => {
    const combineCtx: CombineCtx = {
      bind: (parser) => parser.run(target, ctx),
    };
    return parsers(combineCtx);
  });

export const path = parser((_, ctx) => ctx.getPath());
export const success = <T>(val: T) => parser(() => val);
export const fail = (reason: string) =>
  parser((_, ctx) => {
    throw ctx.parseError(reason);
  });
