import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogIn } from 'lucide-react';
import { User } from '@/api/entities';

/**
 * 登入請求對話框
 * 當訪客嘗試執行需要登入的操作時顯示
 */
export default function LoginRequiredDialog({ open, onOpenChange, action = "執行此操作" }) {
  const handleLogin = () => {
    // 使用與右上角登入按鈕相同的邏輯
    User.login();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <LogIn className="w-5 h-5 text-blue-600" />
            需要登入
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            您需要登入才能{action}。
          </AlertDialogDescription>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-700">登入後您可以：</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
              <li>建立救災需求網格</li>
              <li>報名成為志工</li>
              <li>捐贈物資</li>
              <li>查看您的活動記錄</li>
            </ul>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLogin}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <LogIn className="w-4 h-4 mr-2" />
            前往登入
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
