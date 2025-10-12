import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Star, ExternalLink, AlertTriangle, MessageCircle } from 'lucide-react';
import { GithubIcon } from '@/components/icons/GithubIcon';
import { UserPlus, Github } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            關於 鏟子英雄
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            一個為花蓮風災而生的緊急志工與物資媒合平台。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Volunteer Registration Form */}
          <Card className="hover:shadow-xl transition-all duration-300 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <UserPlus className="w-6 h-6" />
                <span className="text-2xl font-bold">志工申請表單</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <p className="text-gray-700">
                歡迎加入我們的志工團隊！請填寫申請表單，我們會儘快與您聯繫。
              </p>
              <a href="https://forms.gle/SFFHUAWuq7vQdbzj9" target="_blank" rel="noopener noreferrer">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 shadow-md">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  填寫志工申請表單
                </Button>
              </a>
              <p className="text-sm text-gray-600">
                填寫表單後，我們會根據您的專長和可用時間安排合適的救援任務。
              </p>
            </CardContent>
          </Card>

          {/* LINE Official Account */}
          <Card className="hover:shadow-xl transition-all duration-300 border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <MessageCircle className="w-6 h-6" />
                <span className="text-2xl font-bold">LINE 官方帳號</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <p className="text-gray-700">
                加入我們的 LINE 官方帳號，即時接收救援任務更新與緊急通知。
              </p>
              <div className="bg-green-100 border-2 border-green-300 p-4 rounded-lg">
                <p className="font-semibold text-gray-800 mb-2">LINE ID</p>
                <p className="text-green-700 text-lg font-mono font-bold">@shovel-heroes</p>
              </div>
              <a href="https://line.me/R/ti/p/@shovel-heroes" target="_blank" rel="noopener noreferrer">
                <Button className="w-full bg-green-600 hover:bg-green-700 shadow-md">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  加入 LINE 官方帳號
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* GitHub Open Source */}
          <Card className="hover:shadow-xl transition-all duration-300 border-2 border-gray-300 bg-gradient-to-br from-gray-50 to-white">
            <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <Github className="w-6 h-6" />
                <span className="text-2xl font-bold">開源專案</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <p className="text-gray-700">
                本專案為開源專案，歡迎開發者一起貢獻程式碼，讓救援系統更完善。
              </p>
              <div className="bg-gray-100 border-2 border-gray-300 p-4 rounded-lg">
                <p className="font-semibold text-gray-800 mb-2">GitHub Repository</p>
                <p className="text-gray-700 text-sm font-mono break-all">
                  github.com/shovel-heroes-org/shovel-heroes
                </p>
              </div>
              <a href="https://github.com/shovel-heroes-org/shovel-heroes" target="_blank" rel="noopener noreferrer">
                <Button className="w-full bg-gray-800 hover:bg-gray-900 shadow-md">
                  <Github className="w-4 h-4 mr-2" />
                  前往 GitHub 專案
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Contact Us Card */}
          <Card className="hover:shadow-xl transition-all duration-300 border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <Mail className="w-6 h-6" />
                <span className="text-2xl font-bold">聯絡我們</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <p className="text-gray-700">
                如果您有任何問題、建議或合作邀請，歡迎透過以下方式聯絡我們：
              </p>
              <div className="bg-orange-100 border-2 border-orange-300 p-4 rounded-lg">
                <p className="font-semibold text-gray-800 mb-2">平台管理員</p>
                <a href="mailto:tanya.ty.guo@gmail.com" className="flex items-center gap-2 text-orange-700 hover:text-orange-800 font-medium">
                  <Mail className="w-4 h-4" />
                  <span>tanya.ty.guo@gmail.com</span>
                </a>
              </div>
              <p className="text-sm text-gray-600">
                我們會盡快回覆您的訊息，感謝您的耐心等待！
              </p>
            </CardContent>
          </Card>

          {/* Feedback Card */}
          <Card className="hover:shadow-xl transition-all duration-300 md:col-span-2 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <Star className="w-6 h-6" />
                <span className="text-2xl font-bold">功能許願與回饋</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <p className="text-gray-700">
                這個平台是為了花蓮風災緊急建立的志工媒合頁面。如果您有新的想法或功能需求，或是發現了任何問題，歡迎告訴我們！
              </p>
              <a href="https://forms.gle/SjaLLGNSNvgj4Sjy5" target="_blank" rel="noopener noreferrer">
                <Button className="w-full bg-purple-600 hover:bg-purple-700 shadow-md">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  填寫功能許願表單
                </Button>
              </a>
              <p className="text-sm text-gray-600">
                您的每一個建議都很重要，讓我們一起讓平台變得更好！
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 免責聲明 */}
        <Card className="border-l-4 border-l-red-500 bg-red-50 mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-red-800">
              <AlertTriangle className="w-6 h-6" />
              <span className="text-2xl font-bold">免責聲明</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-red-800 space-y-3">
              <p>
                本平台僅提供災區資訊、志工人力及物資需求的媒合與曝光，旨在協助各方更快對接，不涉及任何金錢往來或志工行為管理。
              </p>
              <p>
                志工參與任務時，應自行評估風險，並全程負責自身安全與行為。
              </p>
              <p>
                本平台不對志工或第三方於救災過程中所發生的任何糾紛、損害、失竊、受傷或其他法律責任承擔責任。
              </p>
              <p>
                本平台提供之資訊僅供參考，真實需求與現場狀況請依當地管理單位、任務負責人或官方公告為準。
              </p>
              <p>
                若發現不當行為或爭議事件，請立即向當地主管機關或警方報案，本平台無調查或執法權限。
              </p>
              <p className="font-semibold bg-red-100 p-3 rounded-lg">
                使用本平台即表示您理解並同意上述免責條款。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
