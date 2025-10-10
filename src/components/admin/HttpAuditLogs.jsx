import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Download, Trash2, RefreshCw, Search, BarChart3, Eye, EyeOff } from 'lucide-react';
import {
  getHttpAuditLogs,
  getHttpAuditLogDetail,
  exportHttpAuditLogsToCSV,
  clearHttpAuditLogs,
  getHttpAuditLogsStats
} from '@/api/http-audit-logs';

export default function HttpAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  // 篩選條件
  const [filters, setFilters] = useState({
    method: '',
    path: '',
    status_code: '',
    user_id: ''
  });

  // 詳情對話框
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // 清除確認對話框
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearDays, setClearDays] = useState('all'); // 改為 'all' 而非空字串

  // 敏感資訊顯示開關
  const [showIpAddresses, setShowIpAddresses] = useState(false);
  const [showUserIds, setShowUserIds] = useState(false);

  // 載入日誌
  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v)
        )
      };

      const data = await getHttpAuditLogs(params);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('載入 HTTP 請求日誌失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  // 載入統計資訊
  const loadStats = async () => {
    try {
      const data = await getHttpAuditLogsStats();
      setStats(data);
    } catch (error) {
      console.error('載入統計資訊失敗:', error);
    }
  };

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [page]);

  // 查看詳情
  const handleViewDetail = async (log) => {
    try {
      const detail = await getHttpAuditLogDetail(log.id);
      setSelectedLog(detail);
      setShowDetailDialog(true);
    } catch (error) {
      console.error('載入日誌詳情失敗:', error);
    }
  };

  // 匯出 CSV
  const handleExport = async () => {
    try {
      await exportHttpAuditLogsToCSV(filters);
    } catch (error) {
      console.error('匯出失敗:', error);
      alert('匯出失敗');
    }
  };

  // 清除日誌
  const handleClear = async () => {
    try {
      // 如果是 'all' 則傳 null,否則傳數字
      const days = clearDays === 'all' ? null : parseInt(clearDays);
      await clearHttpAuditLogs(days);
      setShowClearDialog(false);
      alert(days ? `已清除 ${days} 天前的日誌` : '已清除所有日誌');
      loadLogs();
      loadStats();
    } catch (error) {
      console.error('清除失敗:', error);
      alert('清除失敗');
    }
  };

  // 搜尋
  const handleSearch = () => {
    setPage(1);
    loadLogs();
  };

  // HTTP 方法顏色
  const getMethodColor = (method) => {
    const colors = {
      'GET': 'bg-blue-100 text-blue-800',
      'POST': 'bg-green-100 text-green-800',
      'PUT': 'bg-yellow-100 text-yellow-800',
      'PATCH': 'bg-orange-100 text-orange-800',
      'DELETE': 'bg-red-100 text-red-800'
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  // 狀態碼顏色
  const getStatusColor = (status) => {
    if (status < 300) return 'text-green-600';
    if (status < 400) return 'text-blue-600';
    if (status < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">總請求數</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">平均回應時間</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(stats.avgDuration)} ms</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">成功率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.byStatus.find(s => s.status_group === '2xx')
                  ? Math.round((stats.byStatus.find(s => s.status_group === '2xx').count / stats.total) * 100)
                  : 0}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">錯誤數</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.byStatus.filter(s => s.status_group === '4xx' || s.status_group === '5xx')
                  .reduce((sum, s) => sum + parseInt(s.count), 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 篩選和操作 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>HTTP 請求日誌</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadLogs}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                重新整理
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-2" />
                匯出 CSV
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowClearDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                清除日誌
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 篩選區域 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <Select
              value={filters.method || "all"}
              onValueChange={(value) => setFilters({ ...filters, method: value === "all" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="HTTP 方法" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部方法</SelectItem>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="路徑篩選..."
              value={filters.path}
              onChange={(e) => setFilters({ ...filters, path: e.target.value })}
            />

            <Select
              value={filters.status_code || "all"}
              onValueChange={(value) => setFilters({ ...filters, status_code: value === "all" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="狀態碼" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部狀態</SelectItem>
                <SelectItem value="200">200 OK</SelectItem>
                <SelectItem value="201">201 Created</SelectItem>
                <SelectItem value="400">400 Bad Request</SelectItem>
                <SelectItem value="401">401 Unauthorized</SelectItem>
                <SelectItem value="403">403 Forbidden</SelectItem>
                <SelectItem value="404">404 Not Found</SelectItem>
                <SelectItem value="500">500 Server Error</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="使用者 ID..."
              value={filters.user_id}
              onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
            />

            <Button onClick={handleSearch} className="w-full">
              <Search className="w-4 h-4 mr-2" />
              搜尋
            </Button>
          </div>

          {/* 日誌表格 */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">方法</TableHead>
                  <TableHead>路徑</TableHead>
                  <TableHead className="w-[100px]">狀態</TableHead>
                  <TableHead className="w-[120px]">耗時 (ms)</TableHead>
                  <TableHead className="w-[150px]">
                    <div className="flex items-center gap-2">
                      IP位址
                      <button
                        onClick={() => setShowIpAddresses(!showIpAddresses)}
                        className="text-gray-500 hover:text-gray-700"
                        title={showIpAddresses ? "隱藏 IP" : "顯示 IP"}
                      >
                        {showIpAddresses ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </TableHead>
                  <TableHead className="w-[180px]">時間</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      載入中...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      無日誌記錄
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getMethodColor(log.method)}`}>
                          {log.method}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{log.path}</TableCell>
                      <TableCell>
                        <span className={`font-semibold ${getStatusColor(log.status_code)}`}>
                          {log.status_code}
                        </span>
                      </TableCell>
                      <TableCell>{log.duration_ms}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {showIpAddresses ? (log.ip || '-') : '•••.•••.•••.•••'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(log.created_at).toLocaleString('zh-TW')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(log)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 分頁 */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              共 {total} 筆記錄，第 {page} / {Math.ceil(total / pageSize)} 頁
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                上一頁
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / pageSize)}
              >
                下一頁
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 詳情對話框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>HTTP 請求詳情</DialogTitle>
            <DialogDescription>
              {selectedLog && `${selectedLog.method} ${selectedLog.path}`}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">基本資訊</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">ID:</dt>
                      <dd className="font-mono">{selectedLog.id}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">方法:</dt>
                      <dd>{selectedLog.method}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">狀態碼:</dt>
                      <dd className={getStatusColor(selectedLog.status_code)}>{selectedLog.status_code}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">耗時:</dt>
                      <dd>{selectedLog.duration_ms} ms</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">IP:</dt>
                      <dd className="font-mono">{selectedLog.ip}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">使用者 ID:</dt>
                      <dd className="font-mono">{selectedLog.user_id || '-'}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">路徑與查詢</h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-600">路徑</p>
                      <p className="font-mono text-sm bg-gray-50 p-2 rounded">{selectedLog.path}</p>
                    </div>
                    {selectedLog.query && (
                      <div>
                        <p className="text-xs text-gray-600">查詢參數</p>
                        <pre className="font-mono text-xs bg-gray-50 p-2 rounded overflow-auto">
                          {JSON.stringify(selectedLog.query, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedLog.headers && (
                <div>
                  <h4 className="font-semibold mb-2">Headers</h4>
                  <pre className="font-mono text-xs bg-gray-50 p-3 rounded overflow-auto max-h-40">
                    {JSON.stringify(selectedLog.headers, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.request_body && (
                <div>
                  <h4 className="font-semibold mb-2">Request Body</h4>
                  <pre className="font-mono text-xs bg-gray-50 p-3 rounded overflow-auto max-h-60">
                    {JSON.stringify(selectedLog.request_body, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.response_body && (
                <div>
                  <h4 className="font-semibold mb-2">Response Body</h4>
                  <pre className="font-mono text-xs bg-gray-50 p-3 rounded overflow-auto max-h-60">
                    {typeof selectedLog.response_body === 'string'
                      ? selectedLog.response_body
                      : JSON.stringify(selectedLog.response_body, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.error && (
                <div>
                  <h4 className="font-semibold mb-2 text-red-600">錯誤訊息</h4>
                  <pre className="font-mono text-xs bg-red-50 p-3 rounded overflow-auto">
                    {selectedLog.error}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 清除確認對話框 */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認清除日誌</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>此操作無法復原，請謹慎操作。</p>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    清除範圍
                  </label>
                  <Select value={clearDays} onValueChange={setClearDays}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">清除所有日誌</SelectItem>
                      <SelectItem value="7">清除 7 天前的日誌</SelectItem>
                      <SelectItem value="30">清除 30 天前的日誌</SelectItem>
                      <SelectItem value="90">清除 90 天前的日誌</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClear}
              className="bg-red-600 hover:bg-red-700"
            >
              確認清除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
