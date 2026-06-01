import { useEffect, type ReactNode } from "react";
import {
  AlertTriangle, CheckCircle2, Copy, Info, Play, RefreshCw, Square, X, XCircle,
} from "lucide-react";
import { cn } from "../utils/cn";
import type { ContainerStatus, Toast } from "../types";
import { metricColor } from "../utils/helpers";

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("panel rounded-2xl", className)}>{children}</div>;
}

export function PanelHeader({
  title, subtitle, icon, actions, className,
}: { title: string; subtitle?: string; icon?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-4", className)}>
      <div className="flex items-center gap-3">
        {icon && <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-ink/60 text-cyber">{icon}</div>}
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-100">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Button({
  children, onClick, variant = "ghost", size = "md", className, disabled, title, type = "button",
}: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "outline" | "danger" | "success";
  size?: "sm" | "md"; className?: string; disabled?: boolean; title?: string; type?: "button" | "submit";
}) {
  const variants = {
    primary: "bg-electric text-white hover:bg-indigo-500 border-indigo-400/40 shadow-[0_6px_20px_-10px_rgba(99,102,241,0.9)]",
    ghost: "bg-white/[0.035] text-slate-300 hover:bg-white/[0.08] border-line hover:text-white",
    outline: "bg-transparent text-slate-300 hover:bg-white/[0.05] border-line hover:text-white",
    danger: "bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border-rose-500/30",
    success: "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/30",
  };
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" ? "px-2.5 py-1.5 text-[11px]" : "px-3.5 py-2 text-xs",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

const statusStyles: Record<ContainerStatus, { label: string; cls: string; dot: string }> = {
  running: { label: "Running", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", dot: "bg-neon" },
  restarting: { label: "Restarting", cls: "border-amber-500/30 bg-amber-500/10 text-amber-300", dot: "bg-amber-400" },
  stopped: { label: "Stopped", cls: "border-slate-500/30 bg-slate-500/10 text-slate-400", dot: "bg-slate-500" },
  starting: { label: "Starting", cls: "border-sky-500/30 bg-sky-500/10 text-sky-300", dot: "bg-sky-400" },
};

export function StatusBadge({ status, compact = false }: { status: ContainerStatus; compact?: boolean }) {
  const s = statusStyles[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border font-medium", s.cls, compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]")}>
      <span className={cn("relative h-1.5 w-1.5 rounded-full", s.dot, (status === "running" || status === "starting") && "pulse-dot")} />
      {s.label}
    </span>
  );
}

export function MetricBar({ label, value, detail, color }: { label: string; value: number; detail: string; color?: string }) {
  const fill = color ?? metricColor(value);
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
        <span className="font-medium text-slate-400">{label}</span>
        <span className="code-font text-slate-200">{detail}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: fill, boxShadow: `0 0 10px ${fill}55` }} />
      </div>
    </div>
  );
}

