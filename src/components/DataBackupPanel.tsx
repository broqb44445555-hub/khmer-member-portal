import React, { useMemo, useRef, useState } from 'react';
import {
  Database,
  Download,
  FileSpreadsheet,
  HardDrive,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Member } from '../types/member';

interface DataBackupPanelProps {
  members: Member[];
  onExportBackupJson: () => void;
  onImportBackupJson: (file: File, mode: 'merge' | 'replace') => Promise<void>;
  onDownloadExcelTemplate: () => void;
  onClearAllData: () => void;
}

export function DataBackupPanel({
  members,
  onExportBackupJson,
  onImportBackupJson,
  onDownloadExcelTemplate,
  onClearAllData,
}: DataBackupPanelProps) {
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  const storageStats = useMemo(() => {
    const withPhotoCount = members.filter((m) => Boolean(m.photoDataUrl)).length;
    let sizeKB = 0;
    try {
      const serialized = JSON.stringify(members);
      sizeKB = Math.round((new Blob([serialized]).size / 1024) * 10) / 10;
    } catch {
      sizeKB = 0;
    }
    return {
      total: members.length,
      withPhotoCount,
      sizeKB,
    };
  }, [members]);

  const handleJsonFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await onImportBackupJson(file, restoreMode);
    } finally {
      if (jsonInputRef.current) {
        jsonInputRef.current.value = '';
      }
    }
  };

  const triggerRestore = (mode: 'merge' | 'replace') => {
    setRestoreMode(mode);
    jsonInputRef.current?.click();
  };

  return (
    <section
      aria-labelledby="data-backup-heading"
      className="rounded-xl border border-slate-200 bg-white"
    >
      <div className="border-b border-slate-200 px-6 py-5">
        <h2
          id="data-backup-heading"
          className="text-lg font-semibold text-slate-900"
        >
          បម្រុងទុក ស្តារ និងគ្រប់គ្រងទិន្នន័យ
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          រក្សាទុកច្បាប់ចម្លងទិន្នន័យទាំងអស់ (រួមទាំងរូបភាព) ជាឯកសារ JSON ទាញយកគំរូ Excel ឬសម្អាតទិន្នន័យក្នុងកម្មវិធីរុករក
        </p>
      </div>

      {/* Storage Overview Row (Clean flat divider grid, zero nested cards) */}
      <div className="grid grid-cols-1 divide-y divide-slate-100 border-b border-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="px-6 py-4">
          <p className="text-xs text-slate-500">ទិន្នន័យសមាជិកសរុប</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {storageStats.total}{' '}
            <span className="font-sans text-xs font-normal text-slate-500">
              នាក់
            </span>
          </p>
        </div>

        <div className="px-6 py-4">
          <p className="text-xs text-slate-500">សមាជិកដែលមានរូបភាព</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {storageStats.withPhotoCount}{' '}
            <span className="font-sans text-xs font-normal text-slate-500">
              រូប
            </span>
          </p>
        </div>

        <div className="px-6 py-4">
          <p className="text-xs text-slate-500">ទំហំប្រើប្រាស់ក្នុង localStorage</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {storageStats.sizeKB}{' '}
            <span className="font-mono text-xs font-normal text-slate-500">
              KB
            </span>
          </p>
        </div>
      </div>

      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleJsonFileChange}
        className="sr-only"
      />

      {/* Action Rows separated by hairline dividers */}
      <div className="divide-y divide-slate-100">
        {/* 1. Export JSON Backup */}
        <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <HardDrive
              className="mt-0.5 h-5 w-5 shrink-0 text-[#0F4C5C]"
              aria-hidden="true"
            />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                បម្រុងទុកទិន្នន័យពេញលេញ (JSON Backup)
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                ទាញយកទិន្នន័យសមាជិកទាំងអស់រួមទាំងរូបភាព Thumbnail ទុកប្រើប្រាស់ ឬផ្ទេរទៅកុំព្យូទ័រផ្សេង។
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onExportBackupJson}
            disabled={members.length === 0}
            className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-[#0F4C5C] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0B3B49] whitespace-nowrap shrink-0 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            ទាញយក JSON Backup
          </button>
        </div>

        {/* 2. Restore / Merge JSON Backup */}
        <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Database
              className="mt-0.5 h-5 w-5 shrink-0 text-slate-600"
              aria-hidden="true"
            />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                ស្តារទិន្នន័យពីឯកសារ JSON
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                បញ្ចូលបន្ថែមទៅលើបញ្ជីបច្ចុប្បន្ន ឬជំនួសទិន្នន័យទាំងអស់ដោយប្រើឯកសារបម្រុងទុក។
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => triggerRestore('merge')}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              បញ្ចូលបន្ថែម (Merge)
            </button>
            <button
              type="button"
              onClick={() => triggerRestore('replace')}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              ជំនួសទាំងអស់ (Replace)
            </button>
          </div>
        </div>

        {/* 3. Download Excel Template */}
        <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <FileSpreadsheet
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
              aria-hidden="true"
            />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                ទាញយកឯកសារគំរូ Excel (.xlsx)
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                ឯកសារគំរូដែលមានក្បាលតារាងភាសាខ្មែរត្រឹមត្រូវ សម្រាប់បំពេញបញ្ជីឈ្មោះមុននឹងនាំចូលប្រព័ន្ធ។
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDownloadExcelTemplate}
            className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
            ទាញយកគំរូ Excel
          </button>
        </div>

        {/* 4. Clear All Data */}
        <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Trash2
              className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
              aria-hidden="true"
            />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                សម្អាតទិន្នន័យទាំងអស់
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                លុបទិន្នន័យសមាជិកទាំងអស់ចេញពី localStorage។ សូមនាំចេញ Excel ឬ JSON Backup ទុកជាមុនសិន។
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsConfirmClearOpen(true)}
            disabled={members.length === 0}
            className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 whitespace-nowrap shrink-0 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            លុបទិន្នន័យទាំងអស់
          </button>
        </div>
      </div>

      {/* Confirm Clear All Modal */}
      {isConfirmClearOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-all-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
          onClick={() => setIsConfirmClearOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="clear-all-confirm-title"
              className="text-base font-semibold text-slate-900"
            >
              បញ្ជាក់ការលុបទិន្នន័យទាំងអស់
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              តើអ្នកពិតជាចង់លុបទិន្នន័យសមាជិកទាំង{' '}
              <span className="font-mono font-semibold tabular-nums text-slate-900">
                {members.length}
              </span>{' '}
              នាក់ចេញទាំងអស់មែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsConfirmClearOpen(false)}
                className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                បោះបង់
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearAllData();
                  setIsConfirmClearOpen(false);
                }}
                className="min-h-[38px] rounded-lg bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700 whitespace-nowrap"
              >
                លុបទាំងអស់
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
