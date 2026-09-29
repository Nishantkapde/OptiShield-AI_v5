// frontend/src/pages/LandingPage.tsx
// OptiShield AI — animated marketing landing page.
// Pure React + Tailwind + lucide-react. Zero external animation deps.
import React, { useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  ArrowRight,
  Activity,
  Calculator,
  Zap,
  Network,
  FlaskConical,
  GitBranch,
  BarChart3,
  Fingerprint,
  FileCheck2,
  CheckCircle2,
  Lock,
  ChevronRight,
} from 'lucide-react';

// ============================================================
// Props
// ============================================================
interface LandingPageProps {
  onEnter: () => void;
}

// ============================================================
// Hook: count-up animation driven by IntersectionObserver.
// Numbers start animating when their element scrolls into view.
// ============================================================
function useCountUp(target: number, duration = 1600) {
  const ref = useRef<HTMLParagraphElement | null>(null);
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          const t0 = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - t0) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            setValue(target * eased);
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { ref, value };
}

// ============================================================
// Hook: scroll-reveal
// ============================================================
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

const Reveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
}> = ({ children, delay = 0, className = '' }) => {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// ============================================================
// Animated background
// ============================================================
const AnimatedBackground: React.FC = () => (
  <div className="pointer-events-none fixed inset-0 overflow-hidden">
    <div
      className="absolute inset-0 opacity-[0.07]"
      style={{
        backgroundImage:
          'linear-gradient(rgba(34,211,238,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.5) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        maskImage:
          'radial-gradient(ellipse at center, black 40%, transparent 80%)',
        WebkitMaskImage:
          'radial-gradient(ellipse at center, black 40%, transparent 80%)',
      }}
    />
    <div
      className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-3xl opacity-25 animate-float-slow"
      style={{
        background:
          'radial-gradient(circle, rgba(34,211,238,0.6) 0%, rgba(34,211,238,0) 70%)',
      }}
    />
    <div
      className="absolute top-1/3 -right-40 w-[480px] h-[480px] rounded-full blur-3xl opacity-20 animate-float-slower"
      style={{
        background:
          'radial-gradient(circle, rgba(16,185,129,0.6) 0%, rgba(16,185,129,0) 70%)',
      }}
    />
    <div
      className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full blur-3xl opacity-15 animate-float-slow"
      style={{
        background:
          'radial-gradient(circle, rgba(244,63,94,0.5) 0%, rgba(244,63,94,0) 70%)',
      }}
    />
  </div>
);

// ============================================================
// Sticky nav
// ============================================================
const LandingNav: React.FC<{ onEnter: () => void }> = ({ onEnter }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/30 to-emerald-500/30 border border-cyan-500/40">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">OptiShield AI</p>
            <p className="text-[9px] font-semibold tracking-[0.14em] text-slate-500 uppercase leading-tight">
              Cyber-Risk Decision Platform
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-400">
          <a href="#capabilities" className="hover:text-cyan-400 transition-colors">
            Capabilities
          </a>
          <a href="#metrics" className="hover:text-cyan-400 transition-colors">
            Impact
          </a>
          <a href="#how" className="hover:text-cyan-400 transition-colors">
            How it works
          </a>
        </div>

        <button
          onClick={onEnter}
          className="group relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
        >
          Launch Platform
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </nav>
  );
};

// ============================================================
// Hero
// ============================================================
const MetricTile: React.FC<{
  label: string;
  value: string;
  sub: string;
  accent: string;
  valueRef: React.RefObject<HTMLParagraphElement>;
}> = ({ label, value, sub, accent, valueRef }) => (
  <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur p-4 hover:border-slate-700 transition-colors">
    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
      {label}
    </p>
    <p ref={valueRef} className={`mt-1 text-2xl font-bold font-mono tabular-nums ${accent}`}>
      {value}
    </p>
    <p className="mt-1 text-[10px] text-slate-600 font-mono">{sub}</p>
  </div>
);

