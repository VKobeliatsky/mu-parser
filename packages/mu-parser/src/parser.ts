/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Parser<T, S> {
  run(ctx: ParserState<S>): [T, ParserState<S>];
  andThen<R>(f: (a: T) => Parser<R, S>): Parser<R, S>;
  orElse<R>(recover: (err: ParseError) => Parser<R, S>): Parser<T | R, S>;
  map<R>(f: (t: T) => R): Parser<R, S>;
  readonly optional: Parser<undefined | T, S>;
}

class ParserState<S> {
  static empty<S>(input: unknown, initialState: S) {
    return new ParserState<S>(input, [], new Set(), initialState);
  }

  protected constructor(
    readonly input: unknown,
    readonly path: ReadonlyArray<string | number | symbol>,
    private readonly visited: Set<unknown>,
    readonly state: S,
  ) {}

  getPath() {
    return [...this.path];
  }

  updateState(updater: (state: S) => S) {
    return new ParserState(
      this.input,
      this.path,
      this.visited,
      updater(this.state),
    );
  }

  visiting(path: string | symbol | number, target: unknown) {
    if (this.visited.has(target)) {
      throw this.parseError("circular reference detected");
    }
    return new ParserState(
      target,
      [...this.path, path],
      new Set([...this.visited, target]),
      this.state,
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

export const parser = <T, S = any>(
  run: (ctx: ParserState<S>) => [T, ParserState<S>],
): Parser<T, S> => ({
  run,
  andThen: <R>(f: (a: T) => Parser<R, S>) =>
    parser((ctx) => {
      const [a, newCtx] = run(ctx);
      return f(a).run(newCtx);
    }),
  orElse: <R>(recover: (err: ParseError) => Parser<R, S>) =>
    parser((ctx) => {
      let result: T | R;
      let nextCtx: ParserState<S>;

      try {
        const [t, tCtx] = run(ctx);
        result = t;
        nextCtx = tCtx;
      } catch (e) {
        if (e instanceof ParseError) {
          const [r, rCtx] = recover(e).run(ctx);
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
    return this.orElse(() => success(undefined));
  },
});

export function parse<T>(
  parser: Parser<T, void>,
  params: { input: unknown },
): T;
export function parse<T, S>(
  parser: Parser<T, S>,
  params: { input: unknown; initialState: S },
): T;
export function parse<T1, T2>(
  parser: Parser<T1, void>,
  params: { input: unknown },
  onError: (error: ParseError) => T2,
): T1 | T2;
export function parse<T1, T2, S>(
  parser: Parser<T1, S>,
  params: { input: unknown; initialState: S },
  onError: (error: ParseError) => T2,
): T1 | T2;
export function parse<T1, T2, S>(
  parser: Parser<T1, S>,
  { input, initialState }: { input: unknown; initialState?: S },
  onError?: (error: ParseError) => T2,
): T1 | T2 {
  try {
    return parser.run(
      ParserState.empty(input, initialState) as ParserState<S>,
    )[0];
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

interface CombineParsersCtx<S> {
  bind: <R>(parser: Parser<R, S>) => R;
}

export const combine = <T, S = void>(
  parsers: (ctx: CombineParsersCtx<S>) => T,
): Parser<T, S> =>
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

export const path = parser<ReadonlyArray<string | number | symbol>>((ctx) => [
  [...ctx.path] as const,
  ctx,
]);
export const success = <T, S>(val: T): Parser<T, S> =>
  parser((ctx) => [val, ctx]);
export const fail = <S>(reason: string): Parser<never, S> =>
  parser((ctx) => {
    throw ctx.parseError(reason);
  });

export const updateState = <S>(updater: (state: S) => S) => {
  return parser<S, S>((ctx) => {
    const newCtx = ctx.updateState(updater);
    return [newCtx.state, newCtx];
  });
};

export const getState = <S>() => parser<S, S>((ctx) => [ctx.state, ctx]);

export const withState = <S>(
  _combine: <T>(parsers: (ctx: CombineParsersCtx<S>) => T) => Parser<T, S>,
) => _combine;
