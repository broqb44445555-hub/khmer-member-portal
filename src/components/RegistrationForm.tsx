import React, { useRef, useState } from 'react';
import { Camera, Loader2, Send, Trash2, Upload, User } from 'lucide-react';
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
import { createMemberId, getTodayLocalDate } from '../utils/storage';
import { AddressSelector } from './AddressSelector';

interface RegistrationFormProps {
  onRegister: (member: Member, photoBlob: Blob | null) => Promise<void>;
  onError: (message: string) => void;
}

const ROLE_SUGGESTIONS = [
  'សមាជិកថ្មី',
  'ភ្ញៀវកិត្តិយស',
  'ភ្ញៀវទូទៅ',
  'បុគ្គលិក',
  'ដៃគូសហការ',
];

export function RegistrationForm({ onRegister, onError }: RegistrationFormProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<Gender>('ប្រុស');
  const [phone, setPhone] = useState('');
  const [telegram, setTelegram] = useState('');
  const [role, setRole] = useState('');
  const [joinDate, setJoinDate] = useState(getTodayLocalDate());
  const [address, setAddress] = useState<MemberAddress>(() =>
    createEmptyAddress()
  );

  const [compressedPhoto, setCompressedPhoto] =
    useState<CompressedImageResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const result = await compressImageFile(file);
      setCompressedPhoto(result);
    } catch (err) {
      onError(
        err instanceof Error
          ? err.message
          : 'មិនអាចដំណើរការរូបភាពបានទេ។'
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsCompressing(false);
    }
  };

  const handleClearPhoto = () => {
    setCompressedPhoto(null);
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
    const cleanProvince = address.province.trim();
    const cleanDistrict = address.district.trim();
    const cleanCommune = address.commune.trim();
    const cleanVillage = address.village.trim();

    if (!trimmedName || !trimmedPhone || !trimmedRole) {
      onError('សូមបំពេញព័ត៌មានចាំបាច់ទាំងអស់ (ឈ្មោះពេញ លេខទូរសព្ទ និងតួនាទី)។');
      return;
    }

    if (!cleanProvince || !cleanDistrict || !cleanCommune) {
      onError('សូមជ្រើសរើស ឬបំពេញទីកន្លែងបច្ចុប្បន្ន (ខេត្ត ស្រុក/ក្រុង និងឃុំ/សង្កាត់)។');
      return;
    }

    const formattedTelegram = trimmedTelegram
      ? trimmedTelegram.startsWith('@')
        ? trimmedTelegram
        : `@${trimmedTelegram}`
      : '';

    const normalizedAddress: MemberAddress = {
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
    };

    const newMember: Member = {
      id: createMemberId(),
      fullName: trimmedName,
      gender,
      phone: trimmedPhone,
      telegram: formattedTelegram,
      role: trimmedRole,
      joinDate: joinDate || getTodayLocalDate(),
      address: normalizedAddress,
      photoDataUrl: compressedPhoto?.dataUrl,
      createdAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      await onRegister(newMember, compressedPhoto?.blob ?? null);

      // Reset form cleanly after registration
      setFullName('');
      setGender('ប្រុស');
      setPhone('');
      setTelegram('');
      setRole('');
      setJoinDate(getTodayLocalDate());
      setAddress(createEmptyAddress());
      setCompressedPhoto(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      aria-labelledby="registration-form-heading"
      className="rounded-xl border border-slate-200 bg-white p-6"
    >
      <div className="border-b border-slate-100 pb-4">
        <h2
          id="registration-form-heading"
          className="text-lg font-semibold text-slate-900"
        >
          ទម្រង់ចុះឈ្មោះសមាជិកថ្មី
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          បំពេញព័ត៌មានខាងក្រោមដើម្បីរក្សាទុក និងផ្ញើជូនដំណឹងទៅ Telegram ភ្លាមៗ
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Photo Upload with Live Circular Preview */}
        <div>
          <label
            htmlFor="member-photo-input"
            className="block text-sm font-medium text-slate-700"
          >
            រូបភាពសមាជិក/ភ្ញៀវ
          </label>

          <div className="mt-2.5 flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressing || isSubmitting}
              aria-label="ជ្រើសរើសរូបភាពសមាជិក"
              className="group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:border-[#0F4C5C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C] focus-visible:ring-offset-2"
            >
              {isCompressing ? (
                <Loader2 className="h-6 w-6 animate-spin text-[#0F4C5C]" />
              ) : compressedPhoto ? (
                <>
                  <img
                    src={compressedPhoto.dataUrl}
                    alt="រូបភាពសមាជិកមើលជាមុន"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-slate-900/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Camera className="h-5 w-5" />
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 transition-colors group-hover:text-[#0F4C5C]">
                  <User className="h-7 w-7" />
                  <span className="mt-1 text-[11px] font-medium">បង្ហោះរូប</span>
                </div>
              )}
            </button>

            <div className="min-w-0 flex-1 space-y-2">
              <input
                ref={fileInputRef}
                id="member-photo-input"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="sr-only"
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing || isSubmitting}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C] whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  {compressedPhoto ? 'ប្តូររូបភាព' : 'ជ្រើសរើសរូបភាព'}
                </button>

                {compressedPhoto && (
                  <button
                    type="button"
                    onClick={handleClearPhoto}
                    disabled={isSubmitting}
                    className="inline-flex min-h-[38px] items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 whitespace-nowrap shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    លុប
                  </button>
                )}
              </div>

              {compressedPhoto ? (
                <p className="text-xs text-slate-500 tabular-nums">
                  បង្ហាប់រួចរាល់ · {compressedPhoto.width}×{compressedPhoto.height}px ·{' '}
                  {compressedPhoto.sizeKB} KB
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  បង្ហាប់ដោយស្វ័យប្រវត្តិ (ទទឹងអតិបរមា 600px, JPEG 70%)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Full Name */}
        <div>
          <label
            htmlFor="member-fullname"
            className="block text-sm font-medium text-slate-700"
          >
            ឈ្មោះពេញ <span className="text-red-600">*</span>
          </label>
          <input
            id="member-fullname"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="ឧ. សុខ ដារ៉ា"
            className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
          />
        </div>

        {/* Gender + Phone Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="member-gender"
              className="block text-sm font-medium text-slate-700"
            >
              ភេទ <span className="text-red-600">*</span>
            </label>
            <select
              id="member-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 transition-colors focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
            >
              <option value="ប្រុស">ប្រុស</option>
              <option value="ស្រី">ស្រី</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="member-phone"
              className="block text-sm font-medium text-slate-700"
            >
              លេខទូរសព្ទ <span className="text-red-600">*</span>
            </label>
            <input
              id="member-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="012 345 678"
              className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm tabular-nums text-slate-900 placeholder:font-sans placeholder:text-slate-400 transition-colors focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
            />
          </div>
        </div>

        {/* Telegram Username */}
        <div>
          <label
            htmlFor="member-telegram"
            className="block text-sm font-medium text-slate-700"
          >
            Telegram <span className="text-xs font-normal text-slate-400">(មិនចាំបាច់)</span>
          </label>
          <input
            id="member-telegram"
            type="text"
            value={telegram}
            onChange={(e) => setTelegram(e.target.value)}
            placeholder="@username"
            className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
          />
        </div>

        {/* Role / Category */}
        <div>
          <label
            htmlFor="member-role"
            className="block text-sm font-medium text-slate-700"
          >
            តួនាទី / ប្រភេទភ្ញៀវ <span className="text-red-600">*</span>
          </label>
          <input
            id="member-role"
            type="text"
            required
            list="role-category-suggestions"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="ឧ. សមាជិកថ្មី ឬ ភ្ញៀវកិត្តិយស"
            className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
          />
          <datalist id="role-category-suggestions">
            {ROLE_SUGGESTIONS.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>

        {/* Current Address Cascading Selector */}
        <AddressSelector
          value={address}
          onChange={setAddress}
          required
          idPrefix="reg-addr"
        />

        {/* Join Date */}
        <div>
          <label
            htmlFor="member-join-date"
            className="block text-sm font-medium text-slate-700"
          >
            កាលបរិច្ឆេទ
          </label>
          <input
            id="member-join-date"
            type="date"
            required
            value={joinDate}
            onChange={(e) => setJoinDate(e.target.value)}
            className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm tabular-nums text-slate-900 transition-colors focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
          />
        </div>

        {/* Primary Submit Action */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || isCompressing}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#0F4C5C] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0B3B49] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C] focus-visible:ring-offset-2 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                កំពុងរក្សាទុក និងផ្ញើទៅ Telegram...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" aria-hidden="true" />
                ចុះឈ្មោះ និងផ្ញើទៅ Telegram
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
