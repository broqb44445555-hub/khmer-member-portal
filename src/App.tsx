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
  downloadExcelTemplate,
  exportMembersBackupJson,
  exportMembersToExcel,
  importMembersFromExcel,
  parseMembersBackupJson,
} from './utils/excelAndSheets';
import {
  createMemberInDb,
  deleteMemberInDb,
  fetchMembersFromDb,
  updateMemberInDb,
} from './utils/sheetsDb';
import { getTodayLocalDate } from './utils/storage';
import {
  sendBulkImportToTelegram,
  sendMemberToTelegram,
} from './utils/telegram';

const ADMIN_PASSCODE = 'pheak9999';

type AdminTab = 'manage' | 'register' | 'backup';

export default function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('manage');
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
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

  const refreshMembers = useCallback(
    async (options?: { silentSuccessToast?: boolean }) => {
      setIsSyncing(true);
      setSyncError(null);
      try {
        const fetched = await fetchMembersFromDb();
        setMembers(fetched);
        if (!options?.silentSuccessToast) {
          pushToast(
            'success',
            `បានទាញទិន្នន័យថ្មីបំផុត (${fetched.length} នាក់) ពី Google Sheets រួចរាល់។`
          );
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'មិនអាចទាញទិន្នន័យពី Google Sheets បានទេ។';
        setSyncError(msg);
        pushToast('error', msg);
      } finally {
        setIsSyncing(false);
      }
    },
    [pushToast]
  );

  const handleVerifyAdminPasscode = useCallback(
    (enteredCode: string): boolean => {
      if (enteredCode === ADMIN_PASSCODE) {
        setIsAdmin(true);
        setActiveAdminTab('manage');
        setIsPasscodeModalOpen(false);
        pushToast('success', 'បានបើកដំណើរការ Admin Mode · កំពុងទាញទិន្នន័យពី Google Sheets...');
        void refreshMembers({ silentSuccessToast: true });
        return true;
      }
      return false;
    },
    [pushToast, refreshMembers]
  );

  const handleLockAdmin = useCallback(() => {
    setIsAdmin(false);
    setEditingMember(null);
    setSyncError(null);
    pushToast('info', 'បានចាក់សោ Admin Mode ត្រឡប់ទៅទម្រង់សម្រាប់ភ្ញៀវវិញ។');
  }, [pushToast]);

  const handleRegisterMember = useCallback(
    async (newMember: Member, photoBlob: Blob | null) => {
      const [dbResult, telegramResult] = await Promise.all([
        createMemberInDb(newMember),
        sendMemberToTelegram(newMember, photoBlob),
      ]);

      const savedMember: Member = {
        ...newMember,
        telegramSent: telegramResult.ok,
      };

      if (isAdmin && dbResult.ok) {
        await refreshMembers({ silentSuccessToast: true });
      }

      setSuccessModal({
        title: dbResult.ok
          ? 'ចុះឈ្មោះសមាជិកបានជោគជ័យ'
          : 'បានផ្ញើទិន្នន័យសមាជិក',
        subtitle: savedMember.photoDataUrl
          ? 'រួមបញ្ចូលទាំងរូបភាព និងព័ត៌មានលម្អិត'
          : 'ព័ត៌មានសមាជិក និងការជូនដំណឹង',
        member: savedMember,
        dbSaved: dbResult.ok,
        dbError: dbResult.error,
        telegramSent: telegramResult.ok,
        telegramError: telegramResult.error,
      });
    },
    [isAdmin, refreshMembers]
  );

  const handleUpdateMember = useCallback(
    async (
      updatedMember: Member,
      options: { photoBlob: Blob | null; notifyTelegram: boolean }
    ) => {
      setIsMutating(true);
      try {
        const dbResult = await updateMemberInDb(updatedMember);
        if (!dbResult.ok) {
          pushToast(
            'error',
            `មិនអាចកែប្រែទិន្នន័យលើ Google Sheets បានទេ៖ ${dbResult.error || 'កំហុសបណ្តាញ'}`
          );
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
              `បានកែប្រែលើ Google Sheets ប៉ុន្តែមិនអាចផ្ញើទៅ Telegram បានទេ៖ ${tgResult.error || 'កំហុសបណ្តាញ'}`
            );
          }
        } else {
          pushToast(
            'success',
            `បានរក្សាទុកការកែប្រែ «${updatedMember.fullName}» លើ Google Sheets ដោយជោគជ័យ។`
          );
        }

        await refreshMembers({ silentSuccessToast: true });
      } finally {
        setIsMutating(false);
      }
    },
    [pushToast, refreshMembers]
  );

  const handleDeleteMember = useCallback(
    async (id: string) => {
      const target = members.find((m) => m.id === id);
      setIsMutating(true);
      try {
        const dbResult = await deleteMemberInDb(id);
        if (!dbResult.ok) {
          pushToast(
            'error',
            `មិនអាចលុបទិន្នន័យលើ Google Sheets បានទេ៖ ${dbResult.error || 'កំហុសបណ្តាញ'}`
          );
          return;
        }

        pushToast(
          'success',
          target
            ? `បានលុប «${target.fullName}» ចេញពី Google Sheets រួចរាល់។`
            : 'បានលុបទិន្នន័យសមាជិករួចរាល់។'
        );

        await refreshMembers({ silentSuccessToast: true });
      } finally {
        setIsMutating(false);
      }
    },
    [members, pushToast, refreshMembers]
  );

  const handleBulkDeleteMembers = useCallback(
    async (ids: string[]) => {
      setIsMutating(true);
      try {
        let deletedCount = 0;
        for (const id of ids) {
          const res = await deleteMemberInDb(id);
          if (res.ok) deletedCount += 1;
        }

        if (deletedCount === ids.length) {
          pushToast(
            'success',
            `បានលុបទិន្នន័យសមាជិកចំនួន ${deletedCount} នាក់ចេញពី Google Sheets រួចរាល់។`
          );
        } else if (deletedCount > 0) {
          pushToast(
            'info',
            `បានលុប ${deletedCount}/${ids.length} នាក់។ សូមពិនិត្យបញ្ជីម្តងទៀត។`
          );
        } else {
          pushToast('error', 'មិនអាចលុបទិន្នន័យដែលបានជ្រើសលើ Google Sheets បានទេ។');
        }

        await refreshMembers({ silentSuccessToast: true });
      } finally {
        setIsMutating(false);
      }
    },
    [pushToast, refreshMembers]
  );

  const handleBulkUpdateRole = useCallback(
    async (ids: string[], newRole: string) => {
      const idSet = new Set(ids);
      const targets = members.filter((m) => idSet.has(m.id));
      if (targets.length === 0) return;

      setIsMutating(true);
      try {
        let updatedCount = 0;
        for (const member of targets) {
          const res = await updateMemberInDb({ ...member, role: newRole });
          if (res.ok) updatedCount += 1;
        }

        if (updatedCount > 0) {
          pushToast(
            'success',
            `បានប្តូរតួនាទីសមាជិកចំនួន ${updatedCount} នាក់ទៅជា «${newRole}» លើ Google Sheets រួចរាល់។`
          );
          await refreshMembers({ silentSuccessToast: true });
        } else {
          pushToast('error', 'មិនអាចប្តូរតួនាទីលើ Google Sheets បានទេ។');
        }
      } finally {
        setIsMutating(false);
      }
    },
    [members, pushToast, refreshMembers]
  );

  const handleResendTelegram = useCallback(
    async (member: Member) => {
      setResendingId(member.id);
      try {
        const result = await sendMemberToTelegram(member);
        if (result.ok) {
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
    [pushToast]
  );

  const handleImportExcel = useCallback(
    async (file: File) => {
      setIsImporting(true);
      try {
        const importedMembers = await importMembersFromExcel(file);

        let savedCount = 0;
        let lastError: string | undefined;
        for (const member of importedMembers) {
          const res = await createMemberInDb(member);
          if (res.ok) savedCount += 1;
          else lastError = res.error;
        }

        const telegramResult = await sendBulkImportToTelegram(
          importedMembers,
          file.name
        );

        await refreshMembers({ silentSuccessToast: true });

        setSuccessModal({
          title: 'នាំចូលឯកសារ Excel បានជោគជ័យ',
          subtitle: file.name,
          importedCount: savedCount,
          dbSaved: savedCount > 0,
          dbError:
            savedCount < importedMembers.length
              ? `រក្សាទុកបាន ${savedCount}/${importedMembers.length} (${lastError || 'កំហុស'})`
              : undefined,
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
    [pushToast, refreshMembers]
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
      setIsMutating(true);
      try {
        const restored = await parseMembersBackupJson(file);

        if (mode === 'replace') {
          for (const existing of members) {
            await deleteMemberInDb(existing.id);
          }
          let createdCount = 0;
          for (const item of restored) {
            const res = await createMemberInDb(item);
            if (res.ok) createdCount += 1;
          }
          pushToast(
            'success',
            `បានជំនួសទិន្នន័យចំនួន ${createdCount} នាក់លើ Google Sheets រួចរាល់។`
          );
        } else {
          const existingIds = new Set(members.map((m) => m.id));
          const uniqueAdded = restored.filter((m) => !existingIds.has(m.id));
          let createdCount = 0;
          for (const item of uniqueAdded) {
            const res = await createMemberInDb(item);
            if (res.ok) createdCount += 1;
          }
          pushToast(
            'success',
            `បានបញ្ចូលបន្ថែមទិន្នន័យថ្មីចំនួន ${createdCount} នាក់ទៅលើ Google Sheets រួចរាល់។`
          );
        }

        await refreshMembers({ silentSuccessToast: true });
        setActiveAdminTab('manage');
      } catch (err) {
        pushToast(
          'error',
          err instanceof Error
            ? err.message
            : 'មិនអាចអានឯកសារបម្រុងទុក JSON បានទេ។'
        );
      } finally {
        setIsMutating(false);
      }
    },
    [members, pushToast, refreshMembers]
  );

  const handleDownloadExcelTemplate = useCallback(() => {
    downloadExcelTemplate();
    pushToast('success', 'បានទាញយកឯកសារគំរូ Excel (.xlsx) ដោយជោគជ័យ។');
  }, [pushToast]);

  const handleClearAllData = useCallback(async () => {
    setIsMutating(true);
    try {
      for (const member of members) {
        await deleteMemberInDb(member.id);
      }
      pushToast('success', 'បានសម្អាតទិន្នន័យសមាជិកទាំងអស់ចេញពី Google Sheets រួចរាល់។');
      await refreshMembers({ silentSuccessToast: true });
    } finally {
      setIsMutating(false);
    }
  }, [members, pushToast, refreshMembers]);

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
                isSyncing={isSyncing}
                syncError={syncError}
                isMutating={isMutating}
                isImporting={isImporting}
                resendingId={resendingId}
                onRefresh={() => refreshMembers()}
                onImportExcel={handleImportExcel}
                onExportExcel={handleExportExcel}
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
                  isMutating={isMutating}
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
        <div className="mx-auto flex max-w-[1380px] items-center justify-center px-4 py-4 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
          <p>
            ប្រព័ន្ធចុះឈ្មោះសមាជិក និងភ្ញៀវថ្មី • គាំទ្រការជូនដំណឹង Telegram និងឯកសារ Excel (.xlsx)
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
