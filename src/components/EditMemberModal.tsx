import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Save, Trash2, Upload, User, X } from 'lucide-react';
import {
  createEmptyAddress,
  formatFullKhmerAddress,
} from '../data/battambangAddress';
import type {
  CompressedImageResult,
  Gender,
  Member,
  MemberAddress,
} from '../types/member';
import { compressImageFile } from '../utils/imageCompression';
import { AddressSelector } from './AddressSelector';

interface EditMemberModalProps {
  member: Member | null;
  onClose: () => void;
  onSave: (
    updatedMember: Member,
    options: { photoBlob: Blob | null; notifyTelegram: boolean }
  ) => Promise<void>;
  onError: (message: string) => void;
}

const ROLE_SUGGESTIONS = [
  'សមាជិកថ្មី',
  'ភ្ញៀវកិត្តិយស',
  'ភ្ញៀវទូទៅ',
  'បុគ្គលិក',
  'ដៃគូសហការ',
];

export function EditMemberModal({
  member,
  onClose,
  onSave,
  onError,
}: EditMemberModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<Gender>('ប្រុស');
  const [phone, setPhone] = useState('');
  const [telegram, setTelegram] = useState('');
  const [role, setRole] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [address, setAddress] = useState<MemberAddress>(() =>
    createEmptyAddress()
  );
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(
    undefined
  );
  const [newPhotoResult, setNewPhotoResult] =
    useState<CompressedImageResult | null>(null);
  const [notifyTelegram, setNotifyTelegram] = useState(false);

  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (member) {
      setFullName(member.fullName);
      setGender(member.gender);
      setPhone(member.phone);
      setTelegram(member.telegram);
      setRole(member.role);
      setJoinDate(member.joinDate);
      setAddress(member.address ? { ...member.address } : createEmptyAddress());
      setPhotoDataUrl(member.photoDataUrl);
      setNewPhotoResult(null);
      setNotifyTelegram(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [member]);

  if (!member) return null;

  const activePhotoUrl = newPhotoResult?.dataUrl ?? photoDataUrl;

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressed = await compressImageFile(file);
      setNewPhotoResult(compressed);
      setPhotoDataUrl(compressed.dataUrl);
    } catch (err) {
      onError(
        err instanceof Error
          ? err.message
          : 'មិនអាចដំណើរការរូបភាពថ្មីបានទេ។'
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemovePhoto = () => {
    setNewPhotoResult(null);
    setPhotoDataUrl(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedRole = role.trim();
    const trimmedTelegram = telegram.trim();

    if (!trimmedName || !trimmedPhone || !trimmedRole) {
      onError('សូមបំពេញព័ត៌មានចាំបាច់ទាំងអស់ (ឈ្មោះពេញ លេខទូរសព្ទ និងតួនាទី)។');
      return;
    }

    const formattedTelegram = trimmedTelegram
      ? trimmedTelegram.startsWith('@')
        ? trimmedTelegram
        : `@${trimmedTelegram}`
      : '';

    const cleanProvince = address.province.trim();
    const cleanDistrict = address.district.trim();
    const cleanCommune = address.commune.trim();
    const cleanVillage = address.village.trim();
    const hasAddressPart = Boolean(cleanDistrict || cleanCommune || cleanVillage);

    const normalizedAddress: MemberAddress | undefined = hasAddressPart
      ? {
          province: cleanProvince,
          district: cleanDistrict,
          commune: cleanCommune,
          village: cleanVillage,
          fullAddress: formatFullKhmerAddress({
            province: cleanProvince,
            district: cleanDistrict,
            commune: cleanCommune,
            village: cleanVillage,
          }),
        }
      : member.address;

    const updatedMember: Member = {
      ...member,
      fullName: trimmedName,
      gender,
      phone: trimmedPhone,
      telegram: formattedTelegram,
      role: trimmedRole,
      joinDate: joinDate || member.joinDate,
      address: normalizedAddress,
      photoDataUrl: activePhotoUrl,
    };

    setIsSaving(true);
    try {
      await onSave(updatedMember, {
        photoBlob: newPhotoResult?.blob ?? null,
        notifyTelegram,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-member-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3
              id="edit-member-title"
              className="text-base font-semibold text-slate-900"
            >
              កែប្រែព័ត៌មានសមាជិក / ភ្ញៀវ
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              កែសម្រួលព័ត៌មាន រូបភាព ឬតួនាទី រួចរក្សាទុកការផ្លាស់ប្តូរ
            </p>
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
          {/* Photo Editor */}
          <div>
            <label
              htmlFor="edit-member-photo"
              className="block text-sm font-medium text-slate-700"
            >
              រូបភាពសមាជិក/ភ្ញៀវ
            </label>
            <div className="mt-2.5 flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing || isSaving}
                aria-label="ប្តូររូបភាព"
                className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:border-[#0F4C5C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C]"
              >
                {isCompressing ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[#0F4C5C]" />
                ) : activePhotoUrl ? (
                  <>
                    <img
                      src={activePhotoUrl}
                      alt={fullName}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-slate-900/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <Camera className="h-4 w-4" />
                    </span>
                  </>
                ) : (
                  <User className="h-6 w-6 text-slate-400" />
                )}
              </button>

              <div className="min-w-0 flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  id="edit-member-photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="sr-only"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressing || isSaving}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                    {activePhotoUrl ? 'ប្តូររូបភាពថ្មី' : 'បន្ថែមរូបភាព'}
                  </button>

                  {activePhotoUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={isSaving}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 whitespace-nowrap"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      លុបរូបភាព
                    </button>
                  )}
                </div>

                {newPhotoResult && (
                  <p className="text-xs text-slate-500 tabular-nums">
                    រូបភាពថ្មី · {newPhotoResult.width}×{newPhotoResult.height}px ·{' '}
                    {newPhotoResult.sizeKB} KB
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label
              htmlFor="edit-fullname"
              className="block text-sm font-medium text-slate-700"
            >
              ឈ្មោះពេញ <span className="text-red-600">*</span>
            </label>
            <input
              id="edit-fullname"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
            />
          </div>

          {/* Gender + Phone */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="edit-gender"
                className="block text-sm font-medium text-slate-700"
              >
                ភេទ <span className="text-red-600">*</span>
              </label>
              <select
                id="edit-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
              >
                <option value="ប្រុស">ប្រុស</option>
                <option value="ស្រី">ស្រី</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="edit-phone"
                className="block text-sm font-medium text-slate-700"
              >
                លេខទូរសព្ទ <span className="text-red-600">*</span>
              </label>
              <input
                id="edit-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
              />
            </div>
          </div>

          {/* Telegram + Date */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="edit-telegram"
                className="block text-sm font-medium text-slate-700"
              >
                Telegram
              </label>
              <input
                id="edit-telegram"
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="@username"
                className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
              />
            </div>

            <div>
              <label
                htmlFor="edit-date"
                className="block text-sm font-medium text-slate-700"
              >
                កាលបរិច្ឆេទ
              </label>
              <input
                id="edit-date"
                type="date"
                required
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
                className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label
              htmlFor="edit-role"
              className="block text-sm font-medium text-slate-700"
            >
              តួនាទី / ប្រភេទភ្ញៀវ <span className="text-red-600">*</span>
            </label>
            <input
              id="edit-role"
              type="text"
              required
              list="edit-role-suggestions"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
            />
            <datalist id="edit-role-suggestions">
              {ROLE_SUGGESTIONS.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>

          {/* Current Address Editor */}
          <AddressSelector
            value={address}
            onChange={setAddress}
            idPrefix="edit-addr"
          />

          {/* Optional Telegram Update Notification */}
          <label className="flex items-center gap-2.5 pt-1 text-xs text-slate-700 select-none">
            <input
              type="checkbox"
              checked={notifyTelegram}
              onChange={(e) => setNotifyTelegram(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-[#0F4C5C]"
            />
            ផ្ញើការជូនដំណឹងព័ត៌មានដែលបានកែប្រែទៅកាន់ Telegram ទាំងពីរគណនី
          </label>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              បោះបង់
            </button>
            <button
              type="submit"
              disabled={isSaving || isCompressing}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#0F4C5C] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0B3B49] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C] focus-visible:ring-offset-2 whitespace-nowrap disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  កំពុងរក្សាទុក...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  រក្សាទុកការកែប្រែ
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
