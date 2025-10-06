// REST implementations of server functions previously accessed via Base44.
// Adjust endpoint paths to match your backend API routes.
import { http } from './client';

export const fixGridBounds = () => http.post('/functions/fix-grid-bounds', {});
export const exportGridsCSV = async () => {
  const csv = await http.get('/functions/export-grids-csv');
  return { data: csv };
};
export const importGridsCSV = ({ csvContent }) => http.post('/functions/import-grids-csv', { csv: csvContent });
export const downloadGridTemplate = () => http.get('/functions/grid-template');
export const externalGridAPI = (payload) => http.post('/functions/external-grid-api', payload);
export const externalVolunteerAPI = (payload) => http.post('/functions/external-volunteer-api', payload);
export const getVolunteers = () => http.get('/volunteers');
export const getUsers = async (params = {}) => {
  const qs = new URLSearchParams();
  if (typeof params.offset === 'number') qs.set('offset', String(params.offset));
  if (typeof params.limit === 'number') qs.set('limit', String(params.limit));
  if (params.role) qs.set('role', params.role);
  if (params.q) qs.set('q', params.q);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const res = await http.get(`/users${suffix}`);
  // Normalize JSON-LD to a simpler shape for UI (supports requested shape and previous variants)
  if (res && typeof res === 'object') {
    // Preferred: new non-hydra shape
    if (res['@type'] === 'Collection' && ('member' in res || 'totalItems' in res)) {
      return {
        data: res.member || [],
        total: res.totalItems || 0,
        view: {
          first: res.first,
          last: res.last,
          previous: res.previous || res.prev,
          next: res.next,
          offset: res.offset,
          limit: res.limit
        }
      };
    }
  }
  return res;
};
export const api_v2_sync = () => http.post('/api/v2/sync', {});
export const api_v2_roster = () => http.get('/api/v2/roster');
