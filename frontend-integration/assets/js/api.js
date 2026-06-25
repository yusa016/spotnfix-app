(function () {
  const API_BASE = window.SPOTNFIX_API_BASE || "http://localhost:3000/api";
  const TOKEN_KEY = "spotnfix_token";
  const USER_KEY = "spotnfix_user";

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  function setSession(token, user) {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    sessionStorage.setItem("spotnfix_logged_in", "true");
  }

  function clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem("spotnfix_logged_in");
  }

  function getUser() {
    try {
      const raw = sessionStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }

  async function request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    let data = null;
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_error) {
        data = { error: text };
      }
    }

    if (!response.ok) {
      throw new Error((data && data.error) || "Request failed.");
    }

    return data;
  }

  window.SpotnFixAPI = {
    getToken,
    getUser,
    clearSession,
    login(email, password) {
      return request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }).then((result) => {
        setSession(result.token, result.user);
        return result;
      });
    },
    register(payload) {
      return request("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    getReports(filters = {}) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const query = params.toString();
      return request(`/reports${query ? `?${query}` : ""}`);
    },
    getReport(id) {
      return request(`/reports/${id}`);
    },
    createReport(payload) {
      return request("/reports", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    updateReportStatus(id, status) {
      return request(`/reports/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    deleteReport(id) {
      return request(`/reports/${id}`, { method: "DELETE" });
    },
    getAnalytics() {
      return request("/reports/analytics");
    },
    getFacilities() {
      return request("/facilities");
    },
  };
})();
