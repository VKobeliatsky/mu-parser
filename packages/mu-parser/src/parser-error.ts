export class ParserError {
  static attempt<T>(fn: () => T, recover: (e: ParserError) => T): T {
    try {
      return fn();
    } catch (error) {
      if (error instanceof ParserError) {
        return recover(error);
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
