import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("lsrw_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear the session and redirect to login.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("lsrw_token");
      localStorage.removeItem("lsrw_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  const e = err as {
    response?: { data?: { detail?: unknown; message?: unknown } };
    message?: unknown;
  };
  const d = e?.response?.data?.detail ?? e?.response?.data?.message ?? e?.message;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    return d
      .map((x) => (typeof x === "string" ? x : x?.msg || x?.message || "Invalid input"))
      .filter(Boolean)
      .join(" ");
  }
  return fallback;
}

export default api;
