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
  userActualRole?: string;  // 新增：使用者的實際角色（不受視角影響）
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
    userActualRole,  // 實際角色（不受視角影響）
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
    //console.log('❌ canViewContact is FALSE - hiding phone/email');
    return {
      ...registration,
      // 邏輯：
      // - 如果有值（非 null/undefined/空字串）→ 設為 'NO_ACCESS_PERMISSION'（前端顯示權限提示）
      // - 如果沒值（null/undefined/空字串）→ 保持原值（前端顯示「未提供」）
      volunteer_phone: (registration.volunteer_phone && registration.volunteer_phone.trim() !== '') ? 'NO_ACCESS_PERMISSION' : registration.volunteer_phone,
      volunteer_email: (registration.volunteer_email && registration.volunteer_email.trim() !== '') ? 'NO_ACCESS_PERMISSION' : registration.volunteer_email,
    };
  }

  //console.log('✅ canViewContact is TRUE - checking identity...');

  // 第二步：有隱私權限後，檢查是否滿足身份條件

  // 檢查是否為高權限角色（實際角色 OR 視角角色）
  const isHighPrivilegeActual = (user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'grid_manager');
  const isHighPrivilegeActing = (actingRole === 'super_admin' || actingRole === 'admin' || actingRole === 'grid_manager');
  const isHighPrivilegeRole = isHighPrivilegeActual || isHighPrivilegeActing;

  // 檢查是否為網格建立者
  const isCreator = user && gridCreatorId && user.id === gridCreatorId;

  // 規則：高權限角色 + 是網格建立者 = 可以看到該網格所有志工的聯絡資訊
  if (isHighPrivilegeRole && isCreator) {
    return registration;
  }

  // 規則：一般使用者和訪客只能看到自己的聯絡資訊
  if (isVolunteerSelf(user, registration)) {
    return registration;
  }

  // 訪客角色：即使有隱私權限，也看不到（因為不是志工本人/網格相關人員）
  // 一般用戶：即使有隱私權限，也看不到（因為不是志工本人/網格相關人員）
  return {
    ...registration,
    // 邏輯：
    // - 如果有值（非 null/undefined/空字串）→ 設為 'NO_ACCESS_PERMISSION'（前端顯示權限提示）
    // - 如果沒值（null/undefined/空字串）→ 保持原值（前端顯示「未提供」）
    volunteer_phone: (registration.volunteer_phone && registration.volunteer_phone.trim() !== '') ? 'NO_ACCESS_PERMISSION' : registration.volunteer_phone,
    volunteer_email: (registration.volunteer_email && registration.volunteer_email.trim() !== '') ? 'NO_ACCESS_PERMISSION' : registration.volunteer_email,
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
 * 批次過濾網格聯絡資訊（優化版本 - 使用批次查詢）
 */
export async function filterGridsPrivacy(
  grids: Grid[],
  user: User | null,
  dbPool: any,
  options: ContactPrivacyOptions = {}
): Promise<Grid[]> {
  const startTime = Date.now();
  const { actingRole, canViewGridContact = false } = options;


  // 若沒有權限，直接過濾所有網格
  if (!canViewGridContact) {
    return grids.map(grid => ({
      ...grid,
      contact_info: undefined,
    }));
  }

  // 超級管理員和管理員可以看到所有網格聯絡資訊
  if (isAdmin(user, actingRole)) {
    return grids;
  }

  // 若沒有用戶資訊，隱藏所有聯絡資訊
  if (!user) {
    return grids.map(grid => ({
      ...grid,
      contact_info: undefined,
    }));
  }

  // 批次查詢：取得使用者報名過的所有網格 ID
  const gridIds = grids.map(g => g.id);
  const volunteerGridIds = new Set<string>();
  const donationGridIds = new Set<string>();


  if (dbPool && gridIds.length > 0) {
    const t1 = Date.now();
    // 查詢志工報名記錄
    const { rows: volunteerRows } = await dbPool.query(
      'SELECT DISTINCT grid_id FROM volunteer_registrations WHERE grid_id = ANY($1) AND user_id = $2 AND status != $3',
      [gridIds, user.id, 'cancelled']
    );
    volunteerRows.forEach((row: any) => volunteerGridIds.add(row.grid_id));

    const t2 = Date.now();
    // 查詢物資捐贈記錄
    const { rows: donationRows } = await dbPool.query(
      'SELECT DISTINCT grid_id FROM supply_donations WHERE grid_id = ANY($1) AND created_by_id = $2 AND status != $3',
      [gridIds, user.id, 'cancelled']
    );
    donationRows.forEach((row: any) => donationGridIds.add(row.grid_id));
  }

  const t3 = Date.now();
  // 過濾每個網格
  const result = grids.map(grid => {
    // 網格建立者本人可以看到
    if (grid.created_by_id === user.id) {
      return grid;
    }

    // 網格管理員可以看到
    if (grid.grid_manager_id === user.id) {
      return grid;
    }

    // 已報名的志工可以看到
    if (volunteerGridIds.has(grid.id)) {
      return grid;
    }

    // 已捐贈的捐贈者可以看到
    if (donationGridIds.has(grid.id)) {
      return grid;
    }

    // 其他人看不到聯絡資訊
    return {
      ...grid,
      contact_info: undefined,
    };
  });

  return result;
}
