import type { z } from 'zod';

/**
 * This is a conservative static check, not an Express path matcher. `string`
 * means that a path or schema cannot be read safely, so the check is skipped.
 */
type ParseDepthLimit = 128;
type SchemaUnwrapLimit = 8;
type Counter = readonly unknown[];
type Next<Count extends Counter> = [...Count, unknown];
type IsAny<Value> = 0 extends 1 & Value ? true : false;

type AsciiLetter =
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't'
  | 'u'
  | 'v'
  | 'w'
  | 'x'
  | 'y'
  | 'z';
type ParameterNameCharacter = AsciiLetter | Uppercase<AsciiLetter> | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '_';

/** Read one named parameter and return its name and the remaining path. */
type ReadParameterName<Path extends string, Name extends string = '', Count extends Counter = []> = Count['length'] extends ParseDepthLimit
  ? [string, string]
  : Path extends `${infer Character}${infer Rest}`
    ? string extends Character
      ? [string, string]
      : Character extends ParameterNameCharacter
        ? ReadParameterName<Rest, `${Name}${Character}`, Next<Count>>
        : [Name, Path]
    : [Name, ''];

/** Parse supported named parameters from a literal Express path. */
type ParsePathParameters<Path extends string, Keys extends string = never, Count extends Counter = []> = string extends Path
  ? string
  : Count['length'] extends ParseDepthLimit
    ? string
    : Path extends `:${infer Rest}` | `*${infer Rest}`
      ? ReadParameterName<Rest> extends [infer Name extends string, infer Tail extends string]
        ? Name extends ''
          ? string
          : Tail extends '' | `/${string}` | `.${string}` | `-${string}` | `?${string}` | `+${string}` | `}${string}` | `{${string}` | `:${string}`
            ? ParsePathParameters<Tail, Keys | Name, Next<Count>>
            : string
        : string
      : Path extends `${infer Character}${infer Rest}`
        ? string extends Character
          ? string
          : `${number}` extends Character
            ? string
            : `${bigint}` extends Character
              ? string
              : ParsePathParameters<Rest, Keys, Next<Count>>
        : Keys;

type IsUnion<T, Whole = T> = T extends Whole ? ([Whole] extends [T] ? false : true) : never;

/** Join a scoped-router prefix and route path without adding duplicate slashes. */
export type JoinRoutePath<Prefix extends string, Path extends string> = string extends Prefix | Path
  ? string
  : Prefix extends ''
    ? Path
    : Path extends ''
      ? Prefix
      : Prefix extends `${string}/`
        ? Path extends `/${infer Rest}`
          ? `${Prefix}${Rest}`
          : `${Prefix}${Path}`
        : Path extends `/${string}`
          ? `${Prefix}${Path}`
          : `${Prefix}/${Path}`;

export type ExtractPathParams<Path extends string> =
  true extends IsUnion<Path>
    ? string
    : string extends Path
      ? string
      : // Regex groups, escaped characters and quoted names need matcher-specific
        // parsing; skip the whole check rather than comparing an incomplete key set.
        Path extends `${string}${'(' | ')' | '[' | ']' | '\\' | '"'}${string}`
        ? string
        : ParsePathParameters<Path>;

/** Get keys from object schemas, including common wrappers around them. */
type SchemaKeys<Schema, Count extends Counter = []> = IsAny<Schema> extends true
  ? string
  : true extends IsUnion<Schema>
    ? string
    : Count['length'] extends SchemaUnwrapLimit
      ? string
      : Schema extends z.ZodObject<infer Shape>
        ? Extract<keyof Shape, string>
        : Schema extends z.ZodEffects<infer Inner, any, any>
          ? SchemaKeys<Inner, Next<Count>>
          : Schema extends z.ZodOptional<infer Inner> | z.ZodNullable<infer Inner> | z.ZodDefault<infer Inner> | z.ZodCatch<infer Inner>
            ? SchemaKeys<Inner, Next<Count>>
            : Schema extends z.ZodBranded<infer Inner, any>
              ? SchemaKeys<Inner, Next<Count>>
              : Schema extends z.ZodReadonly<infer Inner>
                ? SchemaKeys<Inner, Next<Count>>
                : Schema extends z.ZodPipeline<infer Input, any>
                  ? SchemaKeys<Input, Next<Count>>
                  : string;

type ParameterSchemaError<PathKeys extends string, Keys extends string> = string extends PathKeys | Keys
  ? unknown
  : ([Exclude<PathKeys, Keys>] extends [never]
      ? unknown
      : {
          [Key in `Missing route parameter in params schema: "${Exclude<PathKeys, Keys>}"`]: never;
        }) &
      ([Exclude<Keys, PathKeys>] extends [never]
        ? unknown
        : {
            [Key in `Extra params schema key not present in route path: "${Exclude<Keys, PathKeys>}"`]: never;
          });

/**
 * Attach an inconsistency to the schema field itself. This keeps TypeScript
 * from selecting the unrelated grouped-metadata union branch as its error.
 */
export type PathParamsCheck<Path extends string, Schema> =
  ParameterSchemaError<ExtractPathParams<Path>, SchemaKeys<Schema>> extends infer Error
    ? unknown extends Error
      ? unknown
      : {
          params?: Schema & Error;
          request?: { params?: Schema & Error };
        }
    : never;
