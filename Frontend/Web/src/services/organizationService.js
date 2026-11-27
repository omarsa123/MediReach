import { api } from './api';

export async function getOrganizationProfile() {
  const result = await api.get('/organizations/profile');
  return result?.organization ?? result;
}

export async function updateOrganizationProfile(data) {
  const result = await api.patch('/organizations/profile', data);
  return result?.organization ?? result;
}

export async function getOrganizationServices() {
  const result = await api.get('/organizations/services');
  return result?.services ?? result ?? [];
}

export async function getOrganizationAssignments(status) {
  const result = await api.get('/organizations/assignments', {
    query: status ? { status } : undefined,
  });
  return result?.assignments ?? result ?? [];
}

export async function getOrganizationAppointments(status) {
  const result = await api.get('/organizations/appointments', {
    query: status ? { status } : undefined,
  });
  return result?.appointments ?? result ?? [];
}

export async function getOrganizationDashboardData() {
  const [profile, services, assignments, appointments] = await Promise.all([
    getOrganizationProfile(),
    getOrganizationServices(),
    getOrganizationAssignments(),
    getOrganizationAppointments(),
  ]);
  return { profile, services, assignments, appointments };
}
