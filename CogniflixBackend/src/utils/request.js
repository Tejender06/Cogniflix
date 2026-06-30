const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export function parsePagination(query, defaults = {}) {
  const defaultPage = defaults.page || 1;
  const defaultLimit = defaults.limit || 100;
  const maxLimit = defaults.maxLimit || 100;

  const page = Math.max(1, Number.parseInt(query.page, 10) || defaultPage);
  const requestedLimit = Number.parseInt(query.limit, 10) || defaultLimit;
  const limit = Math.max(1, Math.min(maxLimit, requestedLimit));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(normalizeList);
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

