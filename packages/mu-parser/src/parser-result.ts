import { ParserError } from "./parser-error";
import { ParserState } from "./parser-state";

export const ok = <T, S>(
  val: T,
  state: ParserState<S>,
): readonly [T, ParserState<S>] => [val, state] as const;
export const err = <S>(reason: string, state: ParserState<S>): never => {
  throw new ParserError(reason, state.path);
};
