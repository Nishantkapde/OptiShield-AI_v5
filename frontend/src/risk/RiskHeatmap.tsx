// frontend/src/risk/RiskHeatmap.tsx
// Risk heatmap with 4 interchangeable visualization variants:
//   grid     — classic 5×5 likelihood × impact matrix
//   bubble   — scatter plot, one bubble per asset, radius ∝ √EAL
//   treemap  — nested rectangles, area ∝ EAL, colored by tier
//   radial   — concentric likelihood rings × impact wedges
import React, { memo, useCallback, useMemo, useState } from 'react';
import { Grid3x3, Target } from 'lucide-react';
import { summariseHeatmap } from './heatmapEngine';
import {
  HEATMAP_TIER_VISUALS,
  type DashboardFilter,
  type HeatmapCell,
} from './schema';

// ============================================================
// Formatters & constants
// ============================================================
const fmtUsd = (n: number): string => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return n > 0 ? `$${n}` : '—';
};

const LIKELIHOOD_LABELS = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const IMPACT_LABELS = ['Negligible', 'Minor', 'Moderate', 'Major', 'Severe'];

type Variant = 'grid' | 'bubble' | 'treemap' | 'radial';

const VARIANT_LABELS: Record<Variant, string> = {
  grid: 'Grid',
  bubble: 'Bubble',
  treemap: 'Treemap',
  radial: 'Radial',
};

// ============================================================
// [FIX] Redesigned SVG palette — 5 clearly distinct hues.
//       teal → emerald → amber → orange → red.
//       Higher fill opacity for better contrast on slate-950.
//       Matches the Tailwind palette in schema.ts → HEATMAP_TIER_VISUALS.
// ============================================================
const TIER_HEX: Record<
  HeatmapCell['tier'],
  { fill: string; stroke: string; solid: string }
> = {
  VERY_LOW: {
    fill:   'rgba(20,184,166,0.40)',
    stroke: 'rgb(45,212,191)',
    solid:  'rgb(20,184,166)',
  },
  LOW: {
    fill:   'rgba(34,197,94,0.45)',
    stroke: 'rgb(74,222,128)',
    solid:  'rgb(34,197,94)',
  },
  MEDIUM: {
    fill:   'rgba(250,204,21,0.55)',
    stroke: 'rgb(253,224,71)',
    solid:  'rgb(250,204,21)',
  },
  HIGH: {
    fill:   'rgba(249,115,22,0.60)',
    stroke: 'rgb(251,146,60)',
    solid:  'rgb(249,115,22)',
  },
  CRITICAL: {
    fill:   'rgba(239,68,68,0.70)',
    stroke: 'rgb(248,113,113)',
    solid:  'rgb(239,68,68)',
  },
};

// ============================================================
// Shared helpers — flatten grid into per-cell and per-asset lists
// ============================================================
function flattenCells(grid: HeatmapCell[]): HeatmapCell[] {
  return grid;
}

interface BubbleDatum {
  key: string;
  assetId: string;
  likelihood: number;
  impact: number;
  eal: number;
  tier: HeatmapCell['tier'];
  x: number;
  y: number;
  r: number;
}

