const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const POSTS_URL = `${API_BASE_URL}/posts`;
const AUTH_URL = `${API_BASE_URL}/api`;
const SUPPORT_URL = `${API_BASE_URL}/api/support`;

async function request(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.message || `HTTP ${res.status}`;
    throw new Error(message);
  }

  return data;
}

function buildHeaders(token, extra = {}) {
  const headers = { "Content-Type": "application/json", ...extra };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export function getPosts(params = {}) {
  const url = new URL(POSTS_URL);
  if (params.q) {
    url.searchParams.set("q", params.q);
  }
  if (params.city) {
    url.searchParams.set("city", params.city);
  }
  if (params.category) {
    url.searchParams.set("category", params.category);
  }
  if (params.isAuto === true) {
    url.searchParams.set("isAuto", "true");
  }
  if (params.isAuto === false) {
    url.searchParams.set("isAuto", "false");
  }
  if (params.tag) {
    url.searchParams.set("tag", params.tag);
  }
  if (params.sourceName) {
    url.searchParams.set("sourceName", params.sourceName);
  }
  if (params.days) {
    url.searchParams.set("days", String(params.days));
  }
  if (params.sort) {
    url.searchParams.set("sort", params.sort);
  }
  return request(url.toString());
}

export function getPost(id) {
  return request(`${POSTS_URL}/${id}`);
}

export function createPost(post, token) {
  return request(POSTS_URL, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(post),
  });
}

export function updatePost(id, patch, token) {
  return request(`${POSTS_URL}/${id}`, {
    method: "PATCH",
    headers: buildHeaders(token),
    body: JSON.stringify(patch),
  });
}

export function deletePost(id, token) {
  return request(`${POSTS_URL}/${id}`, {
    method: "DELETE",
    headers: buildHeaders(token),
  });
}

export function getPostComments(id) {
  return request(`${POSTS_URL}/${id}/comments`);
}

export function addPostComment(id, payload, token) {
  return request(`${POSTS_URL}/${id}/comments`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function registerUser(payload, token) {
  return request(`${AUTH_URL}/register`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload) {
  return request(`${AUTH_URL}/login`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export function getSupportThreads(token) {
  return request(`${SUPPORT_URL}/threads`, {
    headers: buildHeaders(token),
  });
}

export function getSupportThread(id, token) {
  return request(`${SUPPORT_URL}/threads/${id}`, {
    headers: buildHeaders(token),
  });
}

export function createSupportThread(payload, token) {
  return request(`${SUPPORT_URL}/threads`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function sendSupportMessage(id, payload, token) {
  return request(`${SUPPORT_URL}/threads/${id}/messages`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function setSupportThreadStatus(id, payload, token) {
  return request(`${SUPPORT_URL}/threads/${id}/status`, {
    method: "PATCH",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
}

const api = {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  getPostComments,
  addPostComment,
  registerUser,
  loginUser,
  getSupportThreads,
  getSupportThread,
  createSupportThread,
  sendSupportMessage,
  setSupportThreadStatus,
};

export default api;
