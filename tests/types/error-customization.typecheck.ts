import { createApiRouter, z, type ApiErrorHandlingOptions } from '../../src';

const options: ApiErrorHandlingOptions = {
  schema: z.object({ message: z.string() }),
  serialize: async error => ({ message: error.message }),
};
createApiRouter({ errors: options });

const invalid: ApiErrorHandlingOptions = {
  serialize: error => {
    // @ts-expect-error normalized status remains numeric
    const status: string = error.status;
    return { status };
  },
};
