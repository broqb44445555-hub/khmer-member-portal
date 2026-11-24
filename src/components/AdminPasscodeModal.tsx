import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Lock, X } from 'lucide-react';

interface AdminPasscodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (passcode: string) => boolean;
}

export function AdminPasscodeModal({
  isOpen,
  onClose,
  onVerify,
}: AdminPasscodeModalProps) {
  const [passcode, setPasscode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPasscode('');
      setErrorMessage('');
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 20);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onVerify(passcode.trim());
    if (!ok) {
      setErrorMessage('លេខកូដសម្ងាត់មិនត្រឹមត្រូវទេ។ សូមព្យាយាមម្តងទៀត។');
      setPasscode('');
      inputRef.current?.focus();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-passcode-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#0F4C5C]">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3
                id="admin-passcode-title"
                className="text-base font-semibold text-slate-900"
              >
                ចូលប្រើប្រាស់ Admin Mode
              </h3>
              <p className="text-xs text-slate-500">
                បញ្ចូលលេខកូដសម្ងាត់ដើម្បីមើលបញ្ជី និងស្ថិតិ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="បិទ"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="admin-passcode-input"
              className="block text-sm font-medium text-slate-700"
            >
              លេខកូដសម្ងាត់ (Passcode)
            </label>
            <input
              ref={inputRef}
              id="admin-passcode-input"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              required
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="••••"
              className="mt-1.5 block min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-center font-mono text-lg tracking-[0.35em] text-slate-900 placeholder:tracking-[0.25em] placeholder:text-slate-400 transition-colors focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
            />
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="flex items-center gap-2 text-xs font-medium text-red-600"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {errorMessage}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
            >
              បោះបង់
            </button>
            <button
              type="submit"
              className="min-h-[40px] rounded-lg bg-[#0F4C5C] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0B3B49] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C] focus-visible:ring-offset-2 whitespace-nowrap"
            >
              ដោះសោ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
