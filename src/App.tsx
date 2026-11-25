import { useCallback, useMemo, useState } from 'react';
import { Database, TableProperties, UserPlus } from 'lucide-react';
import { AdminPasscodeModal } from './components/AdminPasscodeModal';
import { DataBackupPanel } from './components/DataBackupPanel';
import { EditMemberModal } from './components/EditMemberModal';
import { HeaderBanner } from './components/HeaderBanner';
import { MemberTable } from './components/MemberTable';
import { SuccessPopupModal, ToastStack } from './components/NotificationModals';
import { RegistrationForm } from './components/RegistrationForm';
import type { Member, SuccessModalPayload, ToastNotice } from './types/member';
import {
  copyMembersForGoogleSheets,
  downloadExcelTemplate,
  exportMembersBackupJson,
  exportMembersToExcel,
  importMembersFromExcel,
  parseMembersBackupJson,
} from './utils/excelAndSheets';
import {
  getTodayLocalDate,
  loadMembersFromStorage,
  saveMembersToStorage,
} from './utils/storage';
import {
  sendBulkImportToTelegram,
  sendMemberToTelegram,
} from './utils/telegram';

const ADMIN_PASSCODE = '1234';

type AdminTab = 'manage' | 'register' | 'backup';

export default function App() {
  const [members, setMembers] = useState<Member[]>(() =>
    loadMembersFromStorage()
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('manage');
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState<SuccessModalPayload | null>(
    null
  );
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  const pushToast = useCallback(
    (type: ToastNotice['type'], message: string) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleVerifyAdminPasscode = useCallback(
    (enteredCode: string): boolean => {
      if (enteredCode === ADMIN_PASSCODE) {
        setIsAdmin(true);
        setActiveAdminTab('manage');
        setIsPasscodeModalOpen(false);
        pushToast('success', 'បានបើកដំណើរការ Admin Mode ដោយជោគជ័យ។');
        return true;
      }
      return false;
    },
    [pushToast]
  );

  const handleLockAdmin = useCallback(() => {
    setIsAdmin(false);
    setEditingMember(null);
    pushToast('info', 'បានចាក់សោ Admin Mode ត្រឡប់ទៅទម្រង់សម្រាប់ភ្ញៀវវិញ។');
  }, [pushToast]);

  const persistMembers = useCallback(
    (nextMembers: Member[]): boolean => {
      const result = saveMembersToStorage(nextMembers);
      if (!result.ok) {
        pushToast(
          'error',
          result.error || 'មិនអាចរក្សាទុកទិន្នន័យក្នុង localStorage បានទេ។'
        );
        return false;
      }
      setMembers(nextMembers);
      return true;
    },
    [pushToast]
  );

  const handleRegisterMember = useCallback(
    async (newMember: Member, photoBlob: Blob | null) => {
      const telegramResult = await sendMemberToTelegram(newMember, photoBlob);

      const savedMember: Member = {
        ...newMember,
        telegramSent: telegramResult.ok,
      };

      const nextList = [savedMember, ...members];
      const saved = persistMembers(nextList);

      if (!saved) {
        // Fallback: retry saving without photo if localStorage quota exceeded
        const withoutPhoto: Member = {
          ...savedMember,
          photoDataUrl: undefined,
        };
        const retrySaved = persistMembers([withoutPhoto, ...members]);
        if (retrySaved) {
          pushToast(
            'info',
            'បានរក្សាទុកព័ត៌មានសមាជិកដោយមិនរួមបញ្ចូលរូបភាព ដោយសារទំហំផ្ទុកក្នុងកម្មវិធីរុករកជិតពេញ។'
          );
        }
      }

      setSuccessModal({
        title: 'ចុះឈ្មោះសមាជិកបានជោគជ័យ',
        subtitle: savedMember.photoDataUrl
          ? 'រួមបញ្ចូលទាំងរូបភាព និងព័ត៌មានលម្អិត'
          : 'ព័ត៌មានសមាជិកត្រូវបានរក្សាទុកក្នុងបញ្ជី',
        member: savedMember,
        telegramSent: telegramResult.ok,
        telegramError: telegramResult.error,
      });
    },
    [members, persistMembers, pushToast]
  );

  const handleUpdateMember = useCallback(
    async (
      updatedMember: Member,
      options: { photoBlob: Blob | null; notifyTelegram: boolean }
    ) => {
      const nextList = members.map((m) =>
        m.id === updatedMember.id ? updatedMember : m
      );

      if (!persistMembers(nextList)) {
        return;
      }

      setEditingMember(null);

      if (options.notifyTelegram) {
        const tgResult = await sendMemberToTelegram(
          updatedMember,
          options.photoBlob,
          'កែប្រែព័ត៌មានសមាជិក / ភ្ញៀវ'
        );
        if (tgResult.ok) {
          pushToast(
            'success',
            `បានកែប្រែ «${updatedMember.fullName}» និងផ្ញើទៅ Telegram ដោយជោគជ័យ។`
          );
        } else {
          pushToast(
            'error',
            `បានកែប្រែទិន្នន័យ ប៉ុន្តែមិនអាចផ្ញើទៅ Telegram បានទេ៖ ${tgResult.error || 'កំហុសបណ្តាញ'}`
          );
        }
      } else {
        pushToast(
          'success',
          `បានរក្សាទុកការកែប្រែ «${updatedMember.fullName}» ដោយជោគជ័យ។`
        );
      }
    },
    [members, persistMembers, pushToast]
  );

  const handleDeleteMember = useCallback(
    (id: string) => {
      const target = members.find((m) => m.id === id);
      const nextList = members.filter((m) => m.id !== id);
      if (persistMembers(nextList)) {
        pushToast(
          'success',
          target
            ? `បានលុប «${target.fullName}» ចេញពីបញ្ជីរួចរាល់។`
            : 'បានលុបទិន្នន័យសមាជិករួចរាល់។'
        );
      }
    },
    [members, persistMembers, pushToast]
  );

  const handleBulkDeleteMembers = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      const nextList = members.filter((m) => !idSet.has(m.id));
      if (persistMembers(nextList)) {
        pushToast(
          'success',
          `បានលុបទិន្នន័យសមាជិកចំនួន ${ids.length} នាក់រួចរាល់។`
        );
      }
    },
    [members, persistMembers, pushToast]
  );

  const handleBulkUpdateRole = useCallback(
    (ids: string[], newRole: string) => {
      const idSet = new Set(ids);
      const nextList = members.map((m) =>
        idSet.has(m.id) ? { ...m, role: newRole } : m
      );
      if (persistMembers(nextList)) {
        pushToast(
          'success',
          `បានប្តូរតួនាទីសមាជិកចំនួន ${ids.length} នាក់ទៅជា «${newRole}» រួចរាល់។`
        );
      }
    },
    [members, persistMembers, pushToast]
  );

  const handleResendTelegram = useCallback(
    async (member: Member) => {
      setResendingId(member.id);
      try {
        const result = await sendMemberToTelegram(member);
        if (result.ok) {
          const updated = members.map((m) =>
            m.id === member.id ? { ...m, telegramSent: true } : m
          );
          persistMembers(updated);
          pushToast(
            'success',
            `បានផ្ញើព័ត៌មាន «${member.fullName}» ទៅ Telegram ដោយជោគជ័យ។`
          );
        } else {
          pushToast(
            'error',
            `មិនអាចផ្ញើទៅ Telegram បានទេ៖ ${result.error || 'កំហុសបណ្តាញ'}`
          );
        }
      } finally {
        setResendingId(null);
      }
    },
    [members, persistMembers, pushToast]
  );

  const handleImportExcel = useCallback(
    async (file: File) => {
      setIsImporting(true);
      try {
        const importedMembers = await importMembersFromExcel(file);
        const telegramResult = await sendBulkImportToTelegram(
          importedMembers,
          file.name
        );

        const markedImported = importedMembers.map((m) => ({
          ...m,
          telegramSent: telegramResult.ok,
        }));

        const nextList = [...markedImported, ...members];
        persistMembers(nextList);

        setSuccessModal({
          title: 'នាំចូលឯកសារ Excel បានជោគជ័យ',
          subtitle: file.name,
          importedCount: importedMembers.length,
          telegramSent: telegramResult.ok,
          telegramError: telegramResult.error,
        });
      } catch (err) {
        pushToast(
          'error',
          err instanceof Error
            ? err.message
            : 'មិនអាចអានឯកសារ Excel បានទេ។'
        );
      } finally {
        setIsImporting(false);
      }
    },
    [members, persistMembers, pushToast]
  );

  const handleExportExcel = useCallback(
    (subset?: Member[]) => {
      const targetList = subset ?? members;
      if (targetList.length === 0) {
        pushToast('info', 'មិនមានទិន្នន័យសមាជិកសម្រាប់នាំចេញទេ។');
        return;
      }
      try {
        exportMembersToExcel(targetList);
        pushToast(
          'success',
          `បានទាញយកឯកសារ Excel សមាជិកចំនួន ${targetList.length} នាក់ដោយជោគជ័យ។`
        );
      } catch {
        pushToast('error', 'មានបញ្ហាក្នុងការបង្កើតឯកសារ Excel។');
      }
    },
    [members, pushToast]
  );

  const handleCopyGoogleSheets = useCallback(async () => {
    if (members.length === 0) {
      pushToast('info', 'មិនមានទិន្នន័យសមាជិកសម្រាប់ចម្លងទេ។');
      return;
    }
    const ok = await copyMembersForGoogleSheets(members);
    if (ok) {
      pushToast(
        'success',
        'បានចម្លងទិន្នន័យរួចរាល់! សូមបើក Google Sheets រួចចុច Ctrl+V (ឬ Cmd+V) ដើម្បីបិទភ្ជាប់។'
      );
    } else {
      pushToast(
        'error',
        'មិនអាចចម្លងទៅ Clipboard បានទេ។ សូមសាកល្បងម្តងទៀត ឬប្រើការនាំចេញ Excel។'
      );
    }
  }, [members, pushToast]);

  const handleExportBackupJson = useCallback(() => {
    if (members.length === 0) {
      pushToast('info', 'មិនមានទិន្នន័យសម្រាប់បម្រុងទុកទេ។');
      return;
    }
    exportMembersBackupJson(members);
    pushToast(
      'success',
      `បានទាញយកឯកសារបម្រុងទុក JSON (${members.length} នាក់) ដោយជោគជ័យ។`
    );
  }, [members, pushToast]);

  const handleImportBackupJson = useCallback(
    async (file: File, mode: 'merge' | 'replace') => {
      try {
        const restored = await parseMembersBackupJson(file);
        if (mode === 'replace') {
          if (persistMembers(restored)) {
            pushToast(
              'success',
              `បានជំនួសទិន្នន័យសរុបចំនួន ${restored.length} នាក់ពីឯកសារបម្រុងទុក។`
            );
            setActiveAdminTab('manage');
          }
        } else {
          const existingIds = new Set(members.map((m) => m.id));
          const uniqueAdded = restored.filter((m) => !existingIds.has(m.id));
          const merged = [...uniqueAdded, ...members];
          if (persistMembers(merged)) {
            pushToast(
              'success',
              `បានបញ្ចូលបន្ថែមទិន្នន័យថ្មីចំនួន ${uniqueAdded.length} នាក់ (សរុប ${merged.length} នាក់)។`
            );
            setActiveAdminTab('manage');
          }
        }
      } catch (err) {
        pushToast(
          'error',
          err instanceof Error
            ? err.message
            : 'មិនអាចអានឯកសារបម្រុងទុក JSON បានទេ។'
        );
      }
    },
    [members, persistMembers, pushToast]
  );

  const handleDownloadExcelTemplate = useCallback(() => {
    downloadExcelTemplate();
    pushToast('success', 'បានទាញយកឯកសារគំរូ Excel (.xlsx) ដោយជោគជ័យ។');
  }, [pushToast]);

  const handleClearAllData = useCallback(() => {
    if (persistMembers([])) {
      pushToast('success', 'បានសម្អាតទិន្នន័យសមាជិកទាំងអស់រួចរាល់។');
    }
  }, [persistMembers, pushToast]);

  const stats = useMemo(() => {
    const today = getTodayLocalDate();
    let maleCount = 0;
    let femaleCount = 0;
    let todayCount = 0;

    for (const m of members) {
      if (m.gender === 'ប្រុស') maleCount += 1;
      else if (m.gender === 'ស្រី') femaleCount += 1;
      if (m.joinDate === today) todayCount += 1;
    }

    return {
      totalCount: members.length,
      maleCount,
      femaleCount,
      todayCount,
    };
  }, [members]);

  return (
    <div className="min-h-screen bg-[#F6F8F9] text-slate-900 flex flex-col">
      <HeaderBanner
        isAdmin={isAdmin}
        onOpenAdminModal={() => setIsPasscodeModalOpen(true)}
        onLockAdmin={handleLockAdmin}
        totalCount={stats.totalCount}
        maleCount={stats.maleCount}
        femaleCount={stats.femaleCount}
        todayCount={stats.todayCount}
      />

      <main className="mx-auto w-full max-w-[1380px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {isAdmin ? (
          <div className="space-y-6">
            {/* Admin Workspace Navigation Tabs */}
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div
                role="tablist"
                aria-label="ផ្ទាំងគ្រប់គ្រងទិន្នន័យ"
                className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeAdminTab === 'manage'}
                  onClick={() => setActiveAdminTab('manage')}
                  className={`inline-flex min-h-[38px] items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    activeAdminTab === 'manage'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TableProperties className="h-4 w-4" aria-hidden="true" />
                  គ្រប់គ្រង និងកែប្រែទិន្នន័យ
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeAdminTab === 'register'}
                  onClick={() => setActiveAdminTab('register')}
                  className={`inline-flex min-h-[38px] items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    activeAdminTab === 'register'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  បន្ថែមសមាជិកថ្មី
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeAdminTab === 'backup'}
                  onClick={() => setActiveAdminTab('backup')}
                  className={`inline-flex min-h-[38px] items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    activeAdminTab === 'backup'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Database className="h-4 w-4" aria-hidden="true" />
                  បម្រុងទុក និងស្តារទិន្នន័យ
                </button>
              </div>

              {activeAdminTab !== 'register' && (
                <button
                  type="button"
                  onClick={() => setActiveAdminTab('register')}
                  className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-[#0F4C5C] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0B3B49] whitespace-nowrap shrink-0"
                >
                  <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  ចុះឈ្មោះសមាជិកថ្មី
                </button>
              )}
            </div>

            {/* Active Admin Tab View */}
            {activeAdminTab === 'manage' && (
              <MemberTable
                members={members}
                isImporting={isImporting}
                resendingId={resendingId}
                onImportExcel={handleImportExcel}
                onExportExcel={handleExportExcel}
                onCopyGoogleSheets={handleCopyGoogleSheets}
                onEditMember={(member) => setEditingMember(member)}
                onDeleteMember={handleDeleteMember}
                onBulkDeleteMembers={handleBulkDeleteMembers}
                onBulkUpdateRole={handleBulkUpdateRole}
                onResendTelegram={handleResendTelegram}
              />
            )}

            {activeAdminTab === 'register' && (
              <div className="mx-auto max-w-xl">
                <RegistrationForm
                  onRegister={handleRegisterMember}
                  onError={(msg) => pushToast('error', msg)}
                />
              </div>
            )}

            {activeAdminTab === 'backup' && (
              <div className="mx-auto max-w-3xl">
                <DataBackupPanel
                  members={members}
                  onExportBackupJson={handleExportBackupJson}
                  onImportBackupJson={handleImportBackupJson}
                  onDownloadExcelTemplate={handleDownloadExcelTemplate}
                  onClearAllData={handleClearAllData}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-xl">
            <RegistrationForm
              onRegister={handleRegisterMember}
              onError={(msg) => pushToast('error', msg)}
            />
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1380px] flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <p>ប្រព័ន្ធចុះឈ្មោះសមាជិក និងភ្ញៀវថ្មី</p>
          <p>
            {isAdmin
              ? 'ទិន្នន័យត្រូវបានរក្សាទុកក្នុងកម្មវិធីរុករក (localStorage) និងគាំទ្រ Excel / Google Sheets / JSON Backup'
              : 'សូមអរគុណសម្រាប់ការចុះឈ្មោះព័ត៌មានរបស់លោកអ្នក'}
          </p>
        </div>
      </footer>

      <AdminPasscodeModal
        isOpen={isPasscodeModalOpen}
        onClose={() => setIsPasscodeModalOpen(false)}
        onVerify={handleVerifyAdminPasscode}
      />

      <EditMemberModal
        member={editingMember}
        onClose={() => setEditingMember(null)}
        onSave={handleUpdateMember}
        onError={(msg) => pushToast('error', msg)}
      />

      <SuccessPopupModal
        payload={successModal}
        onClose={() => setSuccessModal(null)}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
