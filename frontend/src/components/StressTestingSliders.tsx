import { useMemo } from 'react';
import {
  AlertTriangle,
  DollarSign,
  KeyRound,
  Network,
  Scale,
  SlidersHorizontal,
  Zap,
} from '@/icons';
import {
  BUDGET_MAX,
  BUDGET_MIN,
  BUDGET_STEP,
  ThreatToggle,
  threatToggles,
  formatCurrency,
} from '@/data';

interface StressTestingSlidersProps {
  budget: number;
  enabledThreats: string[];
  onBudgetChange: (value: number) => void;
  onThreatToggle: (id: string) => void;
}

const threatIcons = {
  alert: AlertTriangle,
  scale: Scale,
  network: Network,
  key: KeyRound,
};

// ============================================================
// Tailwind arbitrary variants — cross-browser range input styling.
// Kept as a hoisted constant so it doesn't re-allocate per render.
//
// Why all this is needed:
//   - `appearance-none` alone doesn't hide the native track on
//     Chrome/Safari/Firefox. Each engine needs its own pseudo.
//   - Without styling the thumb, the browser draws its default
//     circle which is mis-sized for our 6px track.
//   - Making the native track transparent lets our custom
//     gradient div be the visible track, so fill + thumb line up.
// ============================================================
const SLIDER_CLASS = [
  // cover the whole wrapper, transparent background, pointer
  'absolute inset-0 w-full h-full cursor-pointer appearance-none bg-transparent',
  // WebKit (Chrome, Edge, Safari)
  '[&::-webkit-slider-runnable-track]:h-1.5',
  '[&::-webkit-slider-runnable-track]:bg-transparent',
  '[&::-webkit-slider-runnable-track]:border-0',
  '[&::-webkit-slider-thumb]:appearance-none',
  '[&::-webkit-slider-thumb]:h-3.5',
  '[&::-webkit-slider-thumb]:w-3.5',
  '[&::-webkit-slider-thumb]:-mt-[4px]',
  '[&::-webkit-slider-thumb]:rounded-full',
  '[&::-webkit-slider-thumb]:bg-white',
  '[&::-webkit-slider-thumb]:border',
  '[&::-webkit-slider-thumb]:border-cyan-400',
  '[&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(34,211,238,0.7)]',
  // Firefox
  '[&::-moz-range-track]:h-1.5',
  '[&::-moz-range-track]:bg-transparent',
  '[&::-moz-range-track]:border-0',
  '[&::-moz-range-thumb]:h-3.5',
  '[&::-moz-range-thumb]:w-3.5',
  '[&::-moz-range-thumb]:rounded-full',
  '[&::-moz-range-thumb]:bg-white',
  '[&::-moz-range-thumb]:border',
  '[&::-moz-range-thumb]:border-cyan-400',
  '[&::-moz-range-thumb]:shadow-[0_0_10px_rgba(34,211,238,0.7)]',
  // focus ring — soft cyan glow
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40',
  'focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950',
].join(' ');

