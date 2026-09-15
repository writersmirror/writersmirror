const BASE_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;
  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    let detail;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      detail = `HTTP ${res.status}`;
    }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Plotto reference data
  getCharacters: () => request("/api/plotto/characters"),
  getClauses: () => request("/api/plotto/clauses"),
  getCategories: () => request("/api/plotto/categories"),
  getRandomPlot: () => request("/api/plotto/random"),
  getConflicts: (params = {}) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v) q.set(k, v);
    }
    return request(`/api/plotto/conflicts?${q}`);
  },
  getConflict: (id) => request(`/api/plotto/conflicts/${id}`),

  // Auth
  getCaptcha: () => request("/api/auth/captcha"),
  register: (data) =>
    request("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  getMe: (token) => request("/api/auth/me", { token }),
  refresh: () => request("/api/auth/refresh", { method: "POST" }),

  // Library
  getBookmarks: (token) => request("/api/library/bookmarks", { token }),
  addBookmark: (conflictId, token) =>
    request("/api/library/bookmarks", {
      method: "POST",
      body: JSON.stringify({ conflict_id: conflictId }),
      token,
    }),
  removeBookmark: (conflictId, token) =>
    request(`/api/library/bookmarks/${conflictId}`, { method: "DELETE", token }),

  getPlots: (token) => request("/api/library/plots", { token }),
  getPlot: (id, token) => request(`/api/library/plots/${id}`, { token }),
  createPlot: (data, token) =>
    request("/api/library/plots", { method: "POST", body: JSON.stringify(data), token }),
  updatePlot: (id, data, token) =>
    request(`/api/library/plots/${id}`, { method: "PUT", body: JSON.stringify(data), token }),
  deletePlot: (id, token) =>
    request(`/api/library/plots/${id}`, { method: "DELETE", token }),
  renameFolder: (oldName, newName, token) =>
    request("/api/library/folders/rename", {
      method: "PATCH",
      body: JSON.stringify({ old_name: oldName, new_name: newName }),
      token,
    }),
  movePlot: (id, folder, token) =>
    request(`/api/library/plots/${id}/move`, {
      method: "PATCH",
      body: JSON.stringify({ folder }),
      token,
    }),

  getDraft: (token) => request("/api/library/draft", { token }),
  putDraft: (draft, token) =>
    request("/api/library/draft", {
      method: "PUT",
      body: JSON.stringify({ draft }),
      token,
    }),
};

export { BASE_URL };
