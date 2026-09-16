import { describe, expect, it } from 'vitest';
import { ApiError } from '../../src';

describe('ApiError', () => {
  it.each([400, 404, 500, 599])('accepts valid error status %i with both constructors', (status) => {
    expect(new ApiError({ status, message: 'Failed' }).status).toBe(status);
    expect(new ApiError(status, 'Failed').status).toBe(status);
  });

  it.each([399, 600, 999, NaN, Infinity, 400.5])('rejects invalid status %s with both constructors', (status) => {
    const expectedMessage = 'ApiError status must be a valid 4xx or 5xx HTTP status code';
    const createFromOptions = () => new ApiError({ status, message: 'Failed' });
    const createFromLegacyArguments = () => new ApiError(status, 'Failed');

    expect(createFromOptions).toThrow(TypeError);
    expect(createFromOptions).toThrow(expectedMessage);
    expect(createFromLegacyArguments).toThrow(TypeError);
    expect(createFromLegacyArguments).toThrow(expectedMessage);
  });
});
