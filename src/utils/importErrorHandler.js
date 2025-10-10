/**
 * 解析匯入錯誤並回傳使用者友善的錯誤訊息
 * @param {Error} error - 捕獲的錯誤物件
 * @returns {string} - 格式化後的錯誤訊息
 */
export function parseImportError(error) {
  let errorMsg = '匯入失敗';

  if (!error || !error.message) {
    return `${errorMsg}：未知錯誤`;
  }

  const message = error.message;

  // 檢查常見的錯誤類型
  if (message.includes('403') || message.includes('Forbidden')) {
    return '匯入失敗：您沒有權限執行此操作,請聯繫管理員';
  }

  if (message.includes('401') || message.includes('Unauthorized')) {
    return '匯入失敗：登入已過期,請重新登入';
  }

  if (message.includes('Permission not configured')) {
    return '匯入失敗：系統權限未正確設定,請聯繫系統管理員';
  }

  if (message.includes('does not have permission')) {
    return '匯入失敗：權限不足,您的角色無法執行此操作';
  }

  if (message.includes('404') || message.includes('Not Found')) {
    return '匯入失敗：找不到匯入路徑,請檢查系統設定';
  }

  if (message.includes('500') || message.includes('Internal Server Error')) {
    return '匯入失敗：伺服器錯誤,請稍後再試';
  }

  if (message.includes('Network') || message.includes('fetch')) {
    return '匯入失敗：網路連線錯誤,請檢查網路連線';
  }

  // 如果有 JSON 格式的錯誤訊息,嘗試解析
  try {
    const jsonMatch = message.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const errorData = JSON.parse(jsonMatch[0]);
      if (errorData.message) {
        return `匯入失敗：${errorData.message}`;
      }
      if (errorData.detail) {
        return `匯入失敗：${errorData.detail}`;
      }
    }
  } catch (e) {
    // 無法解析 JSON,繼續使用原始訊息
  }

  // 回傳原始錯誤訊息
  return `匯入失敗：${message}`;
}
