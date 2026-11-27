import { api } from './api';

export async function getAdminStats() {
  const [result, organizations] = await Promise.all([
    api.get('/admin/dashboard'),
    getAllOrganizations(),
  ]);
  const stats = result?.stats || result || {};
  const approvedOrgs = (Array.isArray(organizations) ? organizations : []).filter(
    (org) => String(org.verificationStatus || '').toLowerCase() === 'approved'
  );
  const countApproved = (type) =>
    approvedOrgs.filter((org) => org.organizerType === type).length;

  return {
    ...stats,
    totalUsers: stats.totalUsers ?? 0,
    totalOrganizations: approvedOrgs.length,
    totalHospitals: countApproved('Hospital'),
    totalClinics: countApproved('Clinic'),
    totalLabs: countApproved('Lab'),
    totalPhysio: countApproved('PhysiotherapyCenter'),
    pendingCount: (stats.pendingOrganizations ?? 0) + (stats.pendingProviders ?? 0),
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
  return api.patch(`/admin/organizations/${encodeURIComponent(userId)}/verification`, {
    status,
  });
}

export async function verifyProviderStatus(userId, status) {
  return api.patch(`/admin/providers/${encodeURIComponent(userId)}/verification`, {
    status,
  });
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

export async function registerAccountByAdmin(payload, { approveImmediately = true } = {}) {
  const created = await api.post('/admin/register', payload);
  const userId = created?.user?.userId;

  if (!approveImmediately || !userId) {
    return { ...created, autoApproved: false };
  }

  try {
    if (payload.role === 'organization') {
      await verifyOrganizationStatus(userId, 'Approved');
    } else if (payload.role === 'provider') {
      await verifyProviderStatus(userId, 'Approved');
    }
    return { ...created, autoApproved: true };
  } catch (approvalError) {
    return {
      ...created,
      autoApproved: false,
      approvalError: approvalError?.message || 'Account created, but automatic approval failed.',
    };
  }
}
