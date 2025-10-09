import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCreatedDate(createdTimestamp) {
  const today = new Date().toLocaleDateString("zh-TW");
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString(
      "zh-TW"
  );
  const qiantian = new Date(Date.now() - 2 * 86400000).toLocaleDateString(
      "zh-TW"
  );
  const createdDate = new Date(createdTimestamp).toLocaleDateString("zh-TW");
  const createdTime = new Date(createdTimestamp).toLocaleTimeString("zh-TW");

  if (createdDate == today) return "今天 " + createdTime;
  else if (createdDate == yesterday) return "昨天 " + createdTime;
  else if (createdDate == qiantian) return "前天 " + createdTime;
  else return createdDate.split("2025/")[1] + " " + createdTime;
}

export const updateLocalStorage = (key, value) => window.localStorage.setItem(key, JSON.stringify(value));
export const getLocalStorage = (key) => {
  try { return JSON.parse(window.localStorage.getItem(key)); }
  catch (e) { 
    console.error("Error getting or parsing localStorage item:", e); 
    return null;
  }
}
export const deleteLocalStorage = (key) => window.localStorage.removeItem(key);