function gridToBubbles(grid: HeatmapCell[][], w: number, h: number): BubbleDatum[] {
  const PAD_L = 70, PAD_R = 24, PAD_T = 20, PAD_B = 60;
  const PW = w - PAD_L - PAD_R;
  const PH = h - PAD_T - PAD_B;
  const R_MIN = 14, R_MAX = 46;

  const xFor = (l: number) => PAD_L + ((l - 0.5) / 5) * PW;
  const yFor = (i: number) => PAD_T + PH - ((i - 0.5) / 5) * PH;

  let maxEal = 0;
  for (const row of grid) for (const c of row) if (c.totalEal > maxEal) maxEal = c.totalEal;

  const out: BubbleDatum[] = [];
  for (const row of grid) {
    for (const cell of row) {
      const n = cell.assetIds.length;
      if (n === 0) continue;
      const per = cell.totalEal / n;
      const cx = xFor(cell.likelihoodScore);
      const cy = yFor(cell.impactScore);
      cell.assetIds.forEach((assetId, idx) => {
        let ox = 0, oy = 0;
        if (n > 1) {
          const a = (idx / n) * Math.PI * 2;
          const ringR = 18 + n * 4;
          ox = Math.cos(a) * ringR;
          oy = Math.sin(a) * ringR;
        }
        const ratio = maxEal > 0 ? Math.sqrt(per / maxEal) : 0;
        out.push({
          key: `${assetId}-${cell.likelihoodScore}-${cell.impactScore}`,
          assetId,
          likelihood: cell.likelihoodScore,
          impact: cell.impactScore,
          eal: per,
          tier: cell.tier,
          x: cx + ox,
          y: cy + oy,
          r: R_MIN + (R_MAX - R_MIN) * ratio,
        });
      });
    }
  }
  return out.sort((a, b) => b.r - a.r);
}

