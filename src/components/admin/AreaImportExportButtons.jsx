import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import {
  exportAreasToCSV,
  importAreasFromCSV,
  exportTrashAreasToCSV,
  importTrashAreasFromCSV
} from '@/api/admin';

export default function AreaImportExportButtons({ onImportSuccess, showMessage, isTrashView = false }) {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      if (isTrashView) {
        await exportTrashAreasToCSV();
        const message = '垃圾桶災區資料匯出成功！';
        showMessage ? showMessage(message, 'success') : alert(message);
      } else {
        await exportAreasToCSV();
        const message = '災區資料匯出成功！';
        showMessage ? showMessage(message, 'success') : alert(message);
      }
    } catch (error) {
      console.error('Export failed:', error);
      const message = '匯出失敗，請稍後再試。';
      showMessage ? showMessage(message, 'error') : alert(message);
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
        const result = isTrashView
          ? await importTrashAreasFromCSV(csvContent, true)
          : await importAreasFromCSV(csvContent, true);

        if (result.imported > 0 || result.skipped > 0) {
          const resourceName = isTrashView ? '垃圾桶災區' : '災區';
          const message = `${resourceName}匯入完成！成功：${result.imported} 筆，跳過：${result.skipped} 筆，錯誤：${result.errors?.length || 0} 筆`;
          if (result.errors && result.errors.length > 0) {
            showMessage ? showMessage(message, 'warning') : alert(message);
          } else {
            showMessage ? showMessage(message, 'success') : alert(message);
          }
          onImportSuccess && onImportSuccess();
        } else {
          const message = '匯入失敗：沒有成功匯入任何資料';
          showMessage ? showMessage(message, 'error') : alert(message);
        }
      } catch (error) {
        console.error('Import failed:', error);
        const message = `匯入失敗：${error.message || '請檢查檔案格式或網路連線'}`;
        showMessage ? showMessage(message, 'error') : alert(message);
      } finally {
        setImporting(false);
        event.target.value = '';
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="flex gap-2 flex-wrap">
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

      {/* 下載範本按鈕已移除 - 用戶要求不需要此功能 */}

      <label htmlFor="area-csv-importer" className="relative inline-block cursor-pointer">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileImport}
          disabled={importing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          id="area-csv-importer"
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
