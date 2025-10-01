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
export const getUsers = () => http.get('/users');
export const api_v2_sync = () => http.post('/api/v2/sync', {});
export const api_v2_roster = () => http.get('/api/v2/roster');
