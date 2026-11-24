import { useCallback, useMemo, useState } from 'react';
import { HeaderBanner } from './components/HeaderBanner';
import { MemberTable } from './components/MemberTable';
import { SuccessPopupModal, ToastStack } from './components/NotificationModals';
import { RegistrationForm } from './components/RegistrationForm';
import type { Member, SuccessModalPayload, ToastNotice } from './types/member';
import {
  copyMembersForGoogleSheets,
  exportMembersToExcel,
  importMembersFromExcel,
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

export default function App() {
  const [members, setMembers] = useState<Member[]>(() =>
    loadMembersFromStorage()
  );
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

  const handleExportExcel = useCallback(() => {
    if (members.length === 0) {
      pushToast('info', 'មិនមានទិន្នន័យសមាជិកសម្រាប់នាំចេញទេ។');
      return;
    }
    try {
      exportMembersToExcel(members);
      pushToast(
        'success',
        `បានទាញយកឯកសារ Excel សមាជិកចំនួន ${members.length} នាក់ដោយជោគជ័យ។`
      );
    } catch {
      pushToast('error', 'មានបញ្ហាក្នុងការបង្កើតឯកសារ Excel។');
    }
  }, [members, pushToast]);

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
        totalCount={stats.totalCount}
        maleCount={stats.maleCount}
        femaleCount={stats.femaleCount}
        todayCount={stats.todayCount}
      />

      <main className="mx-auto w-full max-w-[1380px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-7">
          {/* Left Column: Registration Form */}
          <div className="lg:col-span-4">
            <RegistrationForm
              onRegister={handleRegisterMember}
              onError={(msg) => pushToast('error', msg)}
            />
          </div>

          {/* Right Column: Member Table, Search & Excel/Sheets Tools */}
          <div className="lg:col-span-8">
            <MemberTable
              members={members}
              isImporting={isImporting}
              resendingId={resendingId}
              onImportExcel={handleImportExcel}
              onExportExcel={handleExportExcel}
              onCopyGoogleSheets={handleCopyGoogleSheets}
              onDeleteMember={handleDeleteMember}
              onResendTelegram={handleResendTelegram}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1380px] flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <p>ប្រព័ន្ធចុះឈ្មោះសមាជិក និងភ្ញៀវថ្មី</p>
          <p>ទិន្នន័យត្រូវបានរក្សាទុកក្នុងកម្មវិធីរុករក (localStorage) និងគាំទ្រ Excel / Google Sheets</p>
        </div>
      </footer>

      <SuccessPopupModal
        payload={successModal}
        onClose={() => setSuccessModal(null)}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
