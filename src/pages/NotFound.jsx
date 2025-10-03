import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
      <h1 className="text-5xl font-extrabold text-gray-900 mb-4">404</h1>
      <p className="text-lg text-gray-600 mb-8">找不到頁面 Page not found</p>
      <div className="flex gap-3">
        <Link to="/">
          <span className="inline-block bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2">回到首頁 Home</span>
        </Link>
        <Link to="/map">
          <span className="inline-block border border-gray-300 hover:bg-gray-50 text-gray-800 rounded px-4 py-2">前往地圖 Map</span>
        </Link>
      </div>
    </div>
  );
}


