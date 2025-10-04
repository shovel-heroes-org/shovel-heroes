/**
 * 隱私資訊過濾工具
 * 根據使用者角色和資源擁有權決定是否顯示敏感資訊
 */

interface User {
  id: string;
  role: string;
}

interface Grid {
  id: string;
  created_by_id?: string;
  contact_info?: string;
}

interface VolunteerRegistration {
  id: string;
  grid_id: string;
  user_id?: string;
  volunteer_name?: string;
  volunteer_phone?: string;
  volunteer_email?: string;
  created_by_id?: string;
  [key: string]: any;
}

interface SupplyDonation {
  id: string;
  grid_id: string;
  donor_contact?: string;
  [key: string]: any;
}

/**
 * 檢查使用者是否為網格的建立者（需求發起者 A）
 */
export function isGridCreator(user: User | null, grid: Grid): boolean {
  if (!user || !grid) return false;
  return grid.created_by_id === user.id;
}

/**
 * 檢查使用者是否為志工報名的本人（志工 B）
 */
export function isVolunteerSelf(user: User | null, registration: VolunteerRegistration): boolean {
  if (!user || !registration) return false;
  return registration.user_id === user.id || registration.created_by_id === user.id;
}

/**
 * 檢查使用者是否為物資捐贈的本人（捐贈者 C）
 */
export function isDonorSelf(user: User | null, donation: SupplyDonation): boolean {
  if (!user || !donation) return false;
  // supply_donations 沒有 user_id，需要通過其他方式關聯
  // 假設我們使用 created_by_id 或其他欄位來追蹤
  return false; // 需要根據實際資料結構調整
}

/**
 * 檢查使用者是否為管理員或超級管理員
 */
export function isAdmin(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'super_admin';
}

/**
 * 過濾志工報名資料中的隱私資訊
 * 規則：
 * - 網格建立者（A）可以看到所有志工的聯絡資訊
 * - 志工本人（B）可以看到自己的聯絡資訊
 * - 管理員可以看到所有資訊
 * - 其他人看不到志工的聯絡資訊
 */
export function filterVolunteerPrivacy(
  registration: VolunteerRegistration,
  user: User | null,
  gridCreatorId: string | undefined
): VolunteerRegistration {
  // 管理員可以看到所有資訊
  if (isAdmin(user)) {
    return registration;
  }

  // 網格建立者可以看到該網格所有志工的聯絡資訊
  if (user && gridCreatorId && user.id === gridCreatorId) {
    return registration;
  }

  // 志工本人可以看到自己的聯絡資訊
  if (isVolunteerSelf(user, registration)) {
    return registration;
  }

  // 其他人無法看到志工的聯絡資訊
  return {
    ...registration,
    volunteer_phone: undefined,
    volunteer_email: undefined,
  };
}

/**
 * 批次過濾志工報名資料
 */
export function filterVolunteersPrivacy(
  registrations: VolunteerRegistration[],
  user: User | null,
  gridCreatorId: string | undefined
): VolunteerRegistration[] {
  return registrations.map(reg => filterVolunteerPrivacy(reg, user, gridCreatorId));
}

/**
 * 過濾物資捐贈資料中的隱私資訊
 * 規則：
 * - 網格建立者（A）可以看到所有捐贈者的聯絡資訊
 * - 捐贈者本人（C）可以看到自己的聯絡資訊
 * - 管理員可以看到所有資訊
 * - 其他人看不到捐贈者的聯絡資訊
 */
export function filterDonationPrivacy(
  donation: SupplyDonation,
  user: User | null,
  gridCreatorId: string | undefined
): SupplyDonation {
  // 管理員可以看到所有資訊
  if (isAdmin(user)) {
    return donation;
  }

  // 網格建立者可以看到該網格所有捐贈的聯絡資訊
  if (user && gridCreatorId && user.id === gridCreatorId) {
    return donation;
  }

  // 捐贈者本人可以看到自己的聯絡資訊
  // TODO: 需要在 supply_donations 表中加入 created_by_id 欄位來追蹤捐贈者
  if (isDonorSelf(user, donation)) {
    return donation;
  }

  // 其他人無法看到捐贈者的聯絡資訊
  return {
    ...donation,
    donor_contact: undefined,
  };
}

/**
 * 批次過濾物資捐贈資料
 */
export function filterDonationsPrivacy(
  donations: SupplyDonation[],
  user: User | null,
  gridCreatorId: string | undefined
): SupplyDonation[] {
  return donations.map(donation => filterDonationPrivacy(donation, user, gridCreatorId));
}

/**
 * 網格建立者的聯絡資訊永遠公開，不需要過濾
 */
export function filterGridPrivacy(grid: Grid, user: User | null): Grid {
  // 網格建立者（A）的聯絡資訊永遠顯示
  return grid;
}
