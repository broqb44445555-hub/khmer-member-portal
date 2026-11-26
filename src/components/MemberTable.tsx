import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Download,
  FileSpreadsheet,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Send,
  Tag,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { BATTAMBANG_DISTRICTS } from '../data/battambangAddress';
import type { Gender, Member } from '../types/member';

interface MemberTableProps {
  members: Member[];
  isSyncing: boolean;
  syncError: string | null;
  isMutating: boolean;
  isImporting: boolean;
  resendingId: string | null;
  onRefresh: () => Promise<void>;
  onImportExcel: (file: File) => Promise<void>;
  onExportExcel: (subset?: Member[]) => void;
  onEditMember: (member: Member) => void;
  onDeleteMember: (id: string) => Promise<void>;
  onBulkDeleteMembers: (ids: string[]) => Promise<void>;
  onBulkUpdateRole: (ids: string[], newRole: string) => Promise<void>;
  onResendTelegram: (member: Member) => Promise<void>;
}

type GenderFilter = 'all' | Gender;
type SortOrder = 'newest' | 'oldest' | 'name-asc';

export function MemberTable({
  members,
  isSyncing,
  syncError,
  isMutating,
  isImporting,
  resendingId,
  onRefresh,
  onImportExcel,
  onExportExcel,
  onEditMember,
  onDeleteMember,
  onBulkDeleteMembers,
  onBulkUpdateRole,
  onResendTelegram,
}: MemberTableProps) {
  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewMember, setPreviewMember] = useState<Member | null>(null);
  const [confirmDeleteMember, setConfirmDeleteMember] = useState<Member | null>(
    null
  );
  const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);
  const [isBulkRoleModalOpen, setIsBulkRoleModalOpen] = useState(false);
  const [bulkRoleValue, setBulkRoleValue] = useState('');

  const uniqueRoles = useMemo(() => {
    const set = new Set<string>();
    for (const m of members) {
      const r = m.role.trim();
      if (r) set.add(r);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'km'));
  }, [members]);

  const districtOptions = useMemo(() => {
    const set = new Set<string>(BATTAMBANG_DISTRICTS);
    for (const m of members) {
      const d = m.address?.district?.trim();
      if (d) set.add(d);
    }
    return Array.from(set);
  }, [members]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = members.filter((m) => {
      if (genderFilter !== 'all' && m.gender !== genderFilter) {
        return false;
      }
      if (districtFilter !== 'all') {
        const memberDistrict = m.address?.district?.trim() || '';
        const memberFull = m.address?.fullAddress || '';
        if (
          memberDistrict !== districtFilter &&
          !memberFull.includes(districtFilter)
        ) {
          return false;
        }
      }
      if (roleFilter !== 'all' && m.role.trim() !== roleFilter) {
        return false;
      }
      if (!q) return true;
      return (
        m.fullName.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q) ||
        m.telegram.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.joinDate.toLowerCase().includes(q) ||
        (m.address?.fullAddress?.toLowerCase().includes(q) ?? false)
      );
    });

    if (sortOrder === 'oldest') {
      return [...list].sort((a, b) =>
        (a.joinDate || a.createdAt).localeCompare(b.joinDate || b.createdAt)
      );
    }
    if (sortOrder === 'name-asc') {
      return [...list].sort((a, b) =>
        a.fullName.localeCompare(b.fullName, 'km')
      );
    }
    return [...list].sort((a, b) =>
      (b.joinDate || b.createdAt).localeCompare(a.joinDate || a.createdAt)
    );
  }, [
    members,
    searchQuery,
    genderFilter,
    districtFilter,
    roleFilter,
    sortOrder,
  ]);

  // Keep selectedIds synced to valid existing IDs
  const validSelectedIds = useMemo(() => {
    const existing = new Set(members.map((m) => m.id));
    return Array.from(selectedIds).filter((id) => existing.has(id));
  }, [members, selectedIds]);

  const allFilteredSelected =
    filteredMembers.length > 0 &&
    filteredMembers.every((m) => selectedIds.has(m.id));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const m of filteredMembers) {
          next.delete(m.id);
        }
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const m of filteredMembers) {
          next.add(m.id);
        }
        return next;
      });
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

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

  const handleConfirmDelete = async () => {
    if (!confirmDeleteMember) return;
    const targetId = confirmDeleteMember.id;
    await onDeleteMember(targetId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(targetId);
      return next;
    });
    setConfirmDeleteMember(null);
  };

  const handleConfirmBulkDelete = async () => {
    if (validSelectedIds.length === 0) return;
    await onBulkDeleteMembers(validSelectedIds);
    clearSelection();
    setIsConfirmBulkDeleteOpen(false);
  };

  const handleBulkExport = () => {
    const idSet = new Set(validSelectedIds);
    const subset = members.filter((m) => idSet.has(m.id));
    onExportExcel(subset);
  };

  const handleSubmitBulkRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = bulkRoleValue.trim();
    if (!trimmed || validSelectedIds.length === 0) return;
    await onBulkUpdateRole(validSelectedIds, trimmed);
    setBulkRoleValue('');
    setIsBulkRoleModalOpen(false);
    clearSelection();
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    genderFilter !== 'all' ||
    districtFilter !== 'all' ||
    roleFilter !== 'all';

  return (
    <section
      aria-labelledby="member-table-heading"
      className="rounded-xl border border-slate-200 bg-white"
    >
      {/* Top Toolbar: Title + Excel Actions */}
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-baseline gap-2.5">
            <h2
              id="member-table-heading"
              className="text-lg font-semibold text-slate-900"
            >
              បញ្ជី និងការកែប្រែទិន្នន័យសមាជិក
            </h2>
            <span className="text-xs text-slate-500 tabular-nums">
              · បង្ហាញ {filteredMembers.length} / {members.length} នាក់
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onRefresh()}
              disabled={isSyncing || isMutating}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C] whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-[#0F4C5C] ${isSyncing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {isSyncing ? 'កំពុងទាញទិន្នន័យ...' : 'ធ្វើបច្ចុប្បន្នភាព / Refresh'}
            </button>

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
              disabled={isImporting || isMutating}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C] whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              {isImporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
              )}
              នាំចូល Excel
            </button>

            <button
              type="button"
              onClick={() => onExportExcel()}
              disabled={members.length === 0 || isSyncing}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#0F4C5C] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0B3B49] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C] focus-visible:ring-offset-1 whitespace-nowrap shrink-0 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              នាំចេញ Excel
            </button>
          </div>
        </div>

        {/* Cloud Sync Error Banner */}
        {syncError && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-800"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
              <span>{syncError}</span>
            </div>
            <button
              type="button"
              onClick={() => onRefresh()}
              disabled={isSyncing}
              className="rounded-md border border-red-300 bg-white px-3 py-1 font-medium text-red-700 hover:bg-red-50 whitespace-nowrap"
            >
              ព្យាយាមម្តងទៀត
            </button>
          </div>
        )}

        {/* Syncing Status Bar while mutating or refreshing existing rows */}
        {(isSyncing || isMutating) && members.length > 0 && (
          <div className="flex items-center gap-2 text-xs font-medium text-[#0F4C5C]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            <span>
              {isMutating
                ? 'កំពុងធ្វើបច្ចុប្បន្នភាពទិន្នន័យលើ Google Sheets...'
                : 'កំពុងទាញទិន្នន័យថ្មីបំផុតពី Google Sheets...'}
            </span>
          </div>
        )}

        {/* Search, Role Filter, Sort & Gender Segmented Filter */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
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

          <div className="flex flex-wrap items-center gap-2.5">
            {/* District Filter */}
            <select
              aria-label="ច្រោះតាមស្រុក/ក្រុង"
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
            >
              <option value="all">ស្រុក/ក្រុងទាំងអស់</option>
              {districtOptions.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>

            {/* Role Filter */}
            <select
              aria-label="ច្រោះតាមតួនាទី"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
            >
              <option value="all">តួនាទីទាំងអស់</option>
              {uniqueRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>

            {/* Sort Selector */}
            <select
              aria-label="តម្រៀបទិន្នន័យ"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
            >
              <option value="newest">តម្រៀប៖ ថ្មីបំផុត</option>
              <option value="oldest">តម្រៀប៖ ចាស់បំផុត</option>
              <option value="name-asc">តម្រៀប៖ ឈ្មោះ ក–អ</option>
            </select>

            {/* Gender Filter Tabs */}
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

        {/* Contextual Bulk Action Bar */}
        {validSelectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#0F4C5C]/20 bg-[#0F4C5C]/[0.04] px-4 py-2.5">
            <div className="flex items-center gap-3 text-xs font-medium text-slate-800">
              <span className="tabular-nums">
                បានជ្រើសរើស <strong className="font-mono">{validSelectedIds.length}</strong> នាក់
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline whitespace-nowrap"
              >
                ដកការជ្រើសរើស
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBulkRoleModalOpen(true)}
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                <Tag className="h-3.5 w-3.5 text-[#0F4C5C]" aria-hidden="true" />
                ប្តូរតួនាទីរួម
              </button>

              <button
                type="button"
                onClick={handleBulkExport}
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5 text-[#0F4C5C]" aria-hidden="true" />
                នាំចេញ Excel
              </button>

              <button
                type="button"
                onClick={() => setIsConfirmBulkDeleteOpen(true)}
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 whitespace-nowrap"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                លុបដែលបានជ្រើស ({validSelectedIds.length})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table / Loading Skeleton / Empty States */}
      {isSyncing && members.length === 0 ? (
        <div className="px-6 py-10">
          <div className="flex items-center justify-center gap-2.5 text-sm font-medium text-[#0F4C5C]">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span>កំពុងទាញទិន្នន័យសមាជិកពី Google Sheets...</span>
          </div>
          <div className="mt-6 space-y-3" aria-hidden="true">
            {[0, 1, 2, 3].map((row) => (
              <div
                key={row}
                className="flex items-center gap-4 border-b border-slate-100 pb-3"
              >
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="h-3.5 w-24 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      ) : members.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <User className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            មិនទាន់មានទិន្នន័យសមាជិក ឬភ្ញៀវនៅឡើយទេ
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
            អ្នកអាចបន្ថែមសមាជិកថ្មីតាមផ្ទាំង «បន្ថែមសមាជិកថ្មី» ឬចុចប៊ូតុង «នាំចូល Excel (.xlsx)» ដើម្បីបញ្ចូលបញ្ជីឈ្មោះច្រើនក្នុងពេលតែមួយ។
          </p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <p className="text-sm font-medium text-slate-700">
            រកមិនឃើញសមាជិកដែលត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setGenderFilter('all');
                setDistrictFilter('all');
                setRoleFilter('all');
              }}
              className="mt-3 inline-flex min-h-[38px] items-center rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              សម្អាតការច្រោះទាំងអស់
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th scope="col" className="w-11 py-3 pl-5 pr-2">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    aria-label="ជ្រើសរើសទាំងអស់"
                    className="h-4 w-4 rounded border-slate-300 accent-[#0F4C5C]"
                  />
                </th>
                <th scope="col" className="px-3 py-3 whitespace-nowrap">
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
                  ទីកន្លែងបច្ចុប្បន្ន
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
                const isSelected = selectedIds.has(member.id);

                return (
                  <tr
                    key={member.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-[#0F4C5C]/[0.04]' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 pl-5 pr-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(member.id)}
                        aria-label={`ជ្រើសរើស ${member.fullName}`}
                        className="h-4 w-4 rounded border-slate-300 accent-[#0F4C5C]"
                      />
                    </td>

                    {/* Photo Thumbnail + Full Name */}
                    <td className="px-3 py-3">
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
                          <button
                            type="button"
                            onClick={() => onEditMember(member)}
                            className="block max-w-[200px] truncate text-left font-medium text-slate-900 hover:text-[#0F4C5C] hover:underline sm:max-w-[240px]"
                          >
                            {member.fullName}
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Gender */}
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
                      <span className="block max-w-[160px] truncate">
                        {member.role}
                      </span>
                    </td>

                    {/* Current Address */}
                    <td className="px-3 py-3 text-slate-600">
                      {member.address?.fullAddress ? (
                        <span
                          title={member.address.fullAddress}
                          className="block max-w-[230px] truncate text-xs"
                        >
                          {member.address.fullAddress}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Join Date */}
                    <td className="px-3 py-3 whitespace-nowrap font-mono text-[13px] tabular-nums text-slate-600">
                      {member.joinDate}
                    </td>

                    {/* Row Actions: Edit, Resend Telegram, Delete */}
                    <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditMember(member)}
                          aria-label={`កែប្រែ ${member.fullName}`}
                          className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-[#0F4C5C]/40 hover:bg-slate-50 hover:text-[#0F4C5C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C] whitespace-nowrap"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          កែប្រែ
                        </button>

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

      {/* Single Delete Confirmation Modal */}
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

      {/* Bulk Delete Confirmation Modal */}
      {isConfirmBulkDeleteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-delete-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setIsConfirmBulkDeleteOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="bulk-delete-title"
              className="text-base font-semibold text-slate-900"
            >
              បញ្ជាក់ការលុបទិន្នន័យច្រើន
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              តើអ្នកពិតជាចង់លុបសមាជិកដែលបានជ្រើសរើសទាំង{' '}
              <span className="font-mono font-semibold tabular-nums text-slate-900">
                {validSelectedIds.length}
              </span>{' '}
              នាក់ចេញមែនទេ?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsConfirmBulkDeleteOpen(false)}
                className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                បោះបង់
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="min-h-[38px] rounded-lg bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700 whitespace-nowrap"
              >
                លុប {validSelectedIds.length} នាក់
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Role Update Modal */}
      {isBulkRoleModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-role-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setIsBulkRoleModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="bulk-role-title"
              className="text-base font-semibold text-slate-900"
            >
              ប្តូរតួនាទី / ប្រភេទភ្ញៀវរួម
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              អនុវត្តលើសមាជិកដែលបានជ្រើសរើសចំនួន{' '}
              <span className="font-mono font-semibold tabular-nums">
                {validSelectedIds.length}
              </span>{' '}
              នាក់
            </p>

            <form onSubmit={handleSubmitBulkRole} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="bulk-role-input"
                  className="block text-xs font-medium text-slate-700"
                >
                  តួនាទី / ប្រភេទភ្ញៀវថ្មី
                </label>
                <input
                  id="bulk-role-input"
                  type="text"
                  required
                  value={bulkRoleValue}
                  onChange={(e) => setBulkRoleValue(e.target.value)}
                  placeholder="ឧ. ភ្ញៀវកិត្តិយស ឬ សមាជិកផ្លូវការ"
                  className="mt-1.5 block min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBulkRoleModalOpen(false)}
                  className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="min-h-[38px] rounded-lg bg-[#0F4C5C] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0B3B49] whitespace-nowrap"
                >
                  រក្សាទុក
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
