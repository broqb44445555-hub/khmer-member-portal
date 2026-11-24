import { Lock, ShieldCheck, Users } from 'lucide-react';

interface HeaderBannerProps {
  isAdmin: boolean;
  onOpenAdminModal: () => void;
  onLockAdmin: () => void;
  totalCount: number;
  maleCount: number;
  femaleCount: number;
  todayCount: number;
}

export function HeaderBanner({
  isAdmin,
  onOpenAdminModal,
  onLockAdmin,
  totalCount,
  maleCount,
  femaleCount,
  todayCount,
}: HeaderBannerProps) {
  return (
    <header className="relative overflow-hidden bg-gradient-to-r from-[#082A33] via-[#0F4C5C] to-[#176478] text-white">
      {/* Subtle geometric line pattern for clean architectural depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.85) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative mx-auto max-w-[1380px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Title & Description */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/20">
              <Users className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-[1.65rem] [text-wrap:balance]">
                ប្រព័ន្ធចុះឈ្មោះសមាជិក និងភ្ញៀវថ្មី
              </h1>
              <p className="mt-1 text-sm text-teal-100/90">
                {isAdmin
                  ? 'របៀបគ្រប់គ្រង (Admin) · គ្រប់គ្រងបញ្ជីសមាជិក ស្ថិតិ និងឯកសារ Excel / Google Sheets'
                  : 'សូមបំពេញព័ត៌មានខាងក្រោមដើម្បីចុះឈ្មោះសមាជិក ឬភ្ញៀវថ្មី'}
              </p>
            </div>
          </div>

          {/* Right Controls: Admin Stats (only when unlocked) + Admin Mode Button */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-4 lg:justify-end lg:gap-6 lg:border-t-0 lg:pt-0">
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-teal-100/80">សរុប</span>
                  <span className="font-mono text-xl font-semibold tabular-nums text-white">
                    {totalCount}
                  </span>
                </div>
                <span
                  aria-hidden="true"
                  className="hidden h-5 w-px bg-white/20 sm:inline-block"
                />
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-teal-100/80">ប្រុស</span>
                  <span className="font-mono text-lg font-medium tabular-nums text-white">
                    {maleCount}
                  </span>
                </div>
                <span
                  aria-hidden="true"
                  className="hidden h-5 w-px bg-white/20 sm:inline-block"
                />
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-teal-100/80">ស្រី</span>
                  <span className="font-mono text-lg font-medium tabular-nums text-white">
                    {femaleCount}
                  </span>
                </div>
                <span
                  aria-hidden="true"
                  className="hidden h-5 w-px bg-white/20 sm:inline-block"
                />
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-teal-100/80">ថ្ងៃនេះ</span>
                  <span className="font-mono text-lg font-medium tabular-nums text-teal-200">
                    {todayCount}
                  </span>
                </div>
              </div>
            )}

            {isAdmin ? (
              <button
                type="button"
                onClick={onLockAdmin}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white whitespace-nowrap shrink-0"
              >
                <ShieldCheck className="h-4 w-4 text-teal-200" aria-hidden="true" />
                ចាកចេញពី Admin Mode
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAdminModal}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-white/12 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white whitespace-nowrap shrink-0"
              >
                <Lock className="h-3.5 w-3.5 text-teal-100" aria-hidden="true" />
                Admin Mode
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