const Hero: React.FC<{ onEnter: () => void }> = ({ onEnter }) => {
  const systemEal = useCountUp(127.4, 1800);
  const var95 = useCountUp(2.76, 1800);
  const assets = useCountUp(6, 1400);
  const deltaMs = useCountUp(0.4, 1200);

  return (
    <section className="relative pt-16 lg:pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/5 text-[11px] font-medium text-cyan-400 mb-8">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
            </span>
            Live quantitative engine · 10,000 Monte Carlo iterations in-browser
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.05] max-w-4xl">
            <span className="text-white">Cyber risk, </span>
            <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent animate-shimmer bg-[length:200%_auto]">
              quantified in dollars
            </span>
            <span className="text-white">.</span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
            OptiShield AI turns technical telemetry into board-ready financial
            exposure — Expected Annual Loss, 95% Value-at-Risk, compliance
            coverage, and remediation ROI. All in one client-side engine that
            never leaves your browser.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <button
              onClick={onEnter}
              className="group relative flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 transition-all shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:-translate-y-0.5"
            >
              Enter Dashboard
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <a
              href="#capabilities"
              className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white hover:bg-slate-900/60 transition-all"
            >
              See capabilities
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </Reveal>

        <Reveal delay={320}>
          <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl">
            <MetricTile
              label="System EAL"
              valueRef={systemEal.ref}
              value={`$${systemEal.value.toFixed(1)}M`}
              accent="text-cyan-400"
              sub="Demo portfolio"
            />
            <MetricTile
              label="95% VaR"
              valueRef={var95.ref}
              value={`$${var95.value.toFixed(2)}M`}
              accent="text-rose-400"
              sub="Monte Carlo tail"
            />
            <MetricTile
              label="Assets Tracked"
              valueRef={assets.ref}
              value={String(Math.round(assets.value))}
              accent="text-emerald-400"
              sub="Live in-memory graph"
            />
            <MetricTile
              label="Delta Recalc"
              valueRef={deltaMs.ref}
              value={`${deltaMs.value.toFixed(2)}ms`}
              accent="text-amber-400"
              sub="Per telemetry event"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
};

