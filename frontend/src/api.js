const API_URL = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : (typeof window !== "undefined" && (window.location.port === "5173" || window.location.port === "3000")
      ? "http://localhost:8000"
      : "");

export function getAuthToken() {
  return localStorage.getItem("finguard_token");
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem("finguard_token", token);
  } else {
    localStorage.removeItem("finguard_token");
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : "/" + endpoint;
  const url = API_URL ? `${API_URL}${cleanEndpoint}` : cleanEndpoint;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401 && !endpoint.includes("/auth/login") && !endpoint.includes("/auth/register")) {
      // Token expired or invalid
      setAuthToken(null);
      window.dispatchEvent(new Event("finguard_auth_expired"));
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.detail || res.statusText || "Request failed";
      throw new Error(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
    }

    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}
