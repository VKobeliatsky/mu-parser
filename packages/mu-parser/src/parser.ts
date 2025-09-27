/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Parser<T, S> {
  run(ctx: ParserState<S>): [T, ParserState<S>];
  map<R>(f: (t: T) => R): Parser<R, S>;
  andThen<R>(f: (a: T) => Parser<R, S>): Parser<R, S>;
  recover<R>(fn: (err: ParseError) => Parser<R, S>): Parser<T | R, S>;
  orElse<R>(other: Parser<R, S>): Parser<T | R, S>;
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

  getPath(): (string | number | symbol)[] {
    return [...this.path];
  }

  updateState(updater: (state: S) => S): ParserState<S> {
    return new ParserState(
      this.input,
      this.path,
      this.visited,
      updater(this.state),
    );
  }

  visiting(path: string | symbol | number, target: unknown): ParserState<S> {
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

  parseError(reason: string): never {
    throw new ParseError(reason, this.path);
  }
}

export class ParseError {
  static handle<T>(fn: () => T, handler: (e: ParseError) => T): T {
    try {
      return fn();
    } catch (error) {
      if (error instanceof ParseError) {
        return handler(error);
      } else {
        throw error;
      }
    }
  }
  constructor(
    public readonly reason: string,
    public readonly path: ReadonlyArray<string | number | symbol>,
  ) {}
}

export const parser = <T, S = any>(
  run: (ctx: ParserState<S>) => [T, ParserState<S>],
): Parser<T, S> => {
  const self: Parser<T, S> = {
    run,
    map: (f) =>
      parser((ctx) => {
        const [res, newCtx] = run(ctx);
        return [f(res), newCtx];
      }),
    andThen: <R>(f: (a: T) => Parser<R, S>) =>
      parser((ctx) => {
        const [a, newCtx] = run(ctx);
        return f(a).run(newCtx);
      }),
    recover: <R>(fn: (err: ParseError) => Parser<R, S>): Parser<T | R, S> =>
      parser((ctx) =>
        ParseError.handle<[T | R, ParserState<S>]>(
          () => run(ctx),
          (e) => fn(e).run(ctx),
        ),
      ),
    orElse: <R>(other: Parser<R, S>) => self.recover(() => other),
    get optional() {
      return self.orElse(success(undefined));
    },
  };

  return self;
};

interface ParserBind<S> {
  <R>(parser: Parser<R, S>): R;
}

export const combine = <T, S = void>(
  parsers: (bind: ParserBind<S>) => T,
): Parser<T, S> =>
  parser((state) => {
    return [
      parsers((parser) => {
        const [res, nextState] = parser.run(state);
        state = nextState;
        return res;
      }),
      state,
    ];
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
  parser: Parser<T1, S | void>,
  { input, initialState }: { input: unknown; initialState?: S },
  onError?: (error: ParseError) => T2,
): T1 | T2 {
  return ParseError.handle<T1 | T2>(
    () => parser.run(ParserState.empty(input, initialState))[0],
    (e) => {
      if (onError) {
        return onError(e);
      }
      throw new Error(
        `Parse error: ${e.reason} at path ${e.path.map((p) => `'${String(p)}'`).join(".")}`,
      );
    },
  );
}

export const path = parser<ReadonlyArray<string | number | symbol>>((ctx) => [
  [...ctx.path] as const,
  ctx,
]);
export const success = <T, S>(val: T): Parser<T, S> =>
  parser((ctx) => [val, ctx]);
export const fail = <S>(reason: string): Parser<never, S> =>
  parser((ctx) => {
    return ctx.parseError(reason);
  });

export const updateState = <S>(updater: (state: S) => S) => {
  return parser<S, S>((ctx) => {
    const newCtx = ctx.updateState(updater);
    return [newCtx.state, newCtx];
  });
};

export const getState = <S>() => parser<S, S>((ctx) => [ctx.state, ctx]);

export const withState = <S>(
  _combine: <T>(parsers: (ctx: ParserBind<S>) => T) => Parser<T, S>,
) => _combine;