// ============================================================
// Trust bar
// ============================================================
const TrustBar: React.FC = () => {
  const frameworks = [
    'ISO 27001',
    'NIST CSF 2.0',
    'SEBI CSCRF',
    'CIS Controls',
    'RBI Cyber Framework',
  ];
  return (
    <Reveal>
      <section className="relative py-12 border-y border-slate-800/60">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-600 font-semibold text-center mb-6">
            Aligned with regulatory frameworks
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {frameworks.map((f) => (
              <span
                key={f}
                className="text-sm font-medium text-slate-500 hover:text-cyan-400 transition-colors cursor-default"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </section>
    </Reveal>
  );
};

// ============================================================
// Feature grid
// ============================================================
interface FeatureCard {
  icon: React.ElementType;
  title: string;
  body: string;
  chip: string;
}

const FEATURES: readonly FeatureCard[] = Object.freeze([
  {
    icon: Calculator,
    title: 'Deterministic Risk Engine',
    body: 'Per-asset EAL from direct loss × loss event frequency. Maintenance mode zeroes unplanned risk and reclassifies downtime cost.',
    chip: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
  },
  {
    icon: FlaskConical,
    title: 'Monte Carlo & VaR',
    body: '10,000 PERT-sampled scenarios per asset in under 20ms. 90/95/99% VaR, Max Probable Loss, and a full Loss Exceedance Curve.',
    chip: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
  },
  {
    icon: BarChart3,
    title: 'Budget Optimizer',
    body: '0-1 Knapsack DP finds the control portfolio that maximizes ΔEAL per dollar. Efficient Frontier plots every funding tier.',
    chip: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  },
  {
    icon: Zap,
    title: 'O(1) Delta Engine',
    body: 'One telemetry event triggers one asset recalculation — not a full-graph sweep. Sub-millisecond per update, regardless of portfolio size.',
    chip: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  },
  {
    icon: Network,
    title: 'Supply Chain DAG',
    body: 'Topological traversal of vendor → asset dependencies. Detect single points of failure and cascading loss in constant time.',
    chip: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  },
  {
    icon: GitBranch,
    title: 'Multi-Source Correlation',
    body: 'EDR, SIEM, IAM, and CSPM signals correlated per asset with weighted TCI. Operational context dampening suppresses false positives.',
    chip: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
  },
  {
    icon: ShieldCheck,
    title: 'Compliance & Board Reporting',
    body: 'Weighted coverage against ISO 27001, NIST CSF 2.0, and SEBI CSCRF. Risk appetite breach detection against 95% VaR.',
    chip: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  },
  {
    icon: Fingerprint,
    title: 'Tamper-Evident Audit Trail',
    body: 'SHA-256 hash-chained ledger via the Web Crypto API. Persisted to IndexedDB. Verified on every state change.',
    chip: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
  },
  {
    icon: FileCheck2,
    title: 'One-Click Report Export',
    body: 'Board-ready briefs in Markdown, JSON, or PDF — generated entirely client-side. No data leaves the device.',
    chip: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
  },
]);

const FeatureGrid: React.FC = () => (
  <section id="capabilities" className="relative py-20 lg:py-28">
    <div className="max-w-7xl mx-auto px-6 lg:px-10">
      <Reveal>
        <div className="max-w-2xl mb-12">
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400 font-semibold mb-3">
            Capabilities
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight">
            Ten pain points, one platform.
          </h2>
          <p className="mt-4 text-slate-400 leading-relaxed">
            Every module solves a real problem CISOs face today — from stale
            spreadsheets to intuition-driven capital allocation.
          </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <Reveal key={feature.title} delay={idx * 40}>
              <div className="group relative h-full rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur p-5 transition-all duration-300 hover:border-slate-700 hover:bg-slate-900/70 hover:-translate-y-1">
                <div className={`inline-flex p-2 rounded-lg border ${feature.chip} mb-4`}>
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  {feature.body}
                </p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  </section>
);

// ============================================================
// Impact section
// ============================================================
const BigStat: React.FC<{
  value: string;
  label: string;
  sub: string;
  accent: string;
  valueRef: React.RefObject<HTMLParagraphElement>;
}> = ({ value, label, sub, accent, valueRef }) => (
  <div className="rounded-xl border border-slate-800/80 bg-gradient-to-br from-slate-900/60 to-slate-950 p-6">
    <p ref={valueRef} className={`text-4xl lg:text-5xl font-bold font-mono tabular-nums ${accent}`}>
      {value}
    </p>
    <p className="mt-3 text-sm font-semibold text-white">{label}</p>
    <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">{sub}</p>
  </div>
);

const ImpactSection: React.FC = () => {
  const iterations = useCountUp(10000, 2000);
  const reduc = useCountUp(60, 1600);
  const assets = useCountUp(6, 1400);

  return (
    <section id="metrics" className="relative py-20 lg:py-28 border-y border-slate-800/60">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal>
          <div className="max-w-2xl mb-12">
            <p className="text-[10px] uppercase tracking-[0.2em] text-rose-400 font-semibold mb-3">
              Impact
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight">
              Numbers you can hand to the board.
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Reveal delay={80}>
            <BigStat
              value={`${Math.round(iterations.value).toLocaleString()}`}
              label="Monte Carlo iterations"
              sub="Runs entirely in the browser, per asset, in under 20ms"
              valueRef={iterations.ref}
              accent="text-cyan-400"
            />
          </Reveal>
          <Reveal delay={160}>
            <BigStat
              value={`${Math.round(reduc.value)}%`}
              label="Alert noise reduced"
              sub="After multi-source correlation and context dampening"
              valueRef={reduc.ref}
              accent="text-emerald-400"
            />
          </Reveal>
          <Reveal delay={240}>
            <BigStat
              value={String(Math.round(assets.value))}
              label="Live assets tracked"
              sub="In-memory graph, no backend persistence required"
              valueRef={assets.ref}
              accent="text-amber-400"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
};

// ============================================================
// How it works
// ============================================================
const HOW_STEPS = [
  {
    n: '01',
    title: 'Ingest',
    body: 'Telemetry, asset inventory, and control posture converge into a single in-memory graph — EDR, SIEM, IAM, CSPM, and vendor dependencies.',
    icon: Activity,
  },
  {
    n: '02',
    title: 'Quantify',
    body: 'Deterministic EAL plus Monte Carlo VaR. Loss Event Frequency, direct loss, tail risk, and cascading supply chain exposure — all client-side.',
    icon: FlaskConical,
  },
  {
    n: '03',
    title: 'Decide',
    body: 'Budget optimizer, compliance coverage, appetite breach detection, and REI-ranked remediation playbooks. Export the board brief in one click.',
    icon: CheckCircle2,
  },
] as const;

const HowItWorks: React.FC = () => (
  <section id="how" className="relative py-20 lg:py-28">
    <div className="max-w-7xl mx-auto px-6 lg:px-10">
      <Reveal>
        <div className="max-w-2xl mb-14">
          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-semibold mb-3">
            How it works
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight">
            From raw telemetry to board-ready decisions.
          </h2>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
        <div className="hidden lg:block absolute top-16 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

        {HOW_STEPS.map((step, idx) => {
          const Icon = step.icon;
          return (
            <Reveal key={step.n} delay={idx * 120}>
              <div className="relative rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full border border-cyan-500/40 bg-cyan-500/10">
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500">
                    {step.n}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  {step.body}
                </p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  </section>
);

// ============================================================
// Final CTA
// ============================================================
const FinalCTA: React.FC<{ onEnter: () => void }> = ({ onEnter }) => (
  <Reveal>
    <section className="relative py-20 lg:py-28">
      <div className="max-w-4xl mx-auto px-6 lg:px-10">
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-10 lg:p-14 text-center">
          <div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-40"
            style={{
              background:
                'radial-gradient(circle, rgba(34,211,238,0.5) 0%, rgba(34,211,238,0) 70%)',
            }}
          />
          <div
            className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full blur-3xl opacity-30"
            style={{
              background:
                'radial-gradient(circle, rgba(16,185,129,0.5) 0%, rgba(16,185,129,0) 70%)',
            }}
          />

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-700 bg-slate-950/80 text-[10px] font-mono text-slate-400 mb-6">
              <Lock className="w-3 h-3" />
              Zero server persistence · everything runs client-side
            </div>

            <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight">
              Ready to see your exposure?
            </h2>
            <p className="mt-4 text-slate-400 max-w-xl mx-auto leading-relaxed">
              Launch the platform and explore the live dashboard. Every
              calculation runs in your browser — no signup, no data upload.
            </p>

            <button
              onClick={onEnter}
              className="group mt-8 inline-flex items-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 transition-all shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:-translate-y-0.5"
            >
              Launch Platform
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  </Reveal>
);

// ============================================================
// Footer
// ============================================================
const Footer: React.FC = () => (
  <footer className="relative border-t border-slate-800/60 py-8">
    <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <ShieldCheck className="w-4 h-4 text-cyan-400" />
        <span className="text-xs text-slate-500">
          OptiShield AI · Cyber-Risk Decision Platform
        </span>
      </div>
      <p className="text-[10px] font-mono text-slate-600">
        Smart India Hackathon · Confidential · © 2026
      </p>
    </div>
  </footer>
);

// ============================================================
// Main export
// ============================================================
const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  return (
    <>
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(30px, -40px); }
        }
        @keyframes float-slower {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(-40px, 30px); }
        }
        @keyframes shimmer {
          0%   { background-position: 0% center; }
          100% { background-position: -200% center; }
        }
        .animate-float-slow  { animation: float-slow 14s ease-in-out infinite; }
        .animate-float-slower{ animation: float-slower 18s ease-in-out infinite; }
        .animate-shimmer     { animation: shimmer 6s linear infinite; }
      `}</style>

      <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
        <AnimatedBackground />
        <div className="relative z-10">
          <LandingNav onEnter={onEnter} />
          <Hero onEnter={onEnter} />
          <TrustBar />
          <FeatureGrid />
          <ImpactSection />
          <HowItWorks />
          <FinalCTA onEnter={onEnter} />
          <Footer />
        </div>
      </div>
    </>
  );
};

export default LandingPage;