// Toggle layer to switch between Base44 SDK and REST fallback.
// Usage: change imports in code from '@/api/entities' to '@/api/adapters/entities' etc., or swap here.

const USE_REST = import.meta.env.VITE_USE_REST === 'true';

let impl;
if (USE_REST) {
  impl = await import('./entities.js');
} else {
  impl = await import('../entities.js');
}

export const DisasterArea = impl.DisasterArea;
export const Grid = impl.Grid;
export const VolunteerRegistration = impl.VolunteerRegistration;
export const SupplyDonation = impl.SupplyDonation;
export const GridDiscussion = impl.GridDiscussion;
export const Announcement = impl.Announcement;
export const User = impl.User;
