import React, { useEffect, useState } from 'react';
import { API_BASE } from '@/api/rest/client';
import { Link, useNavigate } from 'react-router-dom';

export default function LineReturn() {
  const [status, setStatus] = useState('處理中...');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const err = url.searchParams.get('error');
    if (err) {
      setError(err);
      setStatus('登入失敗');
      return;
    }
    if (!code || !state) {
      setError('缺少授權參數');
      setStatus('登入失敗');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/line/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state })
        });
        if (!res.ok) {
          const txt = await res.text();
            throw new Error(txt || '交換授權碼失敗');
        }
        const json = await res.json();
        if (json.token) {
          localStorage.setItem('sh_token', json.token);
            // Notify app auth state changed so Layout can refresh immediately
          window.dispatchEvent(new Event('sh-auth-changed'));
          setStatus('登入成功，跳轉中...');
          setTimeout(() => navigate('/', { replace: true }), 500);
        } else {
          setError('未取得 token');
          setStatus('登入失敗');
        }
      } catch (e) {
        setError(e.message);
        setStatus('登入失敗');
      }
    })();
  }, [navigate]);

  return (
    <div className="max-w-md mx-auto mt-24 p-6 bg-white rounded-xl shadow border space-y-4 text-center">
      <h1 className="text-xl font-semibold">LINE 登入</h1>
      <p className="text-sm text-gray-600">{status}</p>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="pt-4">
        <Link to="/" className="text-blue-600 underline text-sm">返回首頁</Link>
      </div>
    </div>
  );
}
