/**
 * Standard API response envelope used across all route handlers.
 * Success responses carry `data`; failures carry `error` + `message`.
 */
export type ApiSuccess<T> = { data: T };

export type ApiError = { error: string; message: string };

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function isApiError<T>(res: ApiResponse<T>): res is ApiError {
  return "error" in res;
}
