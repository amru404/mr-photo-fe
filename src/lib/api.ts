/**
 * Thin fetch wrapper for the Laravel API, which is proxied same-origin under
 * /api. Laravel's session cookie rides along automatically; state-changing
 * requests echo the XSRF-TOKEN cookie back as a header.
 */

export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: FieldErrors = {},
    public body: Record<string, unknown> = {},
  ) {
    super(message);
  }

  /** First message for a field, e.g. error.field("email"). */
  field(name: string): string | undefined {
    return this.errors[name]?.[0];
  }

  get isValidation(): boolean {
    return this.status === 422;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

let csrfReady: Promise<void> | null = null;

async function ensureCsrf(): Promise<void> {
  if (readCookie("XSRF-TOKEN")) return;
  csrfReady ??= fetch("/api/auth/csrf", { credentials: "same-origin" }).then(() => undefined);
  await csrfReady;
  csrfReady = null;
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  if (method !== "GET") await ensureCsrf();

  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };
  const xsrf = readCookie("XSRF-TOKEN");
  if (xsrf) headers["X-XSRF-TOKEN"] = xsrf;
  // FormData (uploads) goes as is: the browser sets the multipart boundary itself.
  const multipart = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !multipart) headers["Content-Type"] = "application/json";

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: "same-origin",
    body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
  });

  if (response.status === 204) return undefined as T;

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    // A stale XSRF token (session expired) is retried once with a fresh one.
    if (response.status === 419 && method !== "GET") {
      document.cookie = "XSRF-TOKEN=; Max-Age=0; path=/";
      await ensureCsrf();
      return request<T>(method, path, body);
    }

    throw new ApiError(
      response.status,
      typeof data.message === "string" ? data.message : "Something went wrong. Please try again.",
      (data.errors as FieldErrors) ?? {},
      data,
    );
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body ?? {}),
  delete: <T>(path: string, body?: unknown) => request<T>("DELETE", path, body ?? {}),
};

/** Builds "?a=1&b=2" from the defined, non-empty values. */
export function query(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
