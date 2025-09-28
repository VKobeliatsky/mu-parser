import { combine, Parser, parser } from "../parser";
import { parserError, parserResult } from "../parser-ops";

export const parseStr = parser<string>((ctx) => {
  const target = ctx.input;
  if (typeof target === "string") {
    return parserResult(target, ctx);
  }
  return parserError("string expected", ctx);
});

export const parseLit = <Val extends string | number | null | undefined>(
  value: Val,
) =>
  parser((ctx) => {
    const target = ctx.input;
    if (target === value) {
      return parserResult(value, ctx);
    }

    return parserError(`expected value ${value}`, ctx);
  });

export const parseNull = parseLit(null);

export const parseNum = parser((ctx) => {
  const target = ctx.input;
  if (typeof target === "number") {
    return parserResult(target, ctx);
  }
  return parserError("number expected", ctx);
});

export const parseObj = parser<Record<string | number | symbol, unknown>>(
  (ctx) => {
    const target = ctx.input;
    if (typeof target === "object" && target !== null) {
      return parserResult(
        target as Record<string | number | symbol, unknown>,
        ctx,
      );
    }

    return parserError("object expected", ctx);
  },
);

export const parseField = <T, S>(
  name: string | number | symbol,
  fieldParser: Parser<T, S>,
): Parser<T, S> =>
  combine((bind) => {
    const record = bind(parseObj);
    const result = bind(
      parser((ctx) => {
        if (name in record) {
          const nextTarget = record[name];
          if (ctx.visited.has(nextTarget)) {
            return parserError("circular reference detected", ctx);
          }
          const [result] = fieldParser.run(ctx.visiting(name, nextTarget));
          return parserResult(result, ctx);
        }
        return parserError(`property '${String(name)}' expected`, ctx);
      }),
    );

    return result;
  });

export const parseList = <T, S>(itemParser: Parser<T, S>): Parser<T[], S> =>
  parser((ctx) => {
    const target = ctx.input;
    if (target instanceof Array) {
      return parserResult(
        target.reduce<T[]>((results, item, idx) => {
          const [res] = itemParser.run(ctx.visiting(idx, item));
          results.push(res);
          return results;
        }, []),
        ctx,
      );
    }
    return parserError("array expected", ctx);
  });
