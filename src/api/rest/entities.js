// REST implementation of entities previously provided by Base44 SDK.
// This mirrors the minimal surface your UI currently uses (list, create, etc.)
import { http } from './client';

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
export const VolunteerRegistration = buildEntity('/volunteer-registrations');
export const SupplyDonation = buildEntity('/supply-donations');
export const GridDiscussion = buildEntity('/grid-discussions');
export const Announcement = buildEntity('/announcements');

// Very simple user auth placeholder
export const User = {
  me: async () => {
    try {
      return await http.get('/me');
    } catch (e) {
      return null; // not logged in
    }
  }
};