// ============================================================
// Treemap — squarified layout, one rectangle per asset
// ============================================================
interface TreemapNode {
  assetId: string;
  likelihood: number;
  impact: number;
  eal: number;
  tier: HeatmapCell['tier'];
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Simple slice-and-dice treemap.
 * Recursively splits the rectangle along its longest axis,
 * dividing items proportionally by EAL until each item is placed.
 */
function buildTreemap(
  assets: { assetId: string; likelihood: number; impact: number; eal: number; tier: HeatmapCell['tier'] }[],
  x: number,
  y: number,
  w: number,
  h: number
): TreemapNode[] {
  if (assets.length === 0) return [];
  if (assets.length === 1) {
    const a = assets[0];
    return [{ ...a, x, y, w, h }];
  }

  const total = assets.reduce((s, a) => s + a.eal, 0);
  if (total <= 0) {
    // Even split
    const per = 1 / assets.length;
    const out: TreemapNode[] = [];
    let cursor = 0;
    for (const a of assets) {
      const size = per;
      if (w >= h) {
        out.push({ ...a, x: x + cursor * w, y, w: size * w, h });
      } else {
        out.push({ ...a, x, y: y + cursor * h, w, h: size * h });
      }
      cursor += size;
    }
    return out;
  }

  // Find split point at ~50%
  let acc = 0;
  let splitIdx = 0;
  for (let i = 0; i < assets.length; i++) {
    acc += assets[i].eal;
    if (acc >= total / 2) {
      splitIdx = i + 1;
      break;
    }
  }
  splitIdx = Math.max(1, Math.min(assets.length - 1, splitIdx));

  const left = assets.slice(0, splitIdx);
  const right = assets.slice(splitIdx);
  const leftTotal = left.reduce((s, a) => s + a.eal, 0);
  const splitRatio = leftTotal / total;

  if (w >= h) {
    const splitX = x + w * splitRatio;
    return [
      ...buildTreemap(left, x, y, w * splitRatio, h),
      ...buildTreemap(right, splitX, y, w * (1 - splitRatio), h),
    ];
  } else {
    const splitY = y + h * splitRatio;
    return [
      ...buildTreemap(left, x, y, w, h * splitRatio),
      ...buildTreemap(right, x, splitY, w, h * (1 - splitRatio)),
    ];
  }
}

// ============================================================
// Cell click → filter
// ============================================================
interface ClickProps {
  likelihood: number;
  impact: number;
  selected: { likelihood: number; impact: number } | null | undefined;
  filter: DashboardFilter;
  onFilterChange: (f: DashboardFilter) => void;
}

function buildClickHandler({ likelihood, impact, selected, filter, onFilterChange }: ClickProps) {
  return () => {
    const isSame = selected?.likelihood === likelihood && selected?.impact === impact;
    onFilterChange({
      ...filter,
      selectedHeatmapCell: isSame ? undefined : { likelihood, impact },
    });
  };
}

// ============================================================
// VARIANT — Grid (5×5 squares)
// ============================================================
const GridVariant: React.FC<{
  grid: HeatmapCell[][];
  filter: DashboardFilter;
  onFilterChange: (f: DashboardFilter) => void;
}> = ({ grid, filter, onFilterChange }) => {
  const selectedCell = filter.selectedHeatmapCell;

  return (
    <div className="flex justify-center">
      <div className="flex gap-3 max-w-2xl w-full">
        <div className="flex flex-col justify-center shrink-0">
          <div className="flex-1 flex flex-col justify-around pr-1">
            {[...LIKELIHOOD_LABELS].reverse().map((label, idx) => (
              <span
                key={label}
                className="text-[10px] font-mono text-slate-500 leading-none text-right"
                style={{ height: 'calc(100% / 5)' }}
                title={label}
              >
                {5 - idx}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-5 gap-2" role="grid" aria-label="Risk heatmap grid">
            {[...grid].reverse().map((row) =>
              row.map((cell) => {
                const vis = HEATMAP_TIER_VISUALS[cell.tier];
                const isEmpty = cell.assetIds.length === 0;
                const isSelected =
                  selectedCell?.likelihood === cell.likelihoodScore &&
                  selectedCell?.impact === cell.impactScore;

                return (
                  <button
                    key={`${cell.likelihoodScore}-${cell.impactScore}`}
                    type="button"
                    disabled={isEmpty}
                    onClick={buildClickHandler({
                      likelihood: cell.likelihoodScore,
                      impact: cell.impactScore,
                      selected: selectedCell,
                      filter,
                      onFilterChange,
                    })}
                    className={`relative aspect-square rounded-md border transition-all duration-200 ${
                      vis.border
                    } ${
                      isEmpty
                        ? 'bg-slate-900/40 border-slate-800 opacity-40 cursor-not-allowed'
                        : `${vis.bg} ${vis.glow} hover:scale-[1.04] cursor-pointer`
                    } ${
                      isSelected
                        ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950'
                        : ''
                    }`}
                  >
                    {!isEmpty && (
                      <>
                        <div className="absolute top-1.5 right-1.5 min-w-[20px] h-[20px] px-1.5 flex items-center justify-center rounded-full bg-slate-950/70 border border-slate-700 text-[10px] font-mono font-bold text-white">
                          {cell.assetIds.length}
                        </div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-sm font-mono font-bold ${vis.text}`}>
                            {fmtUsd(cell.totalEal)}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 mt-1">
                            L{cell.likelihoodScore}·I{cell.impactScore}
                          </span>
                        </div>
                      </>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="grid grid-cols-5 gap-2 mt-2">
            {IMPACT_LABELS.map((label, idx) => (
              <span
                key={label}
                className="text-[10px] font-mono text-slate-500 text-center leading-tight"
              >
                {idx + 1}
                <br />
                <span className="text-slate-600">{label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// VARIANT — Bubble (scatter plot)
// ============================================================
const BubbleVariant: React.FC<{
  grid: HeatmapCell[][];
  filter: DashboardFilter;
  onFilterChange: (f: DashboardFilter) => void;
}> = ({ grid, filter, onFilterChange }) => {
  const selectedCell = filter.selectedHeatmapCell;
  const PAD_L = 70, PAD_R = 24, PAD_T = 20, PAD_B = 60;
  const W = 560, H = 460;
  const PW = W - PAD_L - PAD_R;
  const PH = H - PAD_T - PAD_B;

  const xFor = (l: number) => PAD_L + ((l - 0.5) / 5) * PW;
  const yFor = (i: number) => PAD_T + PH - ((i - 0.5) / 5) * PH;

  const bubbles = useMemo(() => gridToBubbles(grid, W, H), [grid]);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const hovered = bubbles.find((b) => b.key === hoveredKey) ?? null;

  return (
    <div className="flex justify-center">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-3xl" role="img" aria-label="Risk bubble matrix">
        <defs>
          <linearGradient id="bubble-zone" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(20,184,166,0.05)" />
            <stop offset="50%" stopColor="rgba(250,204,21,0.05)" />
            <stop offset="100%" stopColor="rgba(239,68,68,0.08)" />
          </linearGradient>
        </defs>

        <rect x={PAD_L} y={PAD_T} width={PW} height={PH} fill="url(#bubble-zone)" rx={6} />

        {[1, 2, 3, 4, 5].map((n) => (
          <line
            key={`v${n}`}
            x1={xFor(n)}
            y1={PAD_T}
            x2={xFor(n)}
            y2={PAD_T + PH}
            stroke="#1e293b"
            strokeDasharray="3 3"
          />
        ))}
        {[1, 2, 3, 4, 5].map((n) => (
          <line
            key={`h${n}`}
            x1={PAD_L}
            y1={yFor(n)}
            x2={PAD_L + PW}
            y2={yFor(n)}
            stroke="#1e293b"
            strokeDasharray="3 3"
          />
        ))}

        <rect x={PAD_L} y={PAD_T} width={PW} height={PH} fill="none" stroke="#334155" rx={6} />

        {LIKELIHOOD_LABELS.map((label, idx) => (
          <g key={label}>
            <text
              x={xFor(idx + 1)}
              y={PAD_T + PH + 18}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={10}
              fontFamily="ui-monospace, monospace"
              fontWeight={600}
            >
              {idx + 1}
            </text>
            <text
              x={xFor(idx + 1)}
              y={PAD_T + PH + 32}
              textAnchor="middle"
              fill="#64748b"
              fontSize={9}
              fontFamily="ui-monospace, monospace"
            >
              {label}
            </text>
          </g>
        ))}
        {IMPACT_LABELS.map((label, idx) => (
          <g key={label}>
            <text
              x={PAD_L - 10}
              y={yFor(idx + 1) + 3}
              textAnchor="end"
              fill="#94a3b8"
              fontSize={10}
              fontFamily="ui-monospace, monospace"
              fontWeight={600}
            >
              {idx + 1}
            </text>
            <text
              x={PAD_L - 10}
              y={yFor(idx + 1) + 15}
              textAnchor="end"
              fill="#64748b"
              fontSize={9}
              fontFamily="ui-monospace, monospace"
            >
              {label}
            </text>
          </g>
        ))}

        <text
          x={PAD_L + PW / 2}
          y={448}
          textAnchor="middle"
          fill="#64748b"
          fontSize={10}
          fontFamily="ui-monospace, monospace"
          fontWeight={600}
          letterSpacing={1}
        >
          LIKELIHOOD →
        </text>
        <text
          x={16}
          y={PAD_T + PH / 2}
          textAnchor="middle"
          fill="#64748b"
          fontSize={10}
          fontFamily="ui-monospace, monospace"
          fontWeight={600}
          letterSpacing={1}
          transform={`rotate(-90 16 ${PAD_T + PH / 2})`}
        >
          IMPACT →
        </text>

        {bubbles.map((b) => {
          const colors = TIER_HEX[b.tier];
          const isSelected =
            selectedCell?.likelihood === b.likelihood &&
            selectedCell?.impact === b.impact;
          const isHovered = hoveredKey === b.key;

          return (
            <g
              key={b.key}
              style={{ cursor: 'pointer' }}
              onClick={buildClickHandler({
                likelihood: b.likelihood,
                impact: b.impact,
                selected: selectedCell,
                filter,
                onFilterChange,
              })}
              onMouseEnter={() => setHoveredKey(b.key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <circle
                cx={b.x}
                cy={b.y}
                r={b.r}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 1.5}
                style={{ transition: 'stroke-width 150ms ease-out' }}
              />
              {isSelected && (
                <circle
                  cx={b.x}
                  cy={b.y}
                  r={b.r + 6}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
              )}
              {b.r >= 26 && (
                <text
                  x={b.x}
                  y={b.y + 3}
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize={9}
                  fontFamily="ui-monospace, monospace"
                  fontWeight={700}
                  pointerEvents="none"
                >
                  {b.assetId}
                </text>
              )}
            </g>
          );
        })}

        {hovered && (() => {
          const tx = Math.min(Math.max(hovered.x, 100), 460);
          const ty = hovered.y - hovered.r - 12;
          return (
            <g pointerEvents="none">
              <rect
                x={tx - 90}
                y={ty - 46}
                width={180}
                height={44}
                rx={6}
                fill="#020617"
                stroke="#334155"
                strokeWidth={1}
              />
              <text
                x={tx}
                y={ty - 30}
                textAnchor="middle"
                fill="#f8fafc"
                fontSize={11}
                fontFamily="ui-monospace, monospace"
                fontWeight={700}
              >
                {hovered.assetId}
              </text>
              <text
                x={tx}
                y={ty - 14}
                textAnchor="middle"
                fill="#22d3ee"
                fontSize={10}
                fontFamily="ui-monospace, monospace"
              >
                EAL: {fmtUsd(hovered.eal)}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};

// ============================================================
// VARIANT — Treemap (squarified rects sized by EAL)
// ============================================================
const TreemapVariant: React.FC<{
  grid: HeatmapCell[][];
  filter: DashboardFilter;
  onFilterChange: (f: DashboardFilter) => void;
}> = ({ grid, filter, onFilterChange }) => {
  const selectedCell = filter.selectedHeatmapCell;
  const W = 560, H = 400;

  // Flatten cells → per-asset items
  const items = useMemo(() => {
    const flat: {
      assetId: string;
      likelihood: number;
      impact: number;
      eal: number;
      tier: HeatmapCell['tier'];
    }[] = [];
    for (const row of grid) {
      for (const cell of row) {
        if (cell.assetIds.length === 0) continue;
        const per = cell.totalEal / cell.assetIds.length;
        for (const assetId of cell.assetIds) {
          flat.push({
            assetId,
            likelihood: cell.likelihoodScore,
            impact: cell.impactScore,
            eal: per,
            tier: cell.tier,
          });
        }
      }
    }
    return flat.sort((a, b) => b.eal - a.eal);
  }, [grid]);

  const nodes = useMemo(() => buildTreemap(items, 0, 0, W, H), [items]);

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  return (
    <div className="flex justify-center">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-3xl rounded-md"
        role="img"
        aria-label="Risk treemap"
      >
        {nodes.map((node) => {
          const colors = TIER_HEX[node.tier];
          const isSelected =
            selectedCell?.likelihood === node.likelihood &&
            selectedCell?.impact === node.impact;
          const isHovered = hoveredKey === node.assetId;
          const showLabel = node.w > 60 && node.h > 40;

          return (
            <g
              key={node.assetId}
              style={{ cursor: 'pointer' }}
              onClick={buildClickHandler({
                likelihood: node.likelihood,
                impact: node.impact,
                selected: selectedCell,
                filter,
                onFilterChange,
              })}
              onMouseEnter={() => setHoveredKey(node.assetId)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <rect
                x={node.x + 1}
                y={node.y + 1}
                width={Math.max(0, node.w - 2)}
                height={Math.max(0, node.h - 2)}
                fill={colors.fill}
                stroke={isSelected ? '#22d3ee' : colors.stroke}
                strokeWidth={isSelected ? 2.5 : 1.25}
                rx={4}
                style={{ transition: 'stroke-width 150ms ease-out' }}
              />
              {showLabel && (
                <>
                  <text
                    x={node.x + node.w / 2}
                    y={node.y + node.h / 2 - 4}
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize={11}
                    fontFamily="ui-monospace, monospace"
                    fontWeight={700}
                    pointerEvents="none"
                  >
                    {node.assetId}
                  </text>
                  <text
                    x={node.x + node.w / 2}
                    y={node.y + node.h / 2 + 10}
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize={10}
                    fontFamily="ui-monospace, monospace"
                    pointerEvents="none"
                  >
                    {fmtUsd(node.eal)}
                  </text>
                  <text
                    x={node.x + node.w / 2}
                    y={node.y + node.h / 2 + 24}
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize={9}
                    fontFamily="ui-monospace, monospace"
                    pointerEvents="none"
                  >
                    L{node.likelihood}·I{node.impact}
                  </text>
                </>
              )}
              {!showLabel && isHovered && (
                <text
                  x={node.x + node.w / 2}
                  y={node.y + node.h / 2 + 3}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize={9}
                  fontFamily="ui-monospace, monospace"
                  fontWeight={700}
                  pointerEvents="none"
                >
                  {node.assetId}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ============================================================
// VARIANT — Radial (5 rings × 5 wedges)
// ============================================================
const RADIAL_ACTIVE_COS = 0.35; // angular half-width of each wedge

const RadialVariant: React.FC<{
  grid: HeatmapCell[][];
  filter: DashboardFilter;
  onFilterChange: (f: DashboardFilter) => void;
}> = ({ grid, filter, onFilterChange }) => {
  const selectedCell = filter.selectedHeatmapCell;

  const W = 520, H = 480;
  const CX = W / 2;
  const CY = H / 2 - 6;
  const R_MIN = 40;
  const R_MAX = 210;
  const RING_STEP = (R_MAX - R_MIN) / 5;

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Angle: wedge i (impact 1..5) spans a 72° arc, centered at -90°
  // (top of the circle) so impact 5 is directly upward.
  const angleForImpact = (i: number) => {
    // i = 1..5, map to angle in radians measured clockwise from top
    const t = (i - 1) / 5 + 0.5 / 5; // 0..1
    return -Math.PI / 2 + (t - 0.5) * 2 * Math.PI; // -90° offset
  };

  const wedgePath = (i: number, rInner: number, rOuter: number): string => {
    const a0 = angleForImpact(i) - RADIAL_ACTIVE_COS;
    const a1 = angleForImpact(i) + RADIAL_ACTIVE_COS;
    const x0i = CX + rInner * Math.cos(a0);
    const y0i = CY + rInner * Math.sin(a0);
    const x1i = CX + rInner * Math.cos(a1);
    const y1i = CY + rInner * Math.sin(a1);
    const x0o = CX + rOuter * Math.cos(a0);
    const y0o = CY + rOuter * Math.sin(a0);
    const x1o = CX + rOuter * Math.cos(a1);
    const y1o = CY + rOuter * Math.sin(a1);
    const largeArc = a1 - a0 > Math.PI ? 1 : 0;
    return [
      `M ${x0i} ${y0i}`,
      `A ${rInner} ${rInner} 0 ${largeArc} 1 ${x1i} ${y1i}`,
      `L ${x1o} ${y1o}`,
      `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${x0o} ${y0o}`,
      'Z',
    ].join(' ');
  };

  return (
    <div className="flex justify-center">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-2xl" role="img" aria-label="Radial risk heatmap">
        {/* Impact direction labels (outside the outer ring) */}
        {[1, 2, 3, 4, 5].map((i) => {
          const a = angleForImpact(i);
          const rx = CX + (R_MAX + 24) * Math.cos(a);
          const ry = CY + (R_MAX + 24) * Math.sin(a);
          return (
            <text
              key={`impact-${i}`}
              x={rx}
              y={ry + 3}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={10}
              fontFamily="ui-monospace, monospace"
              fontWeight={700}
            >
              I{i}
            </text>
          );
        })}

        {/* Ring labels (likelihood 1..5, inner → outer) */}
        {[1, 2, 3, 4, 5].map((l) => {
          const r = R_MIN + (l - 0.5) * RING_STEP;
          return (
            <text
              key={`lik-${l}`}
              x={CX - r - 2}
              y={CY + 3}
              textAnchor="end"
              fill="#64748b"
              fontSize={9}
              fontFamily="ui-monospace, monospace"
            >
              L{l}
            </text>
          );
        })}

        {/* Wedges */}
        {grid.map((row) =>
          row.map((cell) => {
            const l = cell.likelihoodScore;
            const i = cell.impactScore;
            const rInner = R_MIN + (l - 1) * RING_STEP;
            const rOuter = rInner + RING_STEP;
            const isEmpty = cell.assetIds.length === 0;
            const colors = TIER_HEX[cell.tier];
            const isSelected =
              selectedCell?.likelihood === l && selectedCell?.impact === i;
            const key = `${l}-${i}`;
            const isHovered = hoveredKey === key;

            return (
              <path
                key={key}
                d={wedgePath(i, rInner, rOuter)}
                fill={isEmpty ? 'rgba(30,41,59,0.4)' : colors.fill}
                stroke={isSelected ? '#22d3ee' : isEmpty ? '#1e293b' : colors.stroke}
                strokeWidth={isSelected ? 2.5 : 1}
                style={{
                  cursor: isEmpty ? 'default' : 'pointer',
                  transition: 'stroke-width 150ms ease-out',
                }}
                onClick={
                  isEmpty
                    ? undefined
                    : buildClickHandler({
                        likelihood: l,
                        impact: i,
                        selected: selectedCell,
                        filter,
                        onFilterChange,
                      })
                }
                onMouseEnter={() => !isEmpty && setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
              />
            );
          })
        )}

        {/* Center label */}
        <circle cx={CX} cy={CY} r={R_MIN - 6} fill="#020617" stroke="#1e293b" />
        <text
          x={CX}
          y={CY - 4}
          textAnchor="middle"
          fill="#64748b"
          fontSize={9}
          fontFamily="ui-monospace, monospace"
          fontWeight={700}
        >
          RISK
        </text>
        <text
          x={CX}
          y={CY + 8}
          textAnchor="middle"
          fill="#64748b"
          fontSize={9}
          fontFamily="ui-monospace, monospace"
          fontWeight={700}
        >
          RADIAL
        </text>

        {/* Hover tooltip */}
        {hoveredKey && (() => {
          const [lStr, iStr] = hoveredKey.split('-');
          const l = Number(lStr), i = Number(iStr);
          const cell = grid[l - 1]?.[i - 1];
          if (!cell || cell.assetIds.length === 0) return null;
          const a = angleForImpact(i);
          const rMid = R_MIN + (l - 0.5) * RING_STEP;
          const tx = CX + (rMid + 40) * Math.cos(a);
          const ty = CY + (rMid + 40) * Math.sin(a);
          return (
            <g pointerEvents="none">
              <rect
                x={tx - 80}
                y={ty - 24}
                width={160}
                height={40}
                rx={6}
                fill="#020617"
                stroke="#334155"
              />
              <text
                x={tx}
                y={ty - 8}
                textAnchor="middle"
                fill="#f8fafc"
                fontSize={10}
                fontFamily="ui-monospace, monospace"
                fontWeight={700}
              >
                L{l} · I{i}
              </text>
              <text
                x={tx}
                y={ty + 6}
                textAnchor="middle"
                fill="#22d3ee"
                fontSize={10}
                fontFamily="ui-monospace, monospace"
              >
                {cell.assetIds.length} asset{cell.assetIds.length === 1 ? '' : 's'} · {fmtUsd(cell.totalEal)}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};

// ============================================================
// Props
// ============================================================
interface RiskHeatmapProps {
  grid: HeatmapCell[][];
  filter: DashboardFilter;
  onFilterChange: (filter: DashboardFilter) => void;
}

// ============================================================
// Main component
// ============================================================
const RiskHeatmap = memo<RiskHeatmapProps>(({ grid, filter, onFilterChange }) => {
  const [variant, setVariant] = useState<Variant>('bubble');
  const stats = summariseHeatmap(grid);
  const selectedCell = filter.selectedHeatmapCell;

  const handleClear = useCallback(() => {
    onFilterChange({ ...filter, selectedHeatmapCell: undefined });
  }, [filter, onFilterChange]);

  const subtitle: Record<Variant, string> = {
    grid: `Likelihood (LEF) × Impact (directLoss) · ${stats.assetCount} assets · ${fmtUsd(stats.totalEal)} aggregated EAL`,
    bubble: `Scatter · one bubble per asset · radius ∝ √EAL · ${stats.assetCount} assets · ${fmtUsd(stats.totalEal)} total`,
    treemap: `Nested rectangles · area ∝ EAL · ${stats.assetCount} assets · ${fmtUsd(stats.totalEal)} total`,
    radial: `Concentric likelihood rings × impact wedges · ${stats.assetCount} assets · ${fmtUsd(stats.totalEal)} total`,
  };

  return (
    <section
      className="bg-slate-950 border border-slate-800 rounded-xl p-4 lg:p-5 shadow-2xl"
      aria-labelledby="risk-heatmap-heading"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
            <Grid3x3 className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2
              id="risk-heatmap-heading"
              className="text-base lg:text-lg font-semibold text-white flex items-center gap-2"
            >
              Risk Heatmap
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded uppercase">
                {VARIANT_LABELS[variant]}
              </span>
            </h2>
            <p className="text-xs text-slate-400">{subtitle[variant]}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Variant switcher */}
          <div className="flex items-center gap-0.5 p-1 bg-slate-900/80 border border-slate-800 rounded-lg">
            {(Object.keys(VARIANT_LABELS) as Variant[]).map((v) => {
              const isActive = variant === v;
              return (
                <button
                  key={v}
                  onClick={() => setVariant(v)}
                  className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                  aria-pressed={isActive}
                >
                  {VARIANT_LABELS[v]}
                </button>
              );
            })}
          </div>

          {selectedCell && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-400">
              <Target className="w-3 h-3" />
              L{selectedCell.likelihood} · I{selectedCell.impact}
            </span>
          )}
          {selectedCell && (
            <button
              onClick={handleClear}
              className="px-2.5 py-1 rounded-md text-[10px] font-medium text-slate-400 hover:text-slate-200 bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Active variant */}
      {variant === 'grid' && (
        <GridVariant grid={grid} filter={filter} onFilterChange={onFilterChange} />
      )}
      {variant === 'bubble' && (
        <BubbleVariant grid={grid} filter={filter} onFilterChange={onFilterChange} />
      )}
      {variant === 'treemap' && (
        <TreemapVariant grid={grid} filter={filter} onFilterChange={onFilterChange} />
      )}
      {variant === 'radial' && (
        <RadialVariant grid={grid} filter={filter} onFilterChange={onFilterChange} />
      )}

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
          Tier:
        </span>
        {(['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((tier) => {
          const vis = HEATMAP_TIER_VISUALS[tier];
          return (
            <span key={tier} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-sm border ${vis.bg} ${vis.border}`} />
              <span className="text-[10px] text-slate-400">{vis.label}</span>
            </span>
          );
        })}
        <span className="ml-auto text-[10px] font-mono text-slate-500">
          Click to filter · Try each variant above
        </span>
      </div>
    </section>
  );
});
RiskHeatmap.displayName = 'RiskHeatmap';

export default RiskHeatmap;