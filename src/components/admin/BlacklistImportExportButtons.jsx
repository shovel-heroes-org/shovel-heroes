import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Upload } from 'lucide-react';
import {
  exportBlacklistToCSV,
  importBlacklistFromCSV
} from '@/api/admin';

export default function BlacklistImportExportButtons({ onImportSuccess }) {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportBlacklistToCSV();
      alert('黑名單資料匯出成功！');
    } catch (error) {
      console.error('Export failed:', error);
      alert('匯出失敗，請稍後再試。');
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
        const result = await importBlacklistFromCSV(csvContent);

        if (result.imported > 0 || result.skipped > 0) {
          let message = `匯入完成！\n成功：${result.imported} 筆\n跳過：${result.skipped} 筆`;
          if (result.errors && result.errors.length > 0) {
            message += `\n\n錯誤：\n${result.errors.slice(0, 5).join('\n')}`;
            if (result.errors.length > 5) {
              message += `\n... 還有 ${result.errors.length - 5} 個錯誤`;
            }
          }
          alert(message);
          onImportSuccess && onImportSuccess();
        } else {
          alert('匯入失敗：沒有成功匯入任何資料');
        }
      } catch (error) {
        console.error('Import failed:', error);
        alert(`匯入失敗：${error.message || '請檢查檔案格式或網路連線'}`);
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

      <div className="relative inline-block">
        <Input
          type="file"
          accept=".csv"
          onChange={handleFileImport}
          disabled={importing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          id="blacklist-csv-importer"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={importing}
          as="label"
          htmlFor="blacklist-csv-importer"
          className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200 cursor-pointer"
        >
          <Upload className="w-4 h-4 mr-2" />
          {importing ? '匯入中...' : '匯入CSV'}
        </Button>
      </div>
    </div>
  );
}
