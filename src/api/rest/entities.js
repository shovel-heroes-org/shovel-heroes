// REST implementation of entities previously provided by Base44 SDK.
// This mirrors the minimal surface your UI currently uses (list, create, etc.)
import { http, API_BASE } from './client';

function buildEntity(basePath) {
  return {
    list: () => http.get(basePath),
    get: (id) => http.get(`${basePath}/${id}`),
    create: (data) => http.post(basePath, data),
    update: (id, data) => http.put(`${basePath}/${id}`, data),
    delete: (id) => http.delete(`${basePath}/${id}`)
  };
}

export const DisasterArea = buildEntity('/disaster-areas');
export const Grid = buildEntity('/grids');
export const VolunteerRegistration = {
  ...buildEntity('/volunteer-registrations'),
  // Simple client-side filter until backend supports query params
  filter: async (query = {}) => {
    const all = await http.get('/volunteer-registrations');
    if (query.grid_id) return all.filter(r => r.grid_id === query.grid_id);
    return all;
  }
};
export const SupplyDonation = {
  ...buildEntity('/supply-donations'),
  filter: async (query = {}) => {
    const all = await http.get('/supply-donations');
    if (query.grid_id) return all.filter(r => r.grid_id === query.grid_id);
    return all;
  }
};
// GridDiscussion needs a custom filter API used by UI
export const GridDiscussion = {
  ...buildEntity('/grid-discussions'),
  /**
   * filter(query, sort?) currently supports { grid_id } only. Sort ignored except for '-created_date'.
   */
  filter: async (query = {}, _sort) => {
    const params = new URLSearchParams();
    if (query.grid_id) params.set('grid_id', query.grid_id);
    const qs = params.toString();
    return http.get(`/grid-discussions${qs ? `?${qs}` : ''}`);
  }
};
export const Announcement = buildEntity('/announcements');

// Very simple user auth placeholder
export const User = {
  me: async () => {
    try {
      return await http.get('/me');
    } catch (e) {
      return null; // not logged in
    }
  },
  update: (id, data) => http.put(`/users/${id}`, data),
  login: () => {
    // Always go to backend (absolute) to avoid hitting frontend dev server path only
    window.location.href = `${API_BASE}/auth/line/login`;
  },
  logout: async () => {
    try {
      await http.get('/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    }
    try {
      localStorage.removeItem('sh_token');
    } catch {/* ignore */}
    window.location.reload();
  }
};
