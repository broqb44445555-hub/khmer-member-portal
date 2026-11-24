import { Users } from 'lucide-react';

interface HeaderBannerProps {
  totalCount: number;
  maleCount: number;
  femaleCount: number;
  todayCount: number;
}

export function HeaderBanner({
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
                គ្រប់គ្រងព័ត៌មានសមាជិក រូបភាព ការជូនដំណឹង Telegram ភ្លាមៗ និងឯកសារ Excel / Google Sheets
              </p>
            </div>
          </div>

          {/* Clean unboxed tabular summary metrics */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/15 pt-4 lg:border-t-0 lg:pt-0">
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-teal-100/80">សរុប</span>
              <span className="font-mono text-xl font-semibold tabular-nums text-white">
                {totalCount}
              </span>
            </div>
            <span aria-hidden="true" className="hidden h-5 w-px bg-white/20 sm:inline-block" />
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-teal-100/80">ប្រុស</span>
              <span className="font-mono text-lg font-medium tabular-nums text-white">
                {maleCount}
              </span>
            </div>
            <span aria-hidden="true" className="hidden h-5 w-px bg-white/20 sm:inline-block" />
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-teal-100/80">ស្រី</span>
              <span className="font-mono text-lg font-medium tabular-nums text-white">
                {femaleCount}
              </span>
            </div>
            <span aria-hidden="true" className="hidden h-5 w-px bg-white/20 sm:inline-block" />
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-teal-100/80">ថ្ងៃនេះ</span>
              <span className="font-mono text-lg font-medium tabular-nums text-teal-200">
                {todayCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
