export async function fetchJson(url, options = {}) {
  const authToken = !options.skipAuth && typeof window !== 'undefined'
    ? window.localStorage.getItem('dailyspoon.auth.token')
    : '';
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const response = await fetch(url, {
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: 'Request failed' }));
    const error = new Error(payload.message ?? 'Request failed');
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function getAuthToken() {
  return typeof window !== 'undefined'
    ? window.localStorage.getItem('dailyspoon.auth.token')
    : '';
}
