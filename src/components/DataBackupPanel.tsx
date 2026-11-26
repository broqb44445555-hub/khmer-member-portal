import React, { useMemo, useRef, useState } from 'react';
import {
  Cloud,
  Database,
  Download,
  FileSpreadsheet,
  HardDrive,
  Loader2,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Member } from '../types/member';

interface DataBackupPanelProps {
  members: Member[];
  isMutating: boolean;
  onExportBackupJson: () => void;
  onImportBackupJson: (file: File, mode: 'merge' | 'replace') => Promise<void>;
  onDownloadExcelTemplate: () => void;
  onClearAllData: () => Promise<void>;
}

export function DataBackupPanel({
  members,
  isMutating,
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
    return {
      total: members.length,
      withPhotoCount,
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
          បម្រុងទុក ស្តារ និងគ្រប់គ្រងទិន្នន័យរួម
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          ទិន្នន័យទាំងអស់ត្រូវបានផ្ទុករួមគ្នាលើ Google Sheets (Cloud) ដើម្បីឱ្យគ្រប់ទូរសព្ទ និងកុំព្យូទ័រមើលឃើញទិន្នន័យដូចគ្នាភ្លាមៗ
        </p>
      </div>

      {/* Cloud Database Overview Row */}
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
          <p className="text-xs text-slate-500">ប្រភពផ្ទុកទិន្នន័យ</p>
          <p className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-[#0F4C5C]">
            <Cloud className="h-4 w-4 shrink-0" aria-hidden="true" />
            Google Apps Script Cloud DB
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

      {/* Action Rows */}
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
                ទាញយកច្បាប់ចម្លងទិន្នន័យសមាជិកទាំងអស់រួមទាំងរូបភាព Thumbnail ទុកជាឯកសារបម្រុង។
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onExportBackupJson}
            disabled={members.length === 0 || isMutating}
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
                ស្តារទិន្នន័យពីឯកសារ JSON ទៅកាន់ Cloud DB
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                បញ្ចូលបន្ថែមទៅលើប្រព័ន្ធទិន្នន័យរួម ឬជំនួសទិន្នន័យទាំងអស់ដោយប្រើឯកសារបម្រុងទុក។
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isMutating}
              onClick={() => triggerRestore('merge')}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap disabled:opacity-50"
            >
              {isMutating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              បញ្ចូលបន្ថែម (Merge)
            </button>
            <button
              type="button"
              disabled={isMutating}
              onClick={() => triggerRestore('replace')}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap disabled:opacity-50"
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
                លុបទិន្នន័យសមាជិកទាំងអស់ចេញពីប្រព័ន្ធទិន្នន័យរួម។ សូមនាំចេញ Excel ឬ JSON Backup ទុកជាមុនសិន។
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsConfirmClearOpen(true)}
            disabled={members.length === 0 || isMutating}
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
          onClick={() => !isMutating && setIsConfirmClearOpen(false)}
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
              នាក់ចេញពីប្រព័ន្ធទិន្នន័យរួមមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isMutating}
                onClick={() => setIsConfirmClearOpen(false)}
                className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                បោះបង់
              </button>
              <button
                type="button"
                disabled={isMutating}
                onClick={async () => {
                  await onClearAllData();
                  setIsConfirmClearOpen(false);
                }}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700 whitespace-nowrap disabled:opacity-60"
              >
                {isMutating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                លុបទាំងអស់
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
