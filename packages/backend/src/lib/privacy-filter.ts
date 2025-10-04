/**
 * 隱私資訊過濾工具
 * 根據使用者角色和資源擁有權決定是否顯示敏感資訊
 *
 * 核心邏輯：基於地點關聯的隱私權限系統
 *
 * 三種角色關係：
 * - A (需求端/網格建立者)：建立網格的人，其聯絡資訊永遠公開
 * - B (志工端)：在特定網格報名的志工
 * - C (物資捐贈者)：在特定網格捐贈物資的人
 *
 * 隱私規則：
 * 1. A 的聯絡資訊：永遠顯示（公開）
 * 2. B 的聯絡資訊：只有 B 報名的網格的建立者 A 可以看到
 * 3. C 的聯絡資訊：只有 C 捐贈物資的網格的建立者 A 可以看到
 *
 * 管理權限：
 * - A 是該網格的管理員
 * - A、B、C 三者都可以對相應的任務做狀態調整
 */

interface User {
  id: string;
  role?: string | null;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
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
  donor_name?: string;
  donor_phone?: string;
  donor_email?: string;
  donor_contact?: string;
  created_by_id?: string;
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
  // 使用 created_by_id 來追蹤捐贈者
  return donation.created_by_id === user.id;
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
 *
 * 基於地點關聯的隱私規則：
 * - 網格建立者 A 可以看到在「自己建立的網格」中報名的志工 B 的聯絡資訊（地點關聯）
 * - 志工本人 B 可以看到自己的聯絡資訊
 * - 管理員可以看到所有資訊
 * - 其他人看不到志工的聯絡資訊
 *
 * 例如：A 建立了「花蓮市區 A1 網格」，B 在 A1 報名當志工，則 A 才能看到 B 的電話/Email
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
 *
 * 基於地點關聯的隱私規則：
 * - 網格建立者 A 可以看到在「自己建立的網格」中捐贈物資的捐贈者 C 的聯絡資訊（地點關聯）
 * - 捐贈者本人 C 可以看到自己的聯絡資訊
 * - 管理員可以看到所有資訊
 * - 其他人看不到捐贈者的聯絡資訊
 *
 * 例如：A 建立了「花蓮市區 A1 網格」，C 在 A1 捐贈礦泉水，則 A 才能看到 C 的電話/Email
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
  // 注意：舊資料可能沒有 created_by_id，這些資料只有管理員和網格建立者能看到聯絡資訊
  if (isDonorSelf(user, donation)) {
    return donation;
  }

  // 其他人無法看到捐贈者的聯絡資訊
  return {
    ...donation,
    donor_name: undefined,
    donor_phone: undefined,
    donor_email: undefined,
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
 * 網格建立者（需求端 A）的聯絡資訊永遠公開，不需要過濾
 *
 * 這是核心設計原則：
 * - A 的聯絡資訊永遠顯示，讓志工 B 和捐贈者 C 可以聯繫需求發起人
 * - B 和 C 的聯絡資訊只有對應的網格建立者 A 才能看到（地點關聯）
 */
export function filterGridPrivacy(grid: Grid, user: User | null): Grid {
  // 網格建立者（A）的聯絡資訊永遠顯示
  return grid;
}
