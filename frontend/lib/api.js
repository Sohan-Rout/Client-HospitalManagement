const API_ROOT = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

export function buildApiUrl(endpoint) {
  return endpoint.startsWith("http") ? endpoint : `${API_ROOT}${endpoint}`;
}

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

  const target = buildApiUrl(endpoint);
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

export async function apiDownload(endpoint, options = {}) {
  const { token, headers = {} } = options;
  const requestHeaders = { ...headers };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildApiUrl(endpoint), {
    headers: requestHeaders
  });

  if (!response.ok) {
    let data = {};

    try {
      data = await response.json();
    } catch (error) {
      data = {};
    }

    const failure = new Error(data.error || "Download failed.");
    failure.status = response.status;
    throw failure;
  }

  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename=\"?([^\";]+)\"?/i);

  return {
    blob: await response.blob(),
    filename: match?.[1] || ""
  };
}
