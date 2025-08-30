import { combine, Parser, parser } from "../parser";

export const parseStr = parser<string>((ctx) => {
  const target = ctx.input;
  if (typeof target === "string") {
    return [target, ctx];
  }
  throw ctx.parseError("string expected");
});

export const parseLit = <Val extends string | number | null | undefined>(
  value: Val,
) =>
  parser((ctx) => {
    const target = ctx.input;
    if (target === value) {
      return [value, ctx];
    }

    throw ctx.parseError(`expected value ${value}`);
  });

export const parseNull = parseLit(null);

export const parseNum = parser((ctx) => {
  const target = ctx.input;
  if (typeof target === "number") {
    return [target, ctx];
  }
  throw ctx.parseError("number expected");
});

export const parseObj = parser<Record<string | number | symbol, unknown>>(
  (ctx) => {
    const target = ctx.input;
    if (typeof target === "object" && target !== null) {
      return [target as Record<string | number | symbol, unknown>, ctx];
    }

    throw ctx.parseError("object expected");
  },
);

export const parseField = <T, S>(
  name: string | number | symbol,
  fieldParser: Parser<T, S>,
): Parser<T, S> =>
  combine(({ bind }) => {
    const record = bind(parseObj);
    const result = bind(
      parser((ctx) => {
        if (name in record) {
          const nextTarget = record[name];
          const [result] = fieldParser.run(ctx.visiting(name, nextTarget));
          return [result, ctx];
        }
        throw ctx.parseError(`property '${String(name)}' expected`);
      }),
    );

    return result;
  });

export const parseList = <T, S>(itemParser: Parser<T, S>): Parser<T[], S> =>
  parser((ctx) => {
    const target = ctx.input;
    if (target instanceof Array) {
      return [
        target.reduce<T[]>((results, item, idx) => {
          const [res] = itemParser.run(ctx.visiting(idx, item));
          results.push(res);
          return results;
        }, []),
        ctx,
      ];
    }
    throw ctx.parseError("array expected");
  });
