import { combine, Parser, parser } from "../parser";

export const parseStr = parser((target, ctx) => {
  if (typeof target === 'string') {
    return target;
  }
  throw ctx.parseError('string expected');
});

export const parseLit = <Val extends string | number | null | undefined>(
  value: Val,
) =>
  parser((target, ctx) => {
    if (target === value) {
      return value;
    }

    throw ctx.parseError(`expected value ${value}`);
  });

export const parseNull = parseLit(null);

export const parseNum = parser((target, ctx) => {
  if (typeof target === 'number') {
    return target;
  }
  throw ctx.parseError('number expected');
});

export const parseObj = parser((target, ctx) => {
  if (typeof target === 'object' && target !== null) {
    return target as Record<string | number | symbol, unknown>;
  }

  throw ctx.parseError('object expected');
});

export const parseField = <T>(name: string | number | symbol, fieldParser: Parser<T>) => combine(({ bind }) => {
  const record = bind(parseObj);
  const result = bind(parser((target, ctx) => {
    ctx = ctx.visit(target);
    if (name in record) {
      return fieldParser.run(record[name], ctx.pushPath(name));
    }
    throw ctx.parseError(`property '${String(name)}' expected`);
  }));

  return result;
});

export const parseList = <T>(itemParser: Parser<T>): Parser<T[]> =>
  parser((target, ctx) => {
    ctx.visit(target);
    if (target instanceof Array) {
      return target.reduce<T[]>((acc, item, idx) => {
        acc.push(itemParser.run(item, ctx.pushPath(idx)));
        return acc;
      }, []);
    }
    throw ctx.parseError('array expected');
  });

