const API_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000/api';

export interface ApiErrorBody {
  readonly code: string;
  readonly message: string;
  /** Numbers a board or a selection should highlight. */
  readonly numbers?: readonly number[];
  /** Customer a duplicate phone already belongs to. */
  readonly customerId?: string;
  readonly customerName?: string;
  readonly details?: readonly { path: string; message: string }[];
}

/** Carries the backend error code so screens can react to it, not to a string. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * The access token lives in memory only.
 *
 * Keeping it out of localStorage means a script injected into the page cannot
 * read it; the long-lived refresh token stays in an httpOnly cookie the
 * browser sends on its own.
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

interface RequestOptions {
  readonly method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  readonly body?: unknown;
  /** Set while refreshing, to avoid an endless refresh loop. */
  readonly skipRefresh?: boolean;
}

async function parse(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  return text === '' ? null : JSON.parse(text);
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: {
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken === null ? {} : { Authorization: `Bearer ${accessToken}` }),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });

  if (response.status === 401 && options.skipRefresh !== true) {
    const refreshed = await refreshSession();
    if (refreshed) return request<T>(path, { ...options, skipRefresh: true });
  }

  const payload = await parse(response);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      (payload as ApiErrorBody | null) ?? { code: 'UNKNOWN', message: 'Algo salió mal' },
    );
  }

  return payload as T;
}

export interface Session {
  readonly accessToken: string;
  readonly user: { id: string; email: string; name: string | null };
}

/** Swaps the refresh cookie for a fresh access token; false when there is no session. */
export async function refreshSession(): Promise<boolean> {
  try {
    const session = await request<Session>('/auth/refresh', {
      method: 'POST',
      skipRefresh: true,
    });
    setAccessToken(session.accessToken);
    return true;
  } catch {
    setAccessToken(null);
    return false;
  }
}
