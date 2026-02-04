const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const POSTS_URL = `${API_BASE_URL}/posts`;
const AUTH_URL = `${API_BASE_URL}/api`;

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
  if (params.city) {
    url.searchParams.set("city", params.city);
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

export default {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  registerUser,
  loginUser,
};
