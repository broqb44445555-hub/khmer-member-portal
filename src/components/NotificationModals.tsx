import { AlertTriangle, CheckCircle2, ExternalLink, Info, X } from 'lucide-react';
import type { SuccessModalPayload, ToastNotice } from '../types/member';
import { sanitizeHttpUrl } from '../utils/googleMaps';

interface SuccessModalProps {
  payload: SuccessModalPayload | null;
  onClose: () => void;
}

export function SuccessPopupModal({ payload, onClose }: SuccessModalProps) {
  if (!payload) return null;

  const {
    title,
    subtitle,
    member,
    importedCount,
    dbSaved = true,
    dbError,
    telegramSent,
    telegramError,
  } = payload;

  const allSucceeded = dbSaved && telegramSent;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                allSucceeded
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {allSucceeded ? (
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              )}
            </div>
            <div>
              <h3
                id="success-modal-title"
                className="text-base font-semibold text-slate-900"
              >
                {title}
              </h3>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="បិទផ្ទាំងជូនដំណឹង"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Registered Member Summary */}
        {member && (
          <div className="mt-5 flex items-center gap-4 border-y border-slate-100 py-4">
            {member.photoDataUrl ? (
              <img
                src={member.photoDataUrl}
                alt={member.fullName}
                referrerPolicy="no-referrer"
                className="h-16 w-16 shrink-0 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-lg font-semibold text-slate-600">
                {member.fullName.slice(0, 1)}
              </div>
            )}

            <div className="min-w-0 space-y-0.5 text-sm">
              <p className="truncate font-semibold text-slate-900">
                {member.fullName}
              </p>
              <p className="text-xs text-slate-600">
                {member.gender} · {member.role}
              </p>
              <p className="font-mono text-xs tabular-nums text-slate-600">
                {member.phone}
                {member.telegram ? ` · ${member.telegram}` : ''}
              </p>
              {member.address?.fullAddress && (
                <p className="text-xs text-slate-600">
                  {member.address.fullAddress}
                </p>
              )}
              {sanitizeHttpUrl(member.mapsLink) && (
                <a
                  href={sanitizeHttpUrl(member.mapsLink)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 pt-0.5 text-xs font-medium text-[#0F4C5C] hover:underline"
                >
                  🗺️ មើលទីតាំងលើ Google Maps
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
              <p className="font-mono text-xs tabular-nums text-slate-500">
                កាលបរិច្ឆេទ៖ {member.joinDate}
              </p>
            </div>
          </div>
        )}

        {/* Bulk Import Summary */}
        {typeof importedCount === 'number' && (
          <div className="mt-5 border-y border-slate-100 py-4 text-sm text-slate-700">
            បានបញ្ចូលទិន្នន័យសមាជិកចំនួន{' '}
            <span className="font-mono font-semibold tabular-nums text-slate-900">
              {importedCount}
            </span>{' '}
            នាក់ទៅក្នុងប្រព័ន្ធទិន្នន័យរួមដោយជោគជ័យ។
          </div>
        )}

        {/* Explicit Sync & Telegram Delivery Status */}
        <div className="mt-4 space-y-2 text-xs">
          {dbSaved ? (
            <p className="flex items-center gap-2 font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              បានរក្សាទុកក្នុងប្រព័ន្ធទិន្នន័យរួម (Google Sheets) ដោយជោគជ័យ។
            </p>
          ) : (
            <div className="space-y-1 text-amber-800">
              <p className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                មិនអាចរក្សាទុកក្នុង Google Sheets បានទេ។
              </p>
              {dbError && (
                <p className="pl-6 font-mono text-[11px] text-slate-500">
                  {dbError}
                </p>
              )}
            </div>
          )}

          {telegramSent ? (
            <div className="space-y-1">
              <p className="flex items-center gap-2 font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                បានផ្ញើជូនដំណឹងទៅកាន់ Telegram ដោយជោគជ័យ។
              </p>
              {telegramError && (
                <p className="pl-6 font-mono text-[11px] text-amber-700">
                  {telegramError}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1 text-amber-800">
              <p className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                មិនអាចផ្ញើជូនដំណឹងទៅ Telegram បានទេ។
              </p>
              {telegramError && (
                <p className="pl-6 font-mono text-[11px] text-slate-500">
                  {telegramError}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] rounded-lg bg-[#0F4C5C] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0B3B49] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C] focus-visible:ring-offset-2 whitespace-nowrap"
          >
            យល់ព្រម
          </button>
        </div>
      </div>
    </div>
  );
}

interface ToastStackProps {
  toasts: ToastNotice[];
  onDismiss: (id: string) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const icon =
          toast.type === 'success' ? (
            <CheckCircle2
              className="h-4 w-4 shrink-0 text-emerald-700"
              aria-hidden="true"
            />
          ) : toast.type === 'error' ? (
            <AlertTriangle
              className="h-4 w-4 shrink-0 text-red-600"
              aria-hidden="true"
            />
          ) : (
            <Info
              className="h-4 w-4 shrink-0 text-[#0F4C5C]"
              aria-hidden="true"
            />
          );

        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-800 shadow-lg"
          >
            <div className="mt-0.5">{icon}</div>
            <p className="flex-1 leading-relaxed">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="បិទ"
              className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
