import { recover } from "./utils";

export class ParserError extends Error {
  static readonly recover = recover(ParserError);

  constructor(
    public readonly reason: string,
    public readonly path: ReadonlyArray<string | number | symbol>,
  ) {
    super(reason);
    this.name = "ParserError";
  }
}
