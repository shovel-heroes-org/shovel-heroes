-- 為 announcements 表新增 status 欄位以支援垃圾桶功能
-- status 值：active（啟用）、inactive（停用）、deleted（已刪除，在垃圾桶中）

ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- 更新現有記錄的 status
UPDATE announcements
SET status = 'active'
WHERE status IS NULL OR status = '';

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);
