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

/**
 * Typed helper for routes using `responses`. Keeps `status` as a literal
 * type instead of widening to `number`, so it lines up with InferResponses.
 */
export function reply<const S extends number>(status: S): { status: S; body: undefined };
export function reply<const S extends number, B>(status: S, body: B): { status: S; body: B };
export function reply(status: number, body?: unknown) {
  return { status, body };
}
