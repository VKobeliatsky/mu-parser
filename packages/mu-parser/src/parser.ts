import { attempt, toJsonPointerRefToken } from "./utils";
import { ParserError } from "./parser-error";
import { err, ok } from "./parser-result";
import { ParserState } from "./parser-state";

type ParserResult<T, S> = readonly [T, ParserState<S>];

export interface Parser<T, S> {
  run(ctx: ParserState<S>): ParserResult<T, S>;
  map<R>(f: (t: T) => R): Parser<R, S>;
  andThen<R>(f: (a: T) => Parser<R, S>): Parser<R, S>;
  recover<R>(fn: (err: ParserError) => Parser<R, S>): Parser<T | R, S>;
  orElse<R>(other: Parser<R, S>): Parser<T | R, S>;
  readonly optional: Parser<undefined | T, S>;
}

export const parser = <T, S = any>(
  run: (st: ParserState<S>) => ParserResult<T, S>,
): Parser<T, S> => {
  const self: Parser<T, S> = {
    run,
    map: (f) =>
      parser((ctx) => {
        const [res, newCtx] = run(ctx);
        return ok(f(res), newCtx);
      }),
    andThen: <R>(f: (a: T) => Parser<R, S>) =>
      parser((st) => {
        const [a, newSt] = run(st);
        return f(a).run(newSt);
      }),
    recover: <R>(fn: (err: ParserError) => Parser<R, S>): Parser<T | R, S> =>
      parser((st) =>
        attempt<ParserResult<T | R, S>>(
          () => run(st),
          ParserError.recover((e) => fn(e).run(st)),
        ),
      ),
    orElse: <R>(other: Parser<R, S>) => self.recover(() => other),
    get optional() {
      return self.orElse(success(undefined));
    },
  };

  return self;
};

/**
 * @example
 * declare const parser: Parser<R, S>
 * const r: R = bind(parser)
 */
interface ParserBind<S> {
  <R>(parser: Parser<R, S>): R;
}

export const combine = <T, S = void>(
  parsers: (bind: ParserBind<S>) => T,
): Parser<T, S> =>
  parser((state) =>
    ok(
      parsers((parser) => {
        const [res, nextState] = parser.run(state);
        state = nextState;
        return res;
      }),
      state,
    ),
  );

export function runParser<T>(
  parser: Parser<T, void>,
  params: { input: unknown },
): T;
export function runParser<T, S>(
  parser: Parser<T, S>,
  params: { input: unknown; initialState: S },
): T;
export function runParser<T1, T2>(
  parser: Parser<T1, void>,
  params: { input: unknown },
  onError: (error: {
    reason: string;
    path: ReadonlyArray<string | number | symbol>;
  }) => T2,
): T1 | T2;
export function runParser<T1, T2, S>(
  parser: Parser<T1, S>,
  params: { input: unknown; initialState: S },
  onError: (error: {
    reason: string;
    path: ReadonlyArray<string | number | symbol>;
  }) => T2,
): T1 | T2;
export function runParser<T1, T2, S>(
  parser: Parser<T1, S | void>,
  { input, initialState }: { input: unknown; initialState?: S },
  onError?: (error: {
    reason: string;
    path: ReadonlyArray<string | number | symbol>;
  }) => T2,
): T1 | T2 {
  return attempt<T1 | T2>(
    () => parser.run(ParserState.empty(input, initialState))[0],
    ParserError.recover(({ reason, path }) => {
      if (onError) {
        return onError({ reason, path });
      }
      const prettyPath = path.map(toJsonPointerRefToken).join("");

      throw new Error(`${reason} at path "${prettyPath}"`);
    }),
  );
}

export const input: Parser<unknown, any> = parser((state) =>
  ok(state.input, state),
);

export const success = <T, S>(val: T): Parser<T, S> =>
  parser((ctx) => ok(val, ctx));

export const fail = <S>(reason: string): Parser<never, S> =>
  parser((ctx) => err(reason, ctx));

export const path = parser<ReadonlyArray<string | number | symbol>>((ctx) => [
  [...ctx.path] as const,
  ctx,
]);

export const updateState = <S>(updater: (state: S) => S) => {
  return parser<S, S>((ctx) => {
    const newCtx = ctx.updateState(updater);
    return ok(newCtx.state, newCtx);
  });
};

export const getState = <S>() => parser<S, S>((st) => [st.state, st]);

export const withState = <S>(
  _combine: <T>(parsers: (bind: ParserBind<S>) => T) => Parser<T, S>,
) => _combine;
