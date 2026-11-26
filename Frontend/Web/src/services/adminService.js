import { api } from '../core/api/client';

export async function getAdminStats() {
  const result = await api.get('/admin/dashboard');
  const stats = result?.stats || result || {};
  return {
    totalUsers: stats.totalUsers ?? 0,
    totalHospitals: stats.totalHospitals ?? 0,
    totalClinics: stats.totalClinics ?? 0,
    totalLabs: stats.totalLabs ?? 0,
    totalPhysio: stats.totalPhysio ?? 0,
    pendingCount: (stats.pendingOrganizations ?? 0) + (stats.pendingProviders ?? 0),
    ...stats,
  };
}
export async function getPendingOrganizations() {
  const result = await api.get('/admin/organizations/pending');
  return result?.organizations ?? result ?? [];
}
export async function getPendingProviders() {
  const result = await api.get('/admin/providers/pending');
  return result?.providers ?? result ?? [];
}
export async function getAllUsers(filters = {}) {
  const result = await api.get('/admin/users', { query: filters });
  return result?.users ?? result ?? [];
}
export async function verifyOrganizationStatus(userId, status) {
  return api.patch(`/admin/organizations/${encodeURIComponent(userId)}/verification`, { status });
}
export async function verifyProviderStatus(userId, status) {
  return api.patch(`/admin/providers/${encodeURIComponent(userId)}/verification`, { status });
}
export async function toggleUserStatus(userId, status) {
  return api.patch(`/admin/users/${encodeURIComponent(userId)}/status`, { status });
}
export async function getAllOrganizations(filters = {}) {
  const result = await api.get('/admin/organizations', { query: filters });
  return result?.organizations ?? result ?? [];
}
export async function searchGlobalUser(query) {
  const users = await getAllUsers({ search: query, limit: 10 });
  return users[0] || null;
}
export async function getUsersPage(filters = {}) {
  const result = await api.get('/admin/users', { query: filters });
  return { users: result?.users ?? [], pagination: result?.pagination ?? null };
}
