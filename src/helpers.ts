import type { Method } from './types';

export function normalizePrefix(prefix?: string): string {
  if (!prefix) return '';
  if (prefix === '/') return '';
  return `/${prefix.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}

export function joinPaths(prefix: string, path: string): string {
  const normalizedPath = path ? `/${path.replace(/^\/+/, '')}` : '';
  return `${prefix}${normalizedPath}` || '/';
}

export function convertExpressPath(path: string): string {
  return path.replace(/:(\w+)/g, '{$1}');
}

function isPluralLike(value: string): boolean {
  const lower = value.toLowerCase();

  if (lower.endsWith('ies')) return true;
  if (!lower.endsWith('s')) return false;

  return !/(us|ss|is|ous|ics|news|series|species)$/i.test(lower);
}

function singularizeSegment(value: string): string {
  if (/(series|species)$/i.test(value)) return value;
  if (value.toLowerCase().endsWith('ies')) return value.slice(0, -3) + 'y';
  if (isPluralLike(value)) return value.slice(0, -1);
  return value;
}

function pluralizeSegment(value: string): string {
  if (value.toLowerCase().endsWith('y') && !/[aeiou]y$/i.test(value)) {
    return value.slice(0, -1) + 'ies';
  }

  return isPluralLike(value) ? value : `${value}s`;
}

function toPascalCase(value: string): string {
  return value
    .replace(/^:/, '')
    .split(/[-_\s/]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
}

function methodAction(method: Method, isCollection: boolean): string {
  if (method === 'get') return isCollection ? 'list' : 'get';
  if (method === 'post') return 'create';
  if (method === 'put') return 'replace';
  if (method === 'patch') return 'update';
  return 'delete';
}

/**
 * Builds a REST-aware, deterministic operationId.
 *
 * Examples:
 * - GET /users -> listUsers
 * - GET /users/:id -> getUser
 * - POST /users -> createUser
 * - GET /users/:id/posts -> listUserPosts
 */
export function generateOperationId(method: Method, path: string): string {
  const segments = path.split('/').filter(Boolean);
  const staticSegments = segments.map((segment, index) => ({ segment, index, isParam: segment.startsWith(':') })).filter((segment) => !segment.isParam);

  if (staticSegments.length === 0) {
    const paramNames = segments.filter((segment) => segment.startsWith(':')).map((segment) => toPascalCase(segment.replace(/^:/, '')));
    const action = methodAction(method, false);
    return paramNames.length > 0 ? `${action}By${paramNames.join('And')}` : action;
  }

  const lastStatic = staticSegments[staticSegments.length - 1];
  const lastNext = segments[lastStatic.index + 1];
  const lastIsFollowedByParam = lastNext?.startsWith(':') ?? false;
  const lastIsCollection = method === 'get' ? !lastIsFollowedByParam && isPluralLike(lastStatic.segment) : false;
  const action = methodAction(method, lastIsCollection);

  const resourceParts = staticSegments.map((item, itemIndex) => {
    const next = segments[item.index + 1];
    const isLastStatic = itemIndex === staticSegments.length - 1;

    if (next?.startsWith(':')) {
      return toPascalCase(singularizeSegment(item.segment));
    }

    if (isLastStatic) {
      return toPascalCase(method === 'get' && lastIsCollection ? pluralizeSegment(item.segment) : singularizeSegment(item.segment));
    }

    return toPascalCase(item.segment);
  });

  return `${action}${resourceParts.join('')}`;
}

/**
 * Typed helper for routes using `responses`. Keeps `status` as a literal
 * type instead of widening to `number`, so it lines up with InferResponses.
 */
export function reply<const S extends number>(status: S): { status: S; body: undefined };
export function reply<const S extends number, B>(status: S, body: B): { status: S; body: B };
export function reply(status: number, body?: unknown) {
  return { status, body };
}
