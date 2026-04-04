const API_ROOT = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

export async function apiFetch(endpoint, options = {}) {
  const {
    method = "GET",
    token,
    body,
    headers = {}
  } = options;

  const requestHeaders = { ...headers };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const request = {
    method,
    headers: requestHeaders
  };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
    request.body = JSON.stringify(body);
  }

  const target = endpoint.startsWith("http") ? endpoint : `${API_ROOT}${endpoint}`;
  const response = await fetch(target, request);
  let data = {};

  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (!response.ok) {
    const failure = new Error(data.error || "Request failed.");
    failure.status = response.status;
    throw failure;
  }

  return data;
}
