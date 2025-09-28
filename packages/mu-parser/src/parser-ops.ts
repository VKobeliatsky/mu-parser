import { ParserError } from "./parser-error";
import { ParserState } from "./parser-state";

export const parserResult = <T, S>(
  val: T,
  state: ParserState<S>,
): readonly [T, ParserState<S>] => [val, state] as const;
export const parserError = <S>(
  reason: string,
  state: ParserState<S>,
): never => {
  throw new ParserError(reason, state.path);
};
