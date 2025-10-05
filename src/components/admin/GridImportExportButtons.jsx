import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Upload, FileText } from 'lucide-react';
import { exportGridsToCSV, exportTrashGridsToCSV, importGridsFromCSV } from '@/api/admin';
import { downloadGridTemplate } from '@/api/functions';
import { parseImportError } from '@/utils/importErrorHandler';

export default function GridImportExportButtons({ onImportSuccess, showMessage, isTrashView = false }) {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      if (isTrashView) {
        await exportTrashGridsToCSV();
        showMessage ? showMessage('垃圾桶網格資料匯出成功！', 'success') : alert('垃圾桶網格資料匯出成功！');
      } else {
        await exportGridsToCSV();
        showMessage ? showMessage('網格資料匯出成功！', 'success') : alert('網格資料匯出成功！');
      }
    } catch (error) {
      console.error('Export failed:', error);
      showMessage ? showMessage('匯出失敗，請稍後再試。', 'error') : alert('匯出失敗，請稍後再試。');
    } finally {
      setExporting(false);
    }
  };

  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
        const csvContent = e.target.result;
        try {
            const result = await importGridsFromCSV(csvContent, true);

            if (result.imported > 0 || result.skipped > 0) {
                let message = `匯入完成！成功：${result.imported} 筆，跳過：${result.skipped} 筆`;
                if (result.errors && result.errors.length > 0) {
                    message += `，錯誤：${result.errors.length} 筆`;
                }
                const messageType = result.errors && result.errors.length > 0 ? 'warning' : 'success';
                showMessage ? showMessage(message, messageType) : alert(message);
                onImportSuccess && onImportSuccess();
            } else {
                showMessage ? showMessage('匯入失敗：沒有成功匯入任何資料', 'error') : alert('匯入失敗：沒有成功匯入任何資料');
            }
        } catch (error) {
            console.error('Import failed:', error);
            const errorMsg = parseImportError(error);
            showMessage ? showMessage(errorMsg, 'error') : alert(errorMsg);
        } finally {
            setImporting(false);
            event.target.value = '';
        }
    };
    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleExport}
        disabled={exporting}
        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
      >
        <Download className="w-4 h-4 mr-2" />
        {exporting ? '匯出中...' : '匯出CSV'}
      </Button>

      <label htmlFor="csv-importer" className="relative inline-block cursor-pointer">
        <Input
          type="file"
          accept=".csv"
          onChange={handleFileImport}
          disabled={importing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          id="csv-importer"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={importing}
          className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200 cursor-pointer pointer-events-none"
        >
          <Upload className="w-4 h-4 mr-2" />
          {importing ? '匯入中...' : '匯入CSV'}
        </Button>
      </label>
    </div>
  );
}