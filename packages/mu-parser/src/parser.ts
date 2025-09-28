/* eslint-disable @typescript-eslint/no-explicit-any */
import { ParserError } from "./parser-error";
import { parserError, parserResult } from "./parser-ops";
import { ParserState } from "./parser-state";

export type ParserResult<T, S> = readonly [T, ParserState<S>];

export interface Parser<T, S> {
  run(ctx: ParserState<S>): ParserResult<T, S>;
  map<R>(f: (t: T) => R): Parser<R, S>;
  andThen<R>(f: (a: T) => Parser<R, S>): Parser<R, S>;
  recover<R>(fn: (err: ParserError) => Parser<R, S>): Parser<T | R, S>;
  orElse<R>(other: Parser<R, S>): Parser<T | R, S>;
  readonly optional: Parser<undefined | T, S>;
}

export const parser = <T, S = any>(
  run: (ctx: ParserState<S>) => ParserResult<T, S>,
): Parser<T, S> => {
  const self: Parser<T, S> = {
    run,
    map: (f) =>
      parser((ctx) => {
        const [res, newCtx] = run(ctx);
        return parserResult(f(res), newCtx);
      }),
    andThen: <R>(f: (a: T) => Parser<R, S>) =>
      parser((ctx) => {
        const [a, newCtx] = run(ctx);
        return f(a).run(newCtx);
      }),
    recover: <R>(fn: (err: ParserError) => Parser<R, S>): Parser<T | R, S> =>
      parser((ctx) =>
        ParserError.attempt<readonly [T | R, ParserState<S>]>(
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
  parser((state) =>
    parserResult(
      parsers((parser) => {
        const [res, nextState] = parser.run(state);
        state = nextState;
        return res;
      }),
      state,
    ),
  );

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
  onError: (error: {
    reason: string;
    path: ReadonlyArray<string | number | symbol>;
  }) => T2,
): T1 | T2;
export function parse<T1, T2, S>(
  parser: Parser<T1, S>,
  params: { input: unknown; initialState: S },
  onError: (error: {
    reason: string;
    path: ReadonlyArray<string | number | symbol>;
  }) => T2,
): T1 | T2;
export function parse<T1, T2, S>(
  parser: Parser<T1, S | void>,
  { input, initialState }: { input: unknown; initialState?: S },
  onError?: (error: {
    reason: string;
    path: ReadonlyArray<string | number | symbol>;
  }) => T2,
): T1 | T2 {
  return ParserError.attempt<T1 | T2>(
    () => parser.run(ParserState.empty(input, initialState))[0],
    (error) => {
      if (onError) {
        return onError({ reason: error.reason, path: error.path });
      }
      throw new Error(
        `Parse error: ${error.reason} at path ${error.path.map((p) => `'${String(p)}'`).join(".")}`,
      );
    },
  );
}

export const path = parser<ReadonlyArray<string | number | symbol>>((ctx) => [
  [...ctx.path] as const,
  ctx,
]);
export const success = <T, S>(val: T): Parser<T, S> =>
  parser((ctx) => parserResult(val, ctx));
export const fail = <S>(reason: string): Parser<never, S> =>
  parser((ctx) => parserError(reason, ctx));

export const updateState = <S>(updater: (state: S) => S) => {
  return parser<S, S>((ctx) => {
    const newCtx = ctx.updateState(updater);
    return parserResult(newCtx.state, newCtx);
  });
};

export const getState = <S>() => parser<S, S>((ctx) => [ctx.state, ctx]);

export const withState = <S>(
  _combine: <T>(parsers: (ctx: ParserBind<S>) => T) => Parser<T, S>,
) => _combine;
