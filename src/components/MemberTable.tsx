import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  Search,
  Send,
  Trash2,
  User,
  X,
} from 'lucide-react';
import type { Gender, Member } from '../types/member';

interface MemberTableProps {
  members: Member[];
  isImporting: boolean;
  resendingId: string | null;
  onImportExcel: (file: File) => Promise<void>;
  onExportExcel: () => void;
  onCopyGoogleSheets: () => Promise<void>;
  onDeleteMember: (id: string) => void;
  onResendTelegram: (member: Member) => Promise<void>;
}

type GenderFilter = 'all' | Gender;

export function MemberTable({
  members,
  isImporting,
  resendingId,
  onImportExcel,
  onExportExcel,
  onCopyGoogleSheets,
  onDeleteMember,
  onResendTelegram,
}: MemberTableProps) {
  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [copiedJustNow, setCopiedJustNow] = useState(false);

  const [previewMember, setPreviewMember] = useState<Member | null>(null);
  const [confirmDeleteMember, setConfirmDeleteMember] = useState<Member | null>(
    null
  );

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      if (genderFilter !== 'all' && m.gender !== genderFilter) {
        return false;
      }
      if (!q) return true;
      return (
        m.fullName.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q) ||
        m.telegram.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.joinDate.toLowerCase().includes(q)
      );
    });
  }, [members, searchQuery, genderFilter]);

  const handleExcelFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await onImportExcel(file);
    } finally {
      if (excelInputRef.current) {
        excelInputRef.current.value = '';
      }
    }
  };

  const handleCopyClick = async () => {
    await onCopyGoogleSheets();
    setCopiedJustNow(true);
    window.setTimeout(() => setCopiedJustNow(false), 2000);
  };

  const handleConfirmDelete = () => {
    if (!confirmDeleteMember) return;
    onDeleteMember(confirmDeleteMember.id);
    setConfirmDeleteMember(null);
  };

  return (
    <section
      aria-labelledby="member-table-heading"
      className="rounded-xl border border-slate-200 bg-white"
    >
      {/* Top Toolbar: Title + Excel & Google Sheets Actions */}
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-baseline gap-2.5">
            <h2
              id="member-table-heading"
              className="text-lg font-semibold text-slate-900"
            >
              បញ្ជីសមាជិក និងភ្ញៀវ
            </h2>
            <span className="text-xs text-slate-500 tabular-nums">
              · {filteredMembers.length} / {members.length} នាក់
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelFileChange}
              className="sr-only"
            />

            <button
              type="button"
              onClick={() => excelInputRef.current?.click()}
              disabled={isImporting}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C] whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              {isImporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
              )}
              នាំចូល Excel (.xlsx)
            </button>

            <button
              type="button"
              onClick={onExportExcel}
              disabled={members.length === 0}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C] whitespace-nowrap shrink-0 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Download className="h-3.5 w-3.5 text-[#0F4C5C]" aria-hidden="true" />
              នាំចេញ Excel (.xlsx)
            </button>

            <button
              type="button"
              onClick={handleCopyClick}
              disabled={members.length === 0}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C] whitespace-nowrap shrink-0 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {copiedJustNow ? (
                <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
              )}
              {copiedJustNow ? 'បានចម្លងរួចរាល់' : 'ចម្លងសម្រាប់ Google Sheets'}
            </button>

            <a
              href="https://sheets.new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-1 whitespace-nowrap shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              បើក Google Sheets
            </a>
          </div>
        </div>

        {/* Search & Segmented Gender Filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ស្វែងរកតាមឈ្មោះ លេខទូរសព្ទ Telegram តួនាទី ឬកាលបរិច្ឆេទ..."
              aria-label="ស្វែងរកសមាជិក"
              className="block min-h-[40px] w-full rounded-lg border border-slate-300 bg-slate-50/70 py-2 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#0F4C5C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="សម្អាតការស្វែងរក"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="ច្រោះតាមភេទ"
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 p-1"
          >
            {(
              [
                { value: 'all', label: 'ទាំងអស់' },
                { value: 'ប្រុស', label: 'ប្រុស' },
                { value: 'ស្រី', label: 'ស្រី' },
              ] as const
            ).map((tab) => {
              const active = genderFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setGenderFilter(tab.value)}
                  className={`min-h-[32px] rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C] ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Table / Empty States */}
      {members.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <User className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            មិនទាន់មានទិន្នន័យសមាជិក ឬភ្ញៀវនៅឡើយទេ
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
            ចាប់ផ្តើមចុះឈ្មោះសមាជិកដំបូងតាមទម្រង់ខាងឆ្វេង ឬចុចប៊ូតុង «នាំចូល Excel (.xlsx)» ដើម្បីបញ្ចូលបញ្ជីឈ្មោះច្រើនក្នុងពេលតែមួយ។
          </p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <p className="text-sm font-medium text-slate-700">
            រកមិនឃើញសមាជិកដែលត្រូវនឹងការស្វែងរក «{searchQuery}» ទេ
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setGenderFilter('all');
            }}
            className="mt-3 inline-flex min-h-[38px] items-center rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            បង្ហាញសមាជិកទាំងអស់វិញ
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th scope="col" className="py-3 pl-5 pr-3 whitespace-nowrap">
                  សមាជិក / រូបភាព
                </th>
                <th scope="col" className="px-3 py-3 whitespace-nowrap">
                  ភេទ
                </th>
                <th scope="col" className="px-3 py-3 whitespace-nowrap">
                  លេខទូរសព្ទ
                </th>
                <th scope="col" className="px-3 py-3 whitespace-nowrap">
                  Telegram
                </th>
                <th scope="col" className="px-3 py-3 whitespace-nowrap">
                  តួនាទី / ប្រភេទភ្ញៀវ
                </th>
                <th scope="col" className="px-3 py-3 whitespace-nowrap">
                  កាលបរិច្ឆេទ
                </th>
                <th
                  scope="col"
                  className="py-3 pl-3 pr-5 text-right whitespace-nowrap"
                >
                  សកម្មភាព
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((member) => {
                const tgHandle = member.telegram.replace(/^@/, '');
                const isResending = resendingId === member.id;

                return (
                  <tr
                    key={member.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    {/* Photo Thumbnail + Full Name */}
                    <td className="py-3 pl-5 pr-3">
                      <div className="flex items-center gap-3">
                        {member.photoDataUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewMember(member)}
                            aria-label={`មើលរូបភាព ${member.fullName}`}
                            className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C]"
                          >
                            <img
                              src={member.photoDataUrl}
                              alt={member.fullName}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ) : (
                          <div
                            aria-hidden="true"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-600"
                          >
                            {member.fullName.slice(0, 1)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900 max-w-[180px] sm:max-w-[220px]">
                            {member.fullName}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Gender (Unboxed clean text) */}
                    <td className="px-3 py-3 whitespace-nowrap text-slate-700">
                      {member.gender}
                    </td>

                    {/* Phone Number */}
                    <td className="px-3 py-3 whitespace-nowrap font-mono text-[13px] tabular-nums text-slate-800">
                      {member.phone}
                    </td>

                    {/* Telegram */}
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                      {tgHandle ? (
                        <a
                          href={`https://t.me/${encodeURIComponent(tgHandle)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0F4C5C] hover:underline"
                        >
                          @{tgHandle}
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Role / Category */}
                    <td className="px-3 py-3 text-slate-700">
                      <span className="block max-w-[180px] truncate">
                        {member.role}
                      </span>
                    </td>

                    {/* Join Date */}
                    <td className="px-3 py-3 whitespace-nowrap font-mono text-[13px] tabular-nums text-slate-600">
                      {member.joinDate}
                    </td>

                    {/* Row Actions */}
                    <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onResendTelegram(member)}
                          disabled={isResending}
                          title="ផ្ញើព័ត៌មានទៅ Telegram ម្តងទៀត"
                          aria-label={`ផ្ញើព័ត៌មាន ${member.fullName} ទៅ Telegram`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-500 transition-colors hover:border-slate-200 hover:bg-slate-100 hover:text-[#0F4C5C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C] disabled:opacity-50"
                        >
                          {isResending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmDeleteMember(member)}
                          aria-label={`លុប ${member.fullName}`}
                          className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-transparent px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:border-red-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 whitespace-nowrap"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          លុប
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Photo Lightbox Preview Modal */}
      {previewMember && previewMember.photoDataUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`រូបភាពរបស់ ${previewMember.fullName}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4"
          onClick={() => setPreviewMember(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-slate-900">
                  {previewMember.fullName}
                </h3>
                <p className="text-xs text-slate-500">
                  {previewMember.role} · {previewMember.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewMember(null)}
                aria-label="បិទ"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="bg-slate-100 p-4">
              <img
                src={previewMember.photoDataUrl}
                alt={previewMember.fullName}
                referrerPolicy="no-referrer"
                className="mx-auto max-h-[65vh] w-auto rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal (avoids window.confirm in iframe) */}
      {confirmDeleteMember && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setConfirmDeleteMember(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="delete-confirm-title"
              className="text-base font-semibold text-slate-900"
            >
              បញ្ជាក់ការលុបទិន្នន័យ
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              តើអ្នកពិតជាចង់លុបឈ្មោះ{' '}
              <span className="font-semibold text-slate-900">
                {confirmDeleteMember.fullName}
              </span>{' '}
              ចេញពីបញ្ជីមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteMember(null)}
                className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                បោះបង់
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="min-h-[38px] rounded-lg bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700 whitespace-nowrap"
              >
                លុបចេញ
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
