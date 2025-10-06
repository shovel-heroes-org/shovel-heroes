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
  code?: string;
  grid_type?: string;
  [key: string]: any;
}

interface VolunteerRegistration {
  id: string;
  grid_id: string;
  user_id?: string;
  volunteer_name?: string;
  volunteer_phone?: string | null;
  volunteer_email?: string | null;
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
export function isAdmin(user: User | null, actingRole?: string): boolean {
  if (!user) return false;
  const role = actingRole || user.role;
  return role === 'admin' || role === 'super_admin';
}

function isGridManagerRole(user: User | null, actingRole?: string): boolean {
  const role = actingRole || user?.role || undefined;
  return role === 'grid_manager';
}

function normalizeManagerIds(gridManagerId?: string | string[] | null | undefined): string[] {
  if (!gridManagerId) return [];
  if (Array.isArray(gridManagerId)) {
    return gridManagerId.filter((id): id is string => typeof id === 'string' && id.trim() !== '');
  }
  return typeof gridManagerId === 'string' && gridManagerId.trim() !== '' ? [gridManagerId] : [];
}

function collectManagerIds(
  gridManagerId?: string | string[] | null | undefined,
  extras: Array<string | null | undefined> = []
): string[] {
  const base = normalizeManagerIds(gridManagerId);
  const extraIds = extras.filter((id): id is string => typeof id === 'string' && id.trim() !== '');
  return [...new Set([...base, ...extraIds])];
}

interface ContactPrivacyOptions {
  actingRole?: string;
  gridManagerId?: string | string[] | null | undefined;
  extraManagerIds?: Array<string | null | undefined>;
  canViewContact?: boolean;
  canViewGridContact?: boolean;
}

/**
 * 過濾志工報名資料中的隱私資訊
 *
 * 隱私權限控制規則（必須同時滿足兩個條件）：
 * 1. ✅ 有 view_volunteer_contact 隱私權限（這是必要條件）
 * 2. 且滿足以下身份之一：
 *    - 網格建立者
 *    - 網格管理員
 *    - 志工本人
 *    - 超級管理員
 *    - 管理員
 *
 * 關鍵邏輯：
 * - 若沒有隱私權限，所有人都看不到聯絡資訊（包括志工本人和網格建立者）
 * - 若有隱私權限，只有特定身份才能看到聯絡資訊
 * - 訪客即使有隱私權限，也看不到（除非是志工本人）
 * - 一般用戶即使有隱私權限，也看不到（除非是志工本人或網格相關人員）
 */
export function filterVolunteerPrivacy(
  registration: VolunteerRegistration,
  user: User | null,
  gridCreatorId: string | undefined,
  options: ContactPrivacyOptions = {}
): VolunteerRegistration {
  const {
    actingRole,
    gridManagerId,
    extraManagerIds = [],
    canViewContact = false,
  } = options;

  // DEBUG LOG
  /*console.log('🔍 filterVolunteerPrivacy DEBUG:', {
    volunteer_name: registration.volunteer_name,
    volunteer_phone: registration.volunteer_phone,
    user_id: user?.id,
    actingRole,
    canViewContact,
    options_received: options
  });*/

  const managerIds = collectManagerIds(gridManagerId, extraManagerIds);
  const hasManagerAssociation = !!(user && managerIds.includes(user.id));
  const hasManagerRole = isGridManagerRole(user, actingRole);

  // 第一步：檢查是否有隱私權限
  // 若角色沒有檢視權限，所有人都看不到聯絡資訊（包括志工本人）
  if (!canViewContact) {
    //console.log('❌ canViewContact is FALSE - returning empty phone/email');
    return {
      ...registration,
      volunteer_phone: '',
      volunteer_email: '',
    };
  }

  //console.log('✅ canViewContact is TRUE - checking identity...');

  // 第二步：有隱私權限後，檢查是否滿足身份條件

  // 超級管理員和管理員可以看到所有資訊
  if (isAdmin(user, actingRole)) {
    return registration;
  }

  // 網格管理員角色或被指定為網格管理員可以看到該網格的聯絡資訊
  if (hasManagerRole || hasManagerAssociation) {
    return registration;
  }

  // 網格建立者可以看到該網格所有志工的聯絡資訊
  if (user && gridCreatorId && user.id === gridCreatorId) {
    return registration;
  }

  // 志工本人可以看到自己的聯絡資訊（包含 created_by_id 與 user_id）
  if (isVolunteerSelf(user, registration)) {
    return registration;
  }

  // 訪客角色：即使有隱私權限，也看不到（因為不是志工本人/網格相關人員）
  // 一般用戶：即使有隱私權限，也看不到（因為不是志工本人/網格相關人員）
  return {
    ...registration,
    volunteer_phone: '',
    volunteer_email: '',
  };
}

/**
 * 批次過濾志工報名資料
 */
export function filterVolunteersPrivacy(
  registrations: VolunteerRegistration[],
  user: User | null,
  gridCreatorId: string | undefined,
  options: ContactPrivacyOptions = {}
): VolunteerRegistration[] {
  return registrations.map(reg => filterVolunteerPrivacy(reg, user, gridCreatorId, options));
}

/**
 * 過濾物資捐贈資料中的隱私資訊
 *
 * 隱私權限控制規則（必須同時滿足兩個條件）：
 * 1. ✅ 有 view_donor_contact 隱私權限（這是必要條件）
 * 2. 且滿足以下身份之一：
 *    - 網格建立者
 *    - 網格管理員
 *    - 捐贈者本人
 *    - 超級管理員
 *    - 管理員
 *
 * 關鍵邏輯：
 * - 若沒有隱私權限，所有人都看不到聯絡資訊（包括捐贈者本人和網格建立者）
 * - 若有隱私權限，只有特定身份才能看到聯絡資訊
 * - 訪客即使有隱私權限，也看不到（除非是捐贈者本人）
 * - 一般用戶即使有隱私權限，也看不到（除非是捐贈者本人或網格相關人員）
 */
export function filterDonationPrivacy(
  donation: SupplyDonation,
  user: User | null,
  gridCreatorId: string | undefined,
  options: ContactPrivacyOptions = {}
): SupplyDonation {
  const {
    actingRole,
    gridManagerId,
    extraManagerIds = [],
    canViewContact = false,
  } = options;

  const managerIds = collectManagerIds(gridManagerId, extraManagerIds);
  const hasManagerAssociation = !!(user && managerIds.includes(user.id));
  const hasManagerRole = isGridManagerRole(user, actingRole);

  // 第一步：檢查是否有隱私權限
  // 若角色沒有檢視權限，所有人都看不到聯絡資訊（包括捐贈者本人）
  if (!canViewContact) {
    return {
      ...donation,
      donor_name: '',
      donor_phone: '',
      donor_email: '',
      donor_contact: '',
    };
  }

  // 第二步：有隱私權限後，檢查是否滿足身份條件

  // 超級管理員和管理員可以看到所有資訊
  if (isAdmin(user, actingRole)) {
    return donation;
  }

  // 網格管理員角色或被指定為網格管理員可以看到該網格的聯絡資訊
  if (hasManagerRole || hasManagerAssociation) {
    return donation;
  }

  // 網格建立者可以看到該網格所有捐贈的聯絡資訊
  if (user && gridCreatorId && user.id === gridCreatorId) {
    return donation;
  }

  // 捐贈者本人可以看到自己的聯絡資訊
  if (isDonorSelf(user, donation)) {
    return donation;
  }

  // 訪客角色：即使有隱私權限，也看不到（因為不是捐贈者本人/網格相關人員）
  // 一般用戶：即使有隱私權限，也看不到（因為不是捐贈者本人/網格相關人員）
  return {
    ...donation,
    donor_name: '',
    donor_phone: '',
    donor_email: '',
    donor_contact: '',
  };
}

/**
 * 批次過濾物資捐贈資料
 */
export function filterDonationsPrivacy(
  donations: SupplyDonation[],
  user: User | null,
  gridCreatorId: string | undefined,
  options: ContactPrivacyOptions = {}
): SupplyDonation[] {
  return donations.map(donation => filterDonationPrivacy(donation, user, gridCreatorId, options));
}

/**
 * 過濾網格聯絡資訊
 *
 * 更新後的隱私規則：
 * - 網格聯絡資訊不再公開
 * - 只有報名該網格的志工才能看到聯絡資訊
 *
 * 誰可以看到網格聯絡資訊：
 * 1. 超級管理員/管理員（有 view_grid_contact 權限時）
 * 2. 網格建立者本人（有 view_grid_contact 權限時）
 * 3. 網格管理員（有 view_grid_contact 權限時）
 * 4. 已報名該網格的志工（有 view_grid_contact 權限時）
 * 5. 已在該網格捐贈的捐贈者（有 view_grid_contact 權限時）
 */
export async function filterGridPrivacy(
  grid: Grid,
  user: User | null,
  dbPool: any,
  options: ContactPrivacyOptions = {}
): Promise<Grid> {
  const { actingRole, canViewGridContact = false } = options;

  // 第一步：檢查是否有 view_grid_contact 權限
  // 若沒有權限，所有人都看不到聯絡資訊
  if (!canViewGridContact) {
    return {
      ...grid,
      contact_info: undefined,
    };
  }

  // 第二步：有權限後，檢查是否滿足身份條件

  // 超級管理員和管理員可以看到所有網格聯絡資訊
  if (isAdmin(user, actingRole)) {
    return grid;
  }

  // 網格建立者本人可以看到
  if (user && grid.created_by_id === user.id) {
    return grid;
  }

  // 網格管理員可以看到
  if (user && grid.grid_manager_id === user.id) {
    return grid;
  }

  // 檢查是否為已報名的志工
  if (user && dbPool) {
    const { rows: volunteerRows } = await dbPool.query(
      'SELECT id FROM volunteer_registrations WHERE grid_id = $1 AND user_id = $2 AND status != $3 LIMIT 1',
      [grid.id, user.id, 'cancelled']
    );
    if (volunteerRows.length > 0) {
      return grid; // 已報名的志工可以看到
    }

    // 檢查是否為已捐贈的捐贈者
    const { rows: donationRows } = await dbPool.query(
      'SELECT id FROM supply_donations WHERE grid_id = $1 AND created_by_id = $2 AND status != $3 LIMIT 1',
      [grid.id, user.id, 'cancelled']
    );
    if (donationRows.length > 0) {
      return grid; // 已捐贈的捐贈者可以看到
    }
  }

  // 其他人看不到聯絡資訊
  return {
    ...grid,
    contact_info: undefined,
  };
}

/**
 * 批次過濾網格聯絡資訊
 */
export async function filterGridsPrivacy(
  grids: Grid[],
  user: User | null,
  dbPool: any,
  options: ContactPrivacyOptions = {}
): Promise<Grid[]> {
  const filteredGrids = [];
  for (const grid of grids) {
    const filtered = await filterGridPrivacy(grid, user, dbPool, options);
    filteredGrids.push(filtered);
  }
  return filteredGrids;
}
