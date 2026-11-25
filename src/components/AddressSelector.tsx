import { useEffect, useId, useState } from 'react';
import { MapPin } from 'lucide-react';
import {
  BATTAMBANG_COMMUNES_BY_DISTRICT,
  BATTAMBANG_DISTRICTS,
  DEFAULT_PROVINCE,
  OTHER_COMMUNE_VALUE,
  OTHER_PROVINCE_VALUE,
  VILLAGE_SUGGESTIONS_BY_DISTRICT,
  formatFullKhmerAddress,
} from '../data/battambangAddress';
import type { MemberAddress } from '../types/member';

interface AddressSelectorProps {
  value: MemberAddress;
  onChange: (next: MemberAddress) => void;
  required?: boolean;
  idPrefix?: string;
}

export function AddressSelector({
  value,
  onChange,
  required = false,
  idPrefix = 'addr',
}: AddressSelectorProps) {
  const reactId = useId();
  const villageDatalistId = `${idPrefix}-villages-${reactId}`;

  const isBattambang = value.province === DEFAULT_PROVINCE;
  const availableCommunes =
    isBattambang && value.district
      ? BATTAMBANG_COMMUNES_BY_DISTRICT[value.district] ?? []
      : [];

  const [customCommuneMode, setCustomCommuneMode] = useState<boolean>(() => {
    if (!isBattambang || !value.district || !value.commune) return false;
    return (
      value.commune === OTHER_COMMUNE_VALUE ||
      !(BATTAMBANG_COMMUNES_BY_DISTRICT[value.district] ?? []).includes(
        value.commune
      )
    );
  });

  useEffect(() => {
    if (!isBattambang || !value.district) {
      setCustomCommuneMode(false);
      return;
    }
    if (
      value.commune &&
      value.commune !== OTHER_COMMUNE_VALUE &&
      !availableCommunes.includes(value.commune)
    ) {
      setCustomCommuneMode(true);
    }
  }, [isBattambang, value.district, value.commune, availableCommunes]);

  const communeSelectValue = !isBattambang
    ? OTHER_COMMUNE_VALUE
    : customCommuneMode
      ? OTHER_COMMUNE_VALUE
      : value.commune;

  const isCustomCommuneActive =
    isBattambang && Boolean(value.district) && customCommuneMode;

  const villageSuggestions =
    isBattambang && value.district
      ? VILLAGE_SUGGESTIONS_BY_DISTRICT[value.district] ?? []
      : [];

  const emitChange = (partial: Partial<MemberAddress>) => {
    const merged = {
      province: partial.province ?? value.province,
      district: partial.district ?? value.district,
      commune: partial.commune ?? value.commune,
      village: partial.village ?? value.village,
    };
    const cleanCommune =
      merged.commune === OTHER_COMMUNE_VALUE ? '' : merged.commune;
    const cleanProvince =
      merged.province === OTHER_PROVINCE_VALUE ? '' : merged.province;

    onChange({
      ...merged,
      commune: cleanCommune,
      province: cleanProvince,
      fullAddress: formatFullKhmerAddress({
        province: cleanProvince,
        district: merged.district,
        commune: cleanCommune,
        village: merged.village,
      }),
    });
  };

  const handleProvinceSelectChange = (selected: string) => {
    setCustomCommuneMode(false);
    if (selected === DEFAULT_PROVINCE) {
      emitChange({
        province: DEFAULT_PROVINCE,
        district: '',
        commune: '',
      });
    } else {
      emitChange({
        province: '',
        district: '',
        commune: '',
      });
    }
  };

  const handleDistrictChange = (nextDistrict: string) => {
    setCustomCommuneMode(false);
    emitChange({
      district: nextDistrict,
      commune: '',
    });
  };

  const handleCommuneSelectChange = (selected: string) => {
    if (selected === OTHER_COMMUNE_VALUE) {
      setCustomCommuneMode(true);
      emitChange({ commune: '' });
    } else {
      setCustomCommuneMode(false);
      emitChange({ commune: selected });
    }
  };

  const displayCustomCommuneValue =
    value.commune === OTHER_COMMUNE_VALUE ? '' : value.commune;

  const previewAddress = formatFullKhmerAddress({
    province: value.province === OTHER_PROVINCE_VALUE ? '' : value.province,
    district: value.district,
    commune: value.commune === OTHER_COMMUNE_VALUE ? '' : value.commune,
    village: value.village,
  });

  return (
    <div className="space-y-3.5 border-t border-slate-100 pt-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-[#0F4C5C]" aria-hidden="true" />
        <span className="text-sm font-semibold text-slate-800">
          ទីកន្លែងបច្ចុប្បន្ន
        </span>
      </div>

      {/* Province */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-province`}
            className="block text-xs font-medium text-slate-700"
          >
            ខេត្ត/រាជធានី {required && <span className="text-red-600">*</span>}
          </label>
          <select
            id={`${idPrefix}-province`}
            value={isBattambang ? DEFAULT_PROVINCE : OTHER_PROVINCE_VALUE}
            onChange={(e) => handleProvinceSelectChange(e.target.value)}
            className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
          >
            <option value={DEFAULT_PROVINCE}>{DEFAULT_PROVINCE}</option>
            <option value={OTHER_PROVINCE_VALUE}>
              ផ្សេងៗ (បញ្ចូលដោយដៃ)
            </option>
          </select>
        </div>

        {/* Manual Province Input when Other is selected, otherwise District Dropdown */}
        {!isBattambang ? (
          <div>
            <label
              htmlFor={`${idPrefix}-province-custom`}
              className="block text-xs font-medium text-slate-700"
            >
              បញ្ចូលឈ្មោះខេត្ត/រាជធានី{' '}
              {required && <span className="text-red-600">*</span>}
            </label>
            <input
              id={`${idPrefix}-province-custom`}
              type="text"
              required={required}
              value={value.province === OTHER_PROVINCE_VALUE ? '' : value.province}
              onChange={(e) => emitChange({ province: e.target.value })}
              placeholder="ឧ. រាជធានីភ្នំពេញ ឬ ខេត្តសៀមរាប"
              className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
            />
          </div>
        ) : (
          <div>
            <label
              htmlFor={`${idPrefix}-district`}
              className="block text-xs font-medium text-slate-700"
            >
              ស្រុក/ក្រុង {required && <span className="text-red-600">*</span>}
            </label>
            <select
              id={`${idPrefix}-district`}
              required={required}
              value={value.district}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
            >
              <option value="">-- ជ្រើសរើសស្រុក/ក្រុង --</option>
              {BATTAMBANG_DISTRICTS.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* When Province is Other: Manual District + Manual Commune */}
      {!isBattambang ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`${idPrefix}-district-custom`}
              className="block text-xs font-medium text-slate-700"
            >
              ស្រុក/ក្រុង/ខណ្ឌ {required && <span className="text-red-600">*</span>}
            </label>
            <input
              id={`${idPrefix}-district-custom`}
              type="text"
              required={required}
              value={value.district}
              onChange={(e) => emitChange({ district: e.target.value })}
              placeholder="ឧ. ខណ្ឌសែនសុខ"
              className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
            />
          </div>

          <div>
            <label
              htmlFor={`${idPrefix}-commune-custom-other`}
              className="block text-xs font-medium text-slate-700"
            >
              ឃុំ/សង្កាត់ {required && <span className="text-red-600">*</span>}
            </label>
            <input
              id={`${idPrefix}-commune-custom-other`}
              type="text"
              required={required}
              value={displayCustomCommuneValue}
              onChange={(e) => emitChange({ commune: e.target.value })}
              placeholder="ឧ. សង្កាត់ទឹកថ្លា"
              className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
            />
          </div>
        </div>
      ) : (
        /* When Province is Battambang: Cascading Commune Dropdown + Village */
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`${idPrefix}-commune`}
              className="block text-xs font-medium text-slate-700"
            >
              ឃុំ/សង្កាត់ {required && <span className="text-red-600">*</span>}
            </label>
            <select
              id={`${idPrefix}-commune`}
              required={required && !isCustomCommuneActive}
              disabled={!value.district}
              value={communeSelectValue}
              onChange={(e) => handleCommuneSelectChange(e.target.value)}
              className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">
                {value.district
                  ? '-- ជ្រើសរើសឃុំ/សង្កាត់ --'
                  : 'សូមជ្រើសរើសស្រុក/ក្រុងជាមុន'}
              </option>
              {availableCommunes.map((commune) => (
                <option key={commune} value={commune}>
                  {commune}
                </option>
              ))}
              {value.district && (
                <option value={OTHER_COMMUNE_VALUE}>
                  ផ្សេងៗ / វាយបញ្ចូលខ្លួនឯង
                </option>
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor={`${idPrefix}-village`}
              className="block text-xs font-medium text-slate-700"
            >
              ភូមិ
            </label>
            <input
              id={`${idPrefix}-village`}
              type="text"
              list={villageSuggestions.length > 0 ? villageDatalistId : undefined}
              value={value.village}
              onChange={(e) => emitChange({ village: e.target.value })}
              placeholder="ឧ. ភូមិដីក្រហម"
              className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
            />
            {villageSuggestions.length > 0 && (
              <datalist id={villageDatalistId}>
                {villageSuggestions.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            )}
          </div>
        </div>
      )}

      {/* Custom Commune Input when "ផ្សេងៗ / វាយបញ្ចូលខ្លួនឯង" is chosen under Battambang */}
      {isCustomCommuneActive && (
        <div>
          <label
            htmlFor={`${idPrefix}-commune-manual`}
            className="block text-xs font-medium text-slate-700"
          >
            វាយបញ្ចូលឈ្មោះឃុំ/សង្កាត់{' '}
            {required && <span className="text-red-600">*</span>}
          </label>
          <input
            id={`${idPrefix}-commune-manual`}
            type="text"
            required={required}
            value={displayCustomCommuneValue}
            onChange={(e) => emitChange({ commune: e.target.value })}
            placeholder="ឧ. ឃុំ..."
            className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
          />
        </div>
      )}

      {/* Village input for Other Province */}
      {!isBattambang && (
        <div>
          <label
            htmlFor={`${idPrefix}-village-other`}
            className="block text-xs font-medium text-slate-700"
          >
            ភូមិ
          </label>
          <input
            id={`${idPrefix}-village-other`}
            type="text"
            value={value.village}
            onChange={(e) => emitChange({ village: e.target.value })}
            placeholder="ឧ. ភូមិដីក្រហម"
            className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20"
          />
        </div>
      )}

      {/* Clean unboxed full address preview */}
      {previewAddress && (
        <p className="text-xs text-slate-500">
          អាសយដ្ឋានពេញ៖{' '}
          <span className="font-medium text-slate-700">{previewAddress}</span>
        </p>
      )}
    </div>
  );
}