export function Modal({
  open, onClose, title, subtitle, icon, children, footer, width = "max-w-2xl",
}: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; icon?: ReactNode;
  children: ReactNode; footer?: ReactNode; width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("animate-fade-up relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_30px_90px_-20px_rgba(0,0,0,0.95)]", width)}>
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            {icon && <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyber/30 bg-cyber/10 text-sky-300">{icon}</div>}
            <div>
              <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
              {subtitle && <p className="code-font mt-0.5 text-[11px] text-muted">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg border border-line p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white" aria-label="Close modal">
            <X size={15} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  const tones = {
    success: { icon: <CheckCircle2 size={16} />, cls: "border-emerald-500/35 text-emerald-300" },
    info: { icon: <Info size={16} />, cls: "border-sky-500/35 text-sky-300" },
    warning: { icon: <AlertTriangle size={16} />, cls: "border-amber-500/35 text-amber-300" },
    error: { icon: <XCircle size={16} />, cls: "border-rose-500/35 text-rose-300" },
  };
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="animate-fade-up pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-panel-2/95 p-3.5 shadow-2xl backdrop-blur">
          <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-ink/60", tones[t.tone].cls)}>{tones[t.tone].icon}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-100">{t.title}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{t.message}</p>
          </div>
          <button onClick={() => onDismiss(t.id)} className="text-slate-500 transition hover:text-white" aria-label="Dismiss"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

export function DockerWhale({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="whaleGrad" x1="8" y1="12" x2="55" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" /><stop offset="1" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      <g fill="#60a5fa" opacity="0.95">
        <rect x="18" y="12" width="9" height="8" rx="1" /><rect x="28" y="12" width="9" height="8" rx="1" />
        <rect x="38" y="12" width="9" height="8" rx="1" /><rect x="23" y="3" width="9" height="8" rx="1" />
        <rect x="33" y="3" width="9" height="8" rx="1" />
      </g>
      <path d="M8 31c0-2 2-3 5-3h36c7 0 12 6 12 13 0 8-7 14-17 14H24C14 55 8 48 8 39v-8Z" fill="url(#whaleGrad)" />
      <path d="M53 28c4-5 8-6 8-6s-1 6-4 9" fill="#38bdf8" />
      <path d="M8 32c-3 1-5 3-5 6 0 3 2 4 4 4" fill="#0284c7" />
      <circle cx="17" cy="36" r="2" fill="#e0f2fe" /><circle cx="17" cy="36" r="1" fill="#082f49" />
      <path d="M14 46c8 3 22 3 32-1" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

export function ContainerGlyph({ kind, className }: { kind: string; className?: string }) {
  const common = { size: 18, className: className ?? "h-[18px] w-[18px]", strokeWidth: 1.8 } as const;
  switch (kind) {
    case "play": return <Play {...common} />;
    case "stop": return <Square {...common} />;
    case "restart": return <RefreshCw {...common} />;
    default: return <Copy {...common} />;
  }
}

export function Sparkline({ data, color = "#38bdf8", height = 40 }: { data: number[]; color?: string; height?: number }) {
  const w = 150;
  const pts = data.length > 1 ? data.map((v, i) => `${(i / (data.length - 1)) * w},${height - 3 - (Math.min(100, v) / 100) * (height - 8)}`).join(" ") : `0,${height / 2} ${w},${height / 2}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-10 w-full" preserveAspectRatio="none">
      <polyline points={`0,${height} ${pts} ${w},${height}`} fill={color} opacity="0.09" stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const dockerInstructions = /^(FROM|RUN|CMD|LABEL|MAINTAINER|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|ONBUILD|STOPSIGNAL|HEALTHCHECK|SHELL|AS)\b/i;

type Token = { text: string; cls: string };

function tokenizeLine(line: string, lang: "dockerfile" | "yaml"): Token[] {
  if (!line.trim()) return [{ text: line, cls: "" }];
  if (line.trimStart().startsWith("#")) return [{ text: line, cls: "text-slate-500 italic" }];

  if (lang === "dockerfile") {
    const m = line.match(/^(\s*)([A-Za-z]+)(.*)$/);
    if (!m) return [{ text: line, cls: "text-slate-300" }];
    const tokens: Token[] = [
      { text: m[1], cls: "" },
      { text: m[2], cls: dockerInstructions.test(m[2]) ? "text-sky-400 font-semibold" : "text-slate-300" },
    ];
    const rest = m[3];
    const parts = rest.split(/("[^"]*"|'[^']*'|\$\{?\w+\}?|--[\w.-]+|\b\d+\b|\&\&|\||\\|\[|\]|=|:)/g);
    for (const p of parts) {
      if (!p) continue;
      let cls = "text-slate-300";
      if (/^["']/.test(p)) cls = "text-emerald-300";
      else if (p.startsWith("$")) cls = "text-amber-300";
      else if (p.startsWith("--")) cls = "text-indigo-300";
      else if (/^\d+$/.test(p)) cls = "text-orange-300";
      else if (/^(&&|\||\\|\[|\]|=|:)$/.test(p)) cls = "text-slate-500";
      tokens.push({ text: p, cls });
    }
    return tokens;
  }

  const indentMatch = line.match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : "";
  const body = line.slice(indent.length);
  const tokens: Token[] = [{ text: indent, cls: "" }];
  if (body.startsWith("- ")) {
    tokens.push({ text: "- ", cls: "text-amber-400" });
    const val = body.slice(2);
    const pieces = val.split(/("[^"]*"|\b\d+\b|:|\/)/g);
    for (const p of pieces) {
      if (!p) continue;
      tokens.push({ text: p, cls: /^"/.test(p) ? "text-emerald-300" : /^\d+$/.test(p) ? "text-orange-300" : /^[:/]$/.test(p) ? "text-slate-500" : "text-slate-300" });
    }
    return tokens;
  }
  const kv = body.match(/^([^:#]+)(:)(\s*)(.*)$/);
  if (kv) {
    tokens.push({ text: kv[1], cls: "text-sky-300" }, { text: kv[2], cls: "text-slate-500" }, { text: kv[3], cls: "" });
    const val = kv[4];
    if (val.startsWith("#")) tokens.push({ text: val, cls: "text-slate-500 italic" });
    else if (/^["']/.test(val)) tokens.push({ text: val, cls: "text-emerald-300" });
    else if (/^\d/.test(val)) tokens.push({ text: val, cls: "text-orange-300" });
    else if (val) tokens.push({ text: val, cls: "text-indigo-200" });
    return tokens;
  }
  tokens.push({ text: body, cls: "text-slate-300" });
  return tokens;
}

export function HighlightedLine({ line, lang }: { line: string; lang: "dockerfile" | "yaml" }) {
  return <>{tokenizeLine(line, lang).map((t, i) => <span key={i} className={t.cls}>{t.text}</span>)}</>;
}

export function CodeBlock({
  code, lang = "dockerfile", className, showLineNumbers = true,
}: { code: string; lang?: "dockerfile" | "yaml"; className?: string; showLineNumbers?: boolean }) {
  const lines = code.split("\n");
  return (
    <div className={cn("code-font overflow-auto rounded-xl border border-line bg-[#080c14] text-[12px] leading-[1.85]", className)}>
      <div className="min-w-max py-3">
        {lines.map((line, i) => (
          <div key={i} className="flex px-3 hover:bg-white/[0.025]">
            {showLineNumbers && <span className="mr-4 w-7 shrink-0 select-none text-right text-slate-600">{i + 1}</span>}
            <span className="whitespace-pre text-slate-200"><HighlightedLine line={line} lang={lang} /><span> </span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{children}</label>
      {hint && <span className="code-font text-[10px] text-slate-600">{hint}</span>}
    </div>
  );
}

export const inputClass = "code-font w-full rounded-lg border border-line bg-ink/70 px-3 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 transition focus:border-cyber/60 focus:ring-2 focus:ring-cyber/15";
