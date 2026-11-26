export interface PaginationInput { page?: unknown; limit?: unknown; }
export function parsePagination(input: PaginationInput, defaults = { page: 1, limit: 25, maxLimit: 100 }) {
  const page = Math.max(1, Number.parseInt(String(input.page ?? defaults.page), 10) || defaults.page);
  const requestedLimit = Number.parseInt(String(input.limit ?? defaults.limit), 10) || defaults.limit;
  const limit = Math.min(defaults.maxLimit, Math.max(1, requestedLimit));
  return { page, limit, offset: (page - 1) * limit };
}
export function paginationMeta(total: number, page: number, limit: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 };
}
