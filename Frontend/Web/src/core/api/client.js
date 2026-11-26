const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'API_ERROR', data = null } = {}) {
    super(message); this.name = 'ApiError'; this.status = status; this.code = code; this.data = data;
  }
}

function buildUrl(path, query) {
  const url = new URL(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  return url;
}

async function decode(response) {
  try { return response.status === 204 ? null : await response.json(); }
  catch { throw new ApiError('The server returned an unreadable response.', { status: response.status, code: 'INVALID_RESPONSE' }); }
}

async function refreshSession() {
  const refreshToken = localStorage.getItem('medreach_refresh_token');
  if (!refreshToken) return false;
  const response = await fetch(buildUrl('/auth/refresh'), {
    method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const payload = await decode(response);
  const session = payload?.data?.session;
  if (!response.ok || payload?.success === false || !session?.accessToken) return false;
  localStorage.setItem('medreach_token', session.accessToken);
  if (session.refreshToken) localStorage.setItem('medreach_refresh_token', session.refreshToken);
  if (payload.data.user) localStorage.setItem('medreach_user', JSON.stringify(payload.data.user));
  return true;
}

export async function apiRequest(path, { method = 'GET', body, auth = true, query, headers = {} } = {}) {
  const url = buildUrl(path, query);
  const makeRequest = () => {
    const token = localStorage.getItem('medreach_token');
    return fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  };
  let response = await makeRequest();
  if (response.status === 401 && auth && !path.includes('/auth/refresh') && await refreshSession()) {
    response = await makeRequest();
  }
  const payload = await decode(response);
  if (!response.ok || payload?.success === false) {
    if (response.status === 401 && auth) {
      ['medreach_token', 'medreach_refresh_token', 'medreach_user'].forEach(key => localStorage.removeItem(key));
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') window.location.assign('/login');
    }
    throw new ApiError(payload?.message || payload?.error || 'The request could not be completed.', {
      status: response.status, code: payload?.code, data: payload?.data,
    });
  }
  return payload?.data ?? payload;
}

export const api = {
  get: (path, options) => apiRequest(path, options),
  post: (path, body, options = {}) => apiRequest(path, { ...options, method: 'POST', body }),
  patch: (path, body, options = {}) => apiRequest(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options = {}) => apiRequest(path, { ...options, method: 'PUT', body }),
  delete: (path, options = {}) => apiRequest(path, { ...options, method: 'DELETE' }),
};
