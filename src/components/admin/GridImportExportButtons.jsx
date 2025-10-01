import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Upload, FileText } from 'lucide-react';
// Fixed: corrected import path (file is functions.js, not functions/all)
import { exportGridsCSV, importGridsCSV } from '@/api/functions';

export default function GridImportExportButtons({ onImportSuccess }) {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await exportGridsCSV();
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'grids_export.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      alert('網格資料匯出成功！您可以直接修改此檔案後再匯入。');
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
            const response = await importGridsCSV({ csvContent });
            const result = response.data;
            
            if (result.success) {
                alert(`${result.message}\n${result.errors?.length > 0 ? '\n前幾個錯誤：\n' + result.errors.map(e => `第${e.row}行: ${e.error}`).join('\n') : ''}`);
                onImportSuccess();
            } else {
                alert(`匯入失敗：${result.error}`);
            }
        } catch (error) {
            console.error('Import failed:', error);
            alert('匯入失敗，請檢查檔案格式或網路連線。');
        } finally {
            setImporting(false);
            event.target.value = '';
        }
    };
    reader.readAsText(file);
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
        {exporting ? '匯出中...' : '匯出CSV (可直接匯入)'}
      </Button>

      <div className="relative">
        <Input
          type="file"
          accept=".csv"
          onChange={handleFileImport}
          disabled={importing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          id="csv-importer"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={importing}
          as="label"
          htmlFor="csv-importer"
          className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200 cursor-pointer"
        >
          <Upload className="w-4 h-4 mr-2" />
          {importing ? '匯入中...' : '匯入CSV'}
        </Button>
      </div>
    </div>
  );
}