// src/services/adminService.js
const ADMIN_API_URL = 'http://localhost:5050/api/v1/admin';

const getHeaders = () => {
  const token = localStorage.getItem('medreach_token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

const handle = async (response, fallbackMsg) => {
  const result = await response.json();
  if (!result.success) throw new Error(result.error || result.message || fallbackMsg);
  return result.data;
};

export const getAdminStats = async () => {
  const response = await fetch(`${ADMIN_API_URL}/stats`, { headers: getHeaders() });
  const data = await handle(response, 'Failed to fetch stats');
  return { ...data, pendingCount: data.pendingCount ?? data.pendingOrganizations ?? 0 };
};

export const getPendingOrganizations = async () => {
  const response = await fetch(`${ADMIN_API_URL}/pending-organizations`, { headers: getHeaders() });
  return handle(response, 'Failed to fetch pending organizations');
};

export const getAllUsers = async () => {
  const response = await fetch(`${ADMIN_API_URL}/users`, { headers: getHeaders() });
  return handle(response, 'Failed to fetch users');
};

export const verifyOrganizationStatus = async (userId, status) => {
  const response = await fetch(`${ADMIN_API_URL}/verify-organization`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ userId, organizationId: userId, status }),
  });
  return handle(response, 'Failed to update organization');
};

export const toggleUserStatus = async (userId, status) => {
  const response = await fetch(`${ADMIN_API_URL}/toggle-user-status`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ userId, status }),
  });
  return handle(response, 'Failed to update user status');
};

export const searchGlobalUser = async (searchQuery) => {
  const response = await fetch(
    `${ADMIN_API_URL}/search-user?query=${encodeURIComponent(searchQuery)}`,
    { headers: getHeaders() }
  );
  return handle(response, 'User not found');
};
export const getAllOrganizations = async () => {
  const response = await fetch(`${ADMIN_API_URL}/organizations`, { headers: getHeaders() });
  return handle(response, 'Failed to fetch organizations');
};