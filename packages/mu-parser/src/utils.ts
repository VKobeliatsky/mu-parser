export const recover =
  <Err extends new (...args: any[]) => any>(err: Err) =>
  <T>(fn: (err: InstanceType<Err>) => T) =>
  (e: unknown): T => {
    if (e instanceof err) {
      return fn(e);
    } else {
      throw e;
    }
  };

export function attempt<T>(
  fn: () => T,
  recover: (e: unknown) => T,
  ...recovers: Array<(e: unknown) => T>
) {
  try {
    return fn();
  } catch (e) {
    const [next, ...rest] = recovers;
    if (next) {
      return attempt(() => recover(e), next, ...rest);
    } else {
      return recover(e);
    }
  }
}

export const toJsonPointerRefToken = (part: string | number | symbol) =>
  `/${String(part).replace("~", "~0").replace("/", "~1")}`;
