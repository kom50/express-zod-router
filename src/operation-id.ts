import type { Method, OperationIdStrategy } from './types';

export function generateOperationId(
  method: Method,
  path: string,
  handler: Function,
  explicit?: string,
  strategy: OperationIdStrategy = 'rest',
): string {
  if (explicit) {
    return explicit;
  }

  if (strategy === 'explicit') {
    throw new Error('operationId is required when operationId strategy is explicit');
  }

  if (strategy === 'handler' && handler.name) {
    return handler.name;
  }

  return generateRestOperationId(method, path);
}

export function generateRestOperationId(method: Method, path: string): string {
  const segments = normalizePath(path);
  const parameterNames = getParameterNames(segments);

  if (segments.length === 0) {
    return rootOperationId(method);
  }

  const segmentInfo = segments.map((segment, index) => {
    const next = segments[index + 1];

    return {
      segment,
      isParam: isParameter(segment),
      nextIsParam: next ? isParameter(next) : false,
    };
  });

  const staticSegments = segmentInfo.filter((segment) => !segment.isParam);

  if (staticSegments.length === 0) {
    return withParameterNames(rootOperationId(method), parameterNames);
  }

  const last = staticSegments[staticSegments.length - 1];
  const isCollectionRead = method === 'get' && !last.nextIsParam && isPluralLike(last.segment);

  const resourceParts = staticSegments.map((segment, index) => {
    const isLast = index === staticSegments.length - 1;

    if (!isLast && segment.nextIsParam) {
      return capitalize(singularize(segment.segment));
    }

    if (isLast) {
      if (isCollectionRead) {
        return capitalize(pluralize(segment.segment));
      }

      return capitalize(singularize(segment.segment));
    }

    return capitalize(segment.segment);
  });

  const target = resourceParts.join('');

  const operation = (() => {
    switch (method) {
      case 'get':
        return isCollectionRead ? `list${target}` : `get${target}`;
      case 'post':
        return `create${target}`;
      case 'put':
        return `replace${target}`;
      case 'patch':
        return `update${target}`;
      case 'delete':
        return `delete${target}`;
      default:
        return `${method}${target}`;
    }
  })();

  return withParameterNames(operation, parameterNames);
}

function normalizePath(path: string): string[] {
  return path
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean);
}

function isParameter(segment: string): boolean {
  return segment.startsWith(':') || segment.startsWith('*') || (segment.startsWith('{') && segment.endsWith('}'));
}

function getParameterNames(segments: string[]): string[] {
  return segments.map(parameterName).filter((name): name is string => Boolean(name));
}

function parameterName(segment: string): string | undefined {
  if (segment.startsWith(':')) {
    return segment.slice(1).replace(/[?+*]$/, '') || undefined;
  }

  if (segment.startsWith('*')) {
    return segment.slice(1) || undefined;
  }

  if (segment.startsWith('{') && segment.endsWith('}')) {
    return segment.slice(1, -1).replace(/^\*/, '') || undefined;
  }

  return undefined;
}

function withParameterNames(operationId: string, parameterNames: string[]): string {
  if (parameterNames.length === 0) {
    return operationId;
  }

  return `${operationId}By${parameterNames.map(capitalize).join('And')}`;
}

function singularize(value: string): string {
  const lower = value.toLowerCase();

  if (/(series|species)$/i.test(value)) return value;
  if (lower.endsWith('ies')) return value.slice(0, -3) + 'y';

  if (lower.endsWith('ses') || lower.endsWith('xes') || lower.endsWith('zes') || lower.endsWith('ches') || lower.endsWith('shes')) {
    return value.slice(0, -2);
  }

  if (lower.endsWith('s') && !lower.endsWith('ss')) {
    return value.slice(0, -1);
  }

  return value;
}

function isPluralLike(value: string): boolean {
  const lower = value.toLowerCase();

  if (lower.endsWith('ies')) return true;
  if (!lower.endsWith('s')) return false;

  return !/(us|ss|is|ous|ics|news|series|species)$/i.test(lower);
}

function pluralize(value: string): string {
  const lower = value.toLowerCase();

  if (lower.endsWith('ies')) return value;
  if (lower.endsWith('y') && !/[aeiou]y$/i.test(lower)) {
    return `${value.slice(0, -1)}ies`;
  }
  if (lower.endsWith('s')) return value;

  return `${value}s`;
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function rootOperationId(method: Method): string {
  switch (method) {
    case 'get':
      return 'getRoot';
    case 'post':
      return 'createRoot';
    case 'put':
      return 'replaceRoot';
    case 'patch':
      return 'updateRoot';
    case 'delete':
      return 'deleteRoot';
    default:
      return `${method}Root`;
  }
}
