import type { z, ZodType } from 'zod';
import type { ResponseConfig } from './types';

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
} as const;

export type ApiResponseOptions<S extends number, B> = B extends undefined
  ? { status: S; data?: B; headers?: Record<string, string> }
  : { status: S; data: B; headers?: Record<string, string> };

export type ApiResponse<S extends number = number, B = unknown> = B extends undefined
  ? { status: S; body?: B; headers?: Record<string, string> }
  : { status: S; body: B; headers?: Record<string, string> };

type ResponseBody<Config> = Config extends { schema: infer Schema extends ZodType } ? z.infer<Schema> : undefined;
type ResponseForStatus<Responses extends Record<number, ResponseConfig>, Status extends number> = Status extends keyof Responses
  ? ApiResponse<Status, ResponseBody<Responses[Status]>>
  : never;
type StatusMethod<Responses extends Record<number, ResponseConfig>, Status extends number> = Status extends keyof Responses
  ? ResponseBody<Responses[Status]> extends undefined
    ? (data?: undefined, options?: { headers?: Record<string, string> }) => ResponseForStatus<Responses, Status>
    : (data: ResponseBody<Responses[Status]>, options?: { headers?: Record<string, string> }) => ResponseForStatus<Responses, Status>
  : never;

type SimpleStatusMethod<Schema extends ZodType | undefined, Status extends number> = Schema extends ZodType
  ? (data: z.infer<Schema>, options?: { headers?: Record<string, string> }) => ApiResponse<Status, z.infer<Schema>>
  : (data?: undefined, options?: { headers?: Record<string, string> }) => ApiResponse<Status, undefined>;

export type ResponseHelpers<Schema extends ZodType | undefined, Responses extends Record<number, ResponseConfig> | undefined> =
  Responses extends Record<number, ResponseConfig>
    ? {
        ok: StatusMethod<Responses, 200>;
        created: StatusMethod<Responses, 201>;
        accepted: StatusMethod<Responses, 202>;
        noContent: 204 extends keyof Responses ? () => ResponseForStatus<Responses, 204> : never;
        badRequest: StatusMethod<Responses, 400>;
        unauthorized: StatusMethod<Responses, 401>;
        forbidden: StatusMethod<Responses, 403>;
        notFound: StatusMethod<Responses, 404>;
        conflict: StatusMethod<Responses, 409>;
        unprocessableEntity: StatusMethod<Responses, 422>;
        status: <Status extends Extract<keyof Responses, number>>(
          status: Status,
          data: ResponseBody<Responses[Status]>,
          options?: { headers?: Record<string, string> },
        ) => ResponseForStatus<Responses, Status>;
        json: <Status extends Extract<keyof Responses, number>>(
          options: ApiResponseOptions<Status, ResponseBody<Responses[Status]>>,
        ) => ResponseForStatus<Responses, Status>;
      }
    : {
        ok: SimpleStatusMethod<Schema, 200>;
        created: never;
        accepted: never;
        noContent: never;
        badRequest: never;
        unauthorized: never;
        forbidden: never;
        notFound: never;
        conflict: never;
        unprocessableEntity: never;
        status: (
          status: 200,
          data: Schema extends ZodType ? z.infer<Schema> : undefined,
          options?: { headers?: Record<string, string> },
        ) => ApiResponse<200, Schema extends ZodType ? z.infer<Schema> : undefined>;
        json: (
          options: ApiResponseOptions<200, Schema extends ZodType ? z.infer<Schema> : undefined>,
        ) => ApiResponse<200, Schema extends ZodType ? z.infer<Schema> : undefined>;
      };

function response(status: number, data?: unknown, headers?: Record<string, string>): { status: number; body?: unknown; headers?: Record<string, string> } {
  return { status, ...(data !== undefined && { body: data }), ...(headers && { headers }) };
}

export function createResponseHelpers(): ResponseHelpers<any, any> {
  const json = ({ status, data, headers }: ApiResponseOptions<number, unknown>) => response(status, data, headers);
  const withStatus = (status: number) => (data?: unknown, options?: { headers?: Record<string, string> }) => response(status, data, options?.headers);

  return {
    ok: withStatus(HttpStatus.OK),
    created: withStatus(HttpStatus.CREATED),
    accepted: withStatus(HttpStatus.ACCEPTED),
    noContent: () => response(HttpStatus.NO_CONTENT),
    badRequest: withStatus(HttpStatus.BAD_REQUEST),
    unauthorized: withStatus(HttpStatus.UNAUTHORIZED),
    forbidden: withStatus(HttpStatus.FORBIDDEN),
    notFound: withStatus(HttpStatus.NOT_FOUND),
    conflict: withStatus(HttpStatus.CONFLICT),
    unprocessableEntity: withStatus(HttpStatus.UNPROCESSABLE_ENTITY),
    status: (status: number, data?: unknown, options?: { headers?: Record<string, string> }) => response(status, data, options?.headers),
    json,
  } as ResponseHelpers<any, any>;
}