export function StressTestingSliders({
  budget,
  enabledThreats,
  onBudgetChange,
  onThreatToggle,
}: StressTestingSlidersProps) {
  // [FIX 1] Clamp the percentage to [0, 100]. Without this, a budget
  //         greater than BUDGET_MAX (e.g. $6.5M vs a $5M max) produces
  //         a percentage like 131%, which overflows the track.
  const rawPercent =
    ((budget - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100;
  const budgetPercent = Math.max(0, Math.min(100, rawPercent));

  const selectedCount = enabledThreats.length;

  const scenarioMultiplier = useMemo(
    () =>
      enabledThreats.reduce((total, id) => {
        const threat = threatToggles.find((item) => item.id === id);
        return total + (threat ? threat.multiplier - 1 : 0);
      }, 1),
    [enabledThreats]
  );

  return (
    <section className="rounded-xl border border-cyan-500/20 bg-ink-900/80 p-4 shadow-[0_0_30px_rgba(34,211,238,0.04)] sm:p-5">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-400">
            <SlidersHorizontal className="h-3 w-3" />
            05 / Stress testing
          </div>
          <h2 className="text-[15px] font-semibold tracking-tight text-white">
            Dynamic scenario controls
          </h2>
          <p className="mt-1 text-[10px] text-ink-400">
            Changes flow into Revenue-at-Risk in real time.
          </p>
        </div>
        <div className="rounded-md border border-ink-700 bg-ink-850 px-2 py-1.5 text-right">
          <div className="font-mono text-[9px] uppercase tracking-wider text-ink-500">
            Active scenarios
          </div>
          <div className="mt-0.5 font-mono text-[13px] text-amber-300">
            {selectedCount}
            <span className="text-[10px] text-ink-500"> / 4</span>
          </div>
        </div>
      </div>

      {/* Budget slider block */}
      <div className="rounded-lg border border-ink-700 bg-ink-850/70 p-4">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] text-ink-300">
              <DollarSign className="h-3 w-3 text-cyan-400" />
              Total security budget
            </div>
            <div className="mt-1 font-mono text-2xl font-semibold text-white">
              {formatCurrency(budget)}
            </div>
          </div>
          <div className="text-right text-[9px] text-ink-500">
            Model response{' '}
            <span className="font-mono text-emerald-400">&lt;10ms</span>
          </div>
        </div>

        {/*
          [FIX 2] `overflow-hidden` on the visual track guarantees the
                  gradient fill can never bleed past the rounded bar,
                  even if a value edge case slipped through the clamp.
        */}
        <div className="relative h-4">
          {/* Visual track */}
          <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-ink-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-[width] duration-75"
              style={{ width: `${budgetPercent}%` }}
            />
          </div>

          {/* Native input — thumb only */}
          <input
            aria-label="Total security budget"
            type="range"
            min={BUDGET_MIN}
            max={BUDGET_MAX}
            step={BUDGET_STEP}
            // [FIX 3] Clamp the value so the thumb sits at the right edge
            //         when budget > BUDGET_MAX. Also suppresses the React
            //         "value out of range" warning.
            value={Math.max(BUDGET_MIN, Math.min(BUDGET_MAX, budget))}
            onChange={(event) => onBudgetChange(Number(event.target.value))}
            className={SLIDER_CLASS}
          />
        </div>

        <div className="mt-2 flex justify-between font-mono text-[9px] text-ink-500">
          <span>{formatCurrency(BUDGET_MIN)}</span>
          <span>{formatCurrency((BUDGET_MIN + BUDGET_MAX) / 2)}</span>
          <span>{formatCurrency(BUDGET_MAX)}</span>
        </div>
      </div>

      {/* Threat toggles */}
      <div className="mt-4 space-y-2">
        {threatToggles.map((threat: ThreatToggle) => {
          const Icon = threatIcons[threat.icon as keyof typeof threatIcons];
          const enabled = enabledThreats.includes(threat.id);
          return (
            <button
              key={threat.id}
              onClick={() => onThreatToggle(threat.id)}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                enabled
                  ? 'border-amber-400/30 bg-amber-400/[0.06]'
                  : 'border-ink-700/70 bg-ink-850/40 hover:border-ink-500'
              }`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-md ${
                  enabled
                    ? 'bg-amber-400/15 text-amber-300'
                    : 'bg-ink-700 text-ink-400'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={`text-[10px] font-medium ${
                    enabled ? 'text-amber-100' : 'text-ink-200'
                  }`}
                >
                  {threat.label}
                </div>
                <div className="mt-0.5 truncate text-[9px] text-ink-500">
                  {threat.description}
                </div>
              </div>
              <div
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  enabled ? 'bg-amber-400' : 'bg-ink-600'
                }`}
              >
                <span
                  className={`absolute top-1 h-3 w-3 rounded-full transition-transform ${
                    enabled
                      ? 'translate-x-5 bg-ink-950'
                      : 'translate-x-1 bg-ink-300'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer — combined multiplier */}
      <div className="mt-4 flex items-center justify-between border-t border-ink-700/70 pt-3 text-[10px]">
        <span className="flex items-center gap-1.5 text-ink-500">
          <Zap className="h-3 w-3 text-cyan-400" />
          Combined exposure multiplier
        </span>
        <span className="font-mono font-medium text-amber-300">
          {scenarioMultiplier.toFixed(2)}×
        </span>
      </div>
    </section>
  );
}