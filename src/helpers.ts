export function normalizePrefix(prefix?: string): string {
  if (!prefix) return "";
  if (prefix === "/") return "";
  return `/${prefix.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

export function joinPaths(prefix: string, path: string): string {
  const normalizedPath = path ? `/${path.replace(/^\/+/, "")}` : "";
  return `${prefix}${normalizedPath}` || "/";
}

export function convertExpressPath(path: string): string {
  return path.replace(/:(\w+)/g, "{$1}");
}
