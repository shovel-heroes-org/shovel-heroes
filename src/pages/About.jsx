import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Star, ExternalLink, AlertTriangle, MessageCircle } from 'lucide-react';
import { GithubIcon } from '@/components/icons/GithubIcon';

export default function AboutPage() {
  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4 min-w-[436px]">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            關於 鏟子英雄
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            一個為花蓮風災而生的緊急志工與物資媒合平台。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Contact Us Card */}
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <MessageCircle className="w-6 h-6 text-orange-500" />
                <span className="text-2xl font-bold">聯絡我們</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                如果您有任何問題、建議或合作邀請，歡迎透過以下方式聯絡我們：
              </p>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="font-semibold text-gray-800 mb-3">平台管理員</p>
                <a
                  href="https://forms.gle/SjaLLGNSNvgj4Sjy5"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Mail className="w-4 h-4 mr-2" />
                    透過表單聯絡我們
                  </Button>
                </a>
              </div>
              <p className="text-sm text-gray-500">
                我們會盡快回覆您的訊息，感謝您的耐心等待！
              </p>
            </CardContent>
          </Card>

          {/* Feedback Card */}
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Star className="w-6 h-6 text-purple-500" />
                <span className="text-2xl font-bold">功能許願與回饋</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                這個平台是為了花蓮風災緊急建立的志工媒合頁面。如果您有新的想法或功能需求，或是發現了任何問題，歡迎告訴我們！
              </p>
              <a href="https://forms.gle/SjaLLGNSNvgj4Sjy5" target="_blank" rel="noopener noreferrer">
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  填寫功能許願表單
                </Button>
              </a>
              <a
                href="https://github.com/shovel-heroes-org/shovel-heroes/issues/new/choose"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  className="w-full border-gray-300 hover:border-gray-400 flex items-center justify-center gap-2"
                >
                  <GithubIcon size={16} />
                  前往 GitHub 專案
                </Button>
              </a>
              <p className="text-sm text-gray-500">
                您的每一個建議都很重要，讓我們一起讓平台變得更好！
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 免責聲明 */}
        <Card className="border-l-4 border-l-red-500 bg-red-50">
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
  );
}