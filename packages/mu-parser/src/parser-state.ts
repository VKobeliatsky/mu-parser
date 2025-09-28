export class ParserState<S> {
  static empty<S>(input: unknown, initialState: S) {
    return new ParserState<S>(input, [], new Set(), initialState);
  }

  protected constructor(
    readonly input: unknown,
    readonly path: ReadonlyArray<string | number | symbol>,
    readonly visited: Set<unknown>,
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
    return new ParserState(
      target,
      [...this.path, path],
      new Set([...this.visited, target]),
      this.state,
    );
  }
}
