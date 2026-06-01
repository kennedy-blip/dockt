import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, CircleAlert, Copy, Download,
  FileCode2, GitBranch, HardDrive, Info, Layers3, Maximize2, Network, Plus, Minus,
  RotateCcw, Server, ShieldCheck, Wand2, XCircle,
} from "lucide-react";
import { composePresets, defaultCompose } from "../data/seed";
import { dependencyDepth, parseCompose } from "../lib/compose";
import type { ComposeService, ValidationIssue } from "../types";
import { cn } from "../utils/cn";
import { copyText } from "../utils/helpers";
import { Button, HighlightedLine, Panel, PanelHeader } from "./ui";

interface Props {
  yaml: string;
  onYamlChange: (yaml: string) => void;
  notify: (title: string, message: string, tone?: "success" | "info" | "error" | "warning") => void;
  onExport: () => void;
}

const NODE_W = 186;
const NODE_H = 76;

function serviceColor(s: ComposeService): string {
  const img = (s.image ?? "").toLowerCase();
  if (/postgres|mysql|mongo|maria/.test(img)) return "#38bdf8";
  if (/redis|memcache|rabbit|kafka/.test(img)) return "#fb7185";
  if (/nginx|httpd|traefik|caddy/.test(img)) return "#34d399";
  if (/python|worker|celery/.test(img)) return "#fbbf24";
  return "#818cf8";
}

function layout(services: ComposeService[]) {
  const depths = dependencyDepth(services);
  const groups: Record<number, ComposeService[]> = {};
  services.forEach((s) => {
    const d = Math.min(3, depths[s.name] ?? 0);
    (groups[d] ??= []).push(s);
  });
  const maxRows = Math.max(1, ...Object.values(groups).map((g) => g.length));
  const rowGap = 126;
  const height = Math.max(360, maxRows * rowGap + 70);
  const pos: Record<string, { x: number; y: number; depth: number }> = {};
  Object.entries(groups).forEach(([d, group]) => {
    const depth = Number(d);
    const startY = (height - (group.length - 1) * rowGap - NODE_H) / 2;
    group.forEach((s, i) => { pos[s.name] = { x: 46 + depth * 242, y: Math.max(24, startY + i * rowGap), depth }; });
  });
  return { pos, height, width: 4 * 242 + 60 };
}

function IssueRow({ issue, onJump }: { issue: ValidationIssue; onJump: (line: number) => void }) {
  const styles = {
    error: { icon: <XCircle size={14} />, cls: "border-rose-500/25 bg-rose-500/[0.06] text-rose-300" },
    warning: { icon: <AlertTriangle size={14} />, cls: "border-amber-500/25 bg-amber-500/[0.06] text-amber-300" },
    info: { icon: <Info size={14} />, cls: "border-sky-500/25 bg-sky-500/[0.06] text-sky-300" },
  }[issue.level];
  return (
    <button onClick={() => onJump(issue.line)} className="flex w-full items-start gap-2.5 rounded-lg border border-line bg-ink/40 p-2.5 text-left transition hover:border-slate-600">
      <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border", styles.cls)}>{styles.icon}</span>
      <span className="min-w-0 flex-1"><span className="text-[11px] leading-relaxed text-slate-300">{issue.message}</span></span>
      <span className="code-font shrink-0 rounded border border-line bg-panel px-1.5 py-0.5 text-[10px] text-slate-500">L{issue.line}</span>
    </button>
  );
}

function ServiceInspector({ service, services }: { service: ComposeService | null; services: ComposeService[] }) {
  if (!service) return <p className="p-5 text-xs text-slate-500">No services defined. Add a service under <span className="code-font text-sky-300">services:</span> in the editor.</p>;
  const color = serviceColor(service);
  const groups = [
    { label: "Image / Build", icon: <Layers3 size={12} />, values: [service.image ? `image: ${service.image}` : `build: ${service.build}`].filter(Boolean) },
    { label: "Ports", icon: <Network size={12} />, values: service.ports },
    { label: "Volume mounts", icon: <HardDrive size={12} />, values: service.volumes },
    { label: "Depends on", icon: <GitBranch size={12} />, values: service.dependsOn },
    { label: "Networks", icon: <Network size={12} />, values: service.networks },
    { label: "Environment", icon: <Server size={12} />, values: service.environment },
  ];
  return (
    <div className="p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }} />
        <h3 className="code-font text-sm font-semibold text-white">{service.name}</h3>
        <span className="code-font rounded border border-line bg-ink px-2 py-0.5 text-[10px] text-slate-500">line {service.line}</span>
        <span className="code-font rounded border border-line bg-ink px-2 py-0.5 text-[10px] text-slate-500">{service.restart ? `restart: ${service.restart}` : "no restart policy"}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => (
          <div key={g.label} className="rounded-xl border border-line bg-ink/50 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{g.icon}{g.label} <span className="ml-auto text-slate-600">{g.values.length}</span></p>
            {g.values.length ? <div className="space-y-1">{g.values.map((v, i) => <p key={i} className="code-font truncate text-[10px] text-slate-300" title={v}>{v}</p>)}</div> : <p className="text-[10px] italic text-slate-600">none</p>}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-500">
        <span className="rounded-md border border-line px-2 py-1">{services.length} services in stack</span>
        {service.command && <span className="code-font rounded-md border border-line px-2 py-1">command: {service.command}</span>}
        {service.containerName && <span className="code-font rounded-md border border-line px-2 py-1">container_name: {service.containerName}</span>}
      </div>
    </div>
  );
}

export default function ComposeVisualizer({ yaml, onYamlChange, notify, onExport }: Props) {
  const parsed = useMemo(() => parseCompose(yaml), [yaml]);
  const lines = yaml.split("\n");
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showLinks, setShowLinks] = useState(true);
  const [showVolumes, setShowVolumes] = useState(true);
  const [showNetworks, setShowNetworks] = useState(true);
  const [issuesFilter, setIssuesFilter] = useState<"all" | "error" | "warning">("all");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const errors = parsed.issues.filter((i) => i.level === "error").length;
  const warnings = parsed.issues.filter((i) => i.level === "warning").length;
  const infos = parsed.issues.filter((i) => i.level === "info").length;
  const active = parsed.services.find((s) => s.name === selected) ?? parsed.services[0] ?? null;
  const focused = selected ? active : null;
  const graph = layout(parsed.services);
  const visibleIssues = parsed.issues.filter((i) => issuesFilter === "all" || i.level === issuesFilter);
  const edgeList = parsed.services.flatMap((s) => s.dependsOn.filter((d) => graph.pos[d]).map((d) => ({ from: d, to: s.name })));

  const syncScroll = () => {
    const ta = taRef.current;
    if (!ta) return;
    if (preRef.current) { preRef.current.scrollTop = ta.scrollTop; preRef.current.scrollLeft = ta.scrollLeft; }
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
  };

  const jumpToLine = (line: number) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = lines.slice(0, Math.max(0, line - 1)).reduce((s, l) => s + l.length + 1, 0);
    ta.focus();
    ta.setSelectionRange(start, start + (lines[line - 1]?.length ?? 0));
    ta.scrollTop = Math.max(0, (line - 4) * 21.6);
    syncScroll();
  };

  const loadPreset = (name: string) => {
    onYamlChange(composePresets[name]);
    setSelected(null);
    notify("Preset loaded", `${name} is now in the editor and topology.`, "info");
  };

  const normalize = () => {
    const fixed = yaml.split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").replace(/\n+$/, "\n");
    onYamlChange(fixed);
    notify("YAML normalized", "Trimmed trailing whitespace and ensured a trailing newline.", "success");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Stack Studio</div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Compose Visualizer &amp; Validator</h2>
          <p className="mt-1 text-xs text-muted">Edit YAML live, validate the schema and explore service dependency topology.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { copyText(yaml); notify("YAML copied", "Compose file copied to clipboard.", "success"); }}><Copy size={13} /> Copy YAML</Button>
          <Button variant="primary" onClick={onExport}><Download size={14} /> Export Compose YAML</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Panel className="p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Services</p><p className="code-font mt-1 text-2xl font-bold text-white">{parsed.services.length}</p><p className="mt-1 text-[10px] text-muted">in this stack definition</p></Panel>
        <Panel className="p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Networks / Volumes</p><p className="code-font mt-1 text-2xl font-bold text-white">{parsed.networks.length} <span className="text-slate-600">/</span> {parsed.volumes.length}</p><p className="mt-1 text-[10px] text-muted">declared resources</p></Panel>
        <Panel className="p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Dependencies</p><p className="code-font mt-1 text-2xl font-bold text-white">{edgeList.length}</p><p className="mt-1 text-[10px] text-muted">service links in graph</p></Panel>
        <Panel className="p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Validation</p><p className={cn("code-font mt-1 text-2xl font-bold", errors ? "text-rose-400" : warnings ? "text-amber-300" : "text-emerald-400")}>{errors ? `${errors} errors` : warnings ? `${warnings} warnings` : "Valid"}</p><p className="mt-1 text-[10px] text-muted">{errors + warnings + infos} total findings</p></Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="flex min-w-0 flex-col">
          <PanelHeader title="docker-compose.yml" subtitle="Editable YAML · live parse" icon={<FileCode2 size={17} />}
            actions={
              <>
                <Button size="sm" variant="outline" onClick={normalize}><Wand2 size={12} /> Normalize</Button>
                <Button size="sm" variant={errors ? "danger" : "success"} onClick={() => { const msg = errors ? `${errors} error(s) found. Click a finding to jump to its line.` : `Valid compose file${warnings ? ` with ${warnings} warning(s)` : ""}.`; notify(errors ? "Validation failed" : "Validation passed", msg, errors ? "error" : "success"); }}><ShieldCheck size={12} /> Validate</Button>
              </>
            } />
          <div className="flex flex-wrap items-center gap-1.5 border-b border-line/70 px-4 py-2.5">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Presets</span>
            {Object.keys(composePresets).map((name) => (
              <button key={name} onClick={() => loadPreset(name)} className="rounded-md border border-line bg-ink/60 px-2 py-1 text-[10px] text-slate-400 transition hover:border-cyber/40 hover:text-sky-300">{name}</button>
            ))}
            <button onClick={() => { onYamlChange(defaultCompose); notify("Editor reset", "Restored the default DockerPulse stack.", "info"); }} className="ml-auto text-slate-500 transition hover:text-slate-200" title="Reset editor"><RotateCcw size={13} /></button>
          </div>
          <div className="relative h-[520px] overflow-hidden bg-[#080c14]">
            <div ref={gutterRef} className="code-font pointer-events-none absolute inset-y-0 left-0 z-20 w-11 overflow-hidden border-r border-line/60 bg-[#0b1019] py-4 pr-2 text-right text-[12px] leading-[21.6px] text-slate-600">
              {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
            </div>
            <pre ref={preRef} aria-hidden className="code-font pointer-events-none absolute inset-0 overflow-hidden whitespace-pre px-4 py-4 pl-14 text-[12px] leading-[21.6px] text-slate-200">
              {lines.map((line, i) => <span key={i}><HighlightedLine line={line} lang="yaml" />{"\n"}</span>)}
            </pre>
            <textarea
              ref={taRef} value={yaml} onChange={(e) => onYamlChange(e.target.value)} onScroll={syncScroll}
              spellCheck={false} wrap="off" aria-label="Compose YAML editor"
              className="code-font absolute inset-0 z-10 h-full w-full resize-none overflow-auto whitespace-pre bg-transparent px-4 py-4 pl-14 text-[12px] leading-[21.6px] text-transparent caret-sky-400 selection:bg-indigo-500/30"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 px-4 py-2.5 text-[10px] text-slate-500">
            <span className="code-font">UTF-8 · YAML 1.2 · {lines.length} lines</span>
            <span className={cn("flex items-center gap-1.5", errors ? "text-rose-300" : "text-emerald-300")}>{errors ? <CircleAlert size={11} /> : <CheckCircle2 size={11} />}{errors ? `${errors} errors` : "auto-validated"}</span>
          </div>
        </Panel>

        <Panel className="flex min-w-0 flex-col">
          <PanelHeader title="Service Topology" subtitle="Click a node to inspect its configuration" icon={<GitBranch size={17} />}
            actions={
              <>
                <button onClick={() => setShowLinks((v) => !v)} className={cn("rounded-lg border px-2 py-1.5 text-[10px] transition", showLinks ? "border-sky-500/40 bg-sky-500/10 text-sky-300" : "border-line text-slate-500")}>Links</button>
                <button onClick={() => setShowVolumes((v) => !v)} className={cn("rounded-lg border px-2 py-1.5 text-[10px] transition", showVolumes ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-line text-slate-500")}>Volumes</button>
                <button onClick={() => setShowNetworks((v) => !v)} className={cn("rounded-lg border px-2 py-1.5 text-[10px] transition", showNetworks ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300" : "border-line text-slate-500")}>Networks</button>
                <button onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.15).toFixed(2)))} className="rounded-lg border border-line p-1.5 text-slate-400 hover:text-white" title="Zoom out"><Minus size={12} /></button>
                <button onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.15).toFixed(2)))} className="rounded-lg border border-line p-1.5 text-slate-400 hover:text-white" title="Zoom in"><Plus size={12} /></button>
                <button onClick={() => setZoom(1)} className="rounded-lg border border-line p-1.5 text-slate-400 hover:text-white" title="Reset zoom"><Maximize2 size={12} /></button>
              </>
            } />
          <div className="relative flex-1 overflow-auto bg-[radial-gradient(circle_at_center,rgba(2,132,199,0.07),transparent_65%)] p-2">
            <div className="bg-grid absolute inset-0 opacity-40" />
            <svg viewBox={`0 0 ${graph.width} ${graph.height}`} style={{ width: `${zoom * 100}%`, minWidth: 880 }} className="relative h-auto min-h-[340px]" role="img" aria-label="Compose service topology graph">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" /></marker>
                <marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" /></marker>
                <linearGradient id="nodeGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1b2740" /><stop offset="1" stopColor="#101827" /></linearGradient>
              </defs>
              {[0, 1, 2, 3].map((d) => (
                <g key={d}>
                  <text x={46 + d * 242 + 6} y={22} className="code-font" fill="#475569" fontSize="10">{["ROOT SERVICES", "APPLICATION", "EDGE / API", "DEPENDENT"][d]}</text>
                  <line x1={46 + d * 242} y1={30} x2={46 + d * 242 + NODE_W} y2={30} stroke="#1e293b" strokeWidth="1" />
                </g>
              ))}
              {showNetworks && parsed.networks.flatMap((net) => {
                const members = parsed.services.filter((s) => s.networks.includes(net));
                return members.slice(0, -1).map((s, i) => {
                  const a = graph.pos[s.name]; const b = graph.pos[members[i + 1].name];
                  if (!a || !b) return null;
                  return <line key={`net-${net}-${i}`} x1={a.x + NODE_W / 2} y1={a.y + NODE_H / 2} x2={b.x + NODE_W / 2} y2={b.y + NODE_H / 2} stroke="#6366f1" strokeWidth="1.2" strokeDasharray="4 7" opacity="0.28" />;
                });
              })}
              {showLinks && edgeList.map(({ from, to }, i) => {
                const a = graph.pos[from]; const b = graph.pos[to];
                if (!a || !b) return null;
                const sx = a.x + NODE_W; const sy = a.y + NODE_H / 2;
                const tx = b.x - 6; const ty = b.y + NODE_H / 2;
                const activeEdge = focused && (focused.name === from || focused.name === to);
                const d = tx > sx
                  ? `M ${sx} ${sy} C ${sx + 55} ${sy}, ${tx - 55} ${ty}, ${tx} ${ty}`
                  : `M ${sx} ${sy} C ${sx + 55} ${sy + 70}, ${tx - 55} ${ty + 70}, ${tx} ${ty}`;
                return (
                  <g key={`${from}-${to}-${i}`}>
                    <path d={d} fill="none" stroke={activeEdge ? "#38bdf8" : "#3b4a63"} strokeWidth={activeEdge ? 2.2 : 1.4} markerEnd={activeEdge ? "url(#arrow-active)" : "url(#arrow)"} opacity={focused ? (activeEdge ? 1 : 0.3) : 0.85} />
                    {activeEdge && <path d={d} fill="none" stroke="#7dd3fc" strokeWidth="1.4" className="flow-line" opacity="0.65" />}
                  </g>
                );
              })}
              {parsed.services.map((s) => {
                const p = graph.pos[s.name];
                if (!p) return null;
                const color = serviceColor(s);
                const isActive = focused?.name === s.name;
                const connected = focused && (focused.dependsOn.includes(s.name) || s.dependsOn.includes(focused.name));
                return (
                  <g key={s.name} onClick={() => setSelected(s.name)} className="cursor-pointer" opacity={focused && !isActive && !connected ? 0.62 : 1}>
                    <rect x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx="12" fill="url(#nodeGrad)" stroke={isActive ? color : "#334155"} strokeWidth={isActive ? 2 : 1} />
                    {isActive && <rect x={p.x - 3} y={p.y - 3} width={NODE_W + 6} height={NODE_H + 6} rx="15" fill="none" stroke={color} strokeWidth="1" opacity="0.35" />}
                    <circle cx={p.x + 15} cy={p.y + 18} r="4" fill={color} />
                    <text x={p.x + 26} y={p.y + 22} fill="#f1f5f9" fontSize="12" fontFamily="JetBrains Mono, monospace" fontWeight="600">{s.name.length > 17 ? `${s.name.slice(0, 16)}…` : s.name}</text>
                    <text x={p.x + 14} y={p.y + 43} fill={color} fontSize="10" fontFamily="JetBrains Mono, monospace">{(s.image ?? `build: ${s.build}`).length > 24 ? `${(s.image ?? "").slice(0, 23)}…` : s.image ?? `build: ${s.build}`}</text>
                    <text x={p.x + 14} y={p.y + 62} fill="#64748b" fontSize="9" fontFamily="JetBrains Mono, monospace">{s.ports.slice(0, 2).join("  ") || "no exposed ports"} · {s.networks.length} net</text>
                    {showVolumes && s.volumes.map((v, vi) => {
                      const vx = p.x + 14 + vi * 58; const vy = p.y + NODE_H + 12;
                      const label = v.split(":")[0].replace("./", "");
                      return (
                        <g key={`${v}-${vi}`}>
                          <line x1={p.x + 30 + vi * 24} y1={p.y + NODE_H} x2={vx + 20} y2={vy} stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                          <rect x={vx} y={vy} width="50" height="17" rx="6" fill="#0d201b" stroke="#10b981" strokeOpacity="0.45" />
                          <text x={vx + 25} y={vy + 11.5} textAnchor="middle" fill="#6ee7b7" fontSize="8" fontFamily="JetBrains Mono, monospace">{label.length > 8 ? `${label.slice(0, 7)}…` : label}</text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-line/70 px-4 py-2.5 text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-slate-500" /> depends_on <ArrowRight size={10} /></span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 border-t border-dashed border-emerald-400" /> volume mount</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 border-t border-dashed border-indigo-400" /> shared network</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-400" /> app service</span>
            <span className="ml-auto">Zoom {Math.round(zoom * 100)}%</span>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <PanelHeader title="Validation Report" subtitle="Live linting · click an issue to jump to the line" icon={<ShieldCheck size={17} />}
            actions={<div className="flex gap-1">
              {(["all", "error", "warning"] as const).map((f) => (
                <button key={f} onClick={() => setIssuesFilter(f)} className={cn("rounded-md border px-2 py-1 text-[10px] capitalize transition", issuesFilter === f ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300" : "border-line text-slate-500 hover:text-slate-300")}>{f}</button>
              ))}
            </div>} />
          <div className="flex flex-wrap gap-2 border-b border-line/70 px-5 py-3 text-[10px]">
            <span className={cn("rounded-md border px-2 py-1", errors ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-line text-slate-500")}>{errors} errors</span>
            <span className={cn("rounded-md border px-2 py-1", warnings ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-line text-slate-500")}>{warnings} warnings</span>
            <span className="rounded-md border border-line px-2 py-1 text-slate-500">{infos} hints</span>
            {!errors && <span className="ml-auto flex items-center gap-1.5 text-emerald-300"><CheckCircle2 size={12} /> Compose schema valid</span>}
          </div>
          <div className="max-h-[260px] space-y-2 overflow-auto p-4">
            {visibleIssues.length ? visibleIssues.map((issue, i) => <IssueRow key={`${issue.line}-${i}-${issue.message}`} issue={issue} onJump={jumpToLine} />) : (
              <div className="flex flex-col items-center gap-2 py-8 text-center"><CheckCircle2 size={26} className="text-emerald-400" /><p className="text-xs text-slate-300">No findings for this filter</p><p className="text-[11px] text-muted">Your compose configuration looks clean.</p></div>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Service Inspector" subtitle={active ? `Inspecting: ${active.name}` : "No service selected"} icon={<Server size={17} />}
            actions={<div className="flex max-w-[260px] gap-1 overflow-x-auto">{parsed.services.map((s) => <button key={s.name} onClick={() => setSelected(s.name)} className={cn("code-font shrink-0 rounded-md border px-2 py-1 text-[10px] transition", active?.name === s.name ? "border-sky-500/40 bg-sky-500/10 text-sky-300" : "border-line text-slate-500 hover:text-slate-300")}>{s.name}</button>)}</div>} />
          <ServiceInspector service={active} services={parsed.services} />
          <div className="flex flex-wrap gap-2 border-t border-line/70 px-5 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Networks:</span>
            {parsed.networks.length ? parsed.networks.map((n) => <span key={n} className="code-font flex items-center gap-1 rounded border border-sky-500/20 bg-sky-500/[0.06] px-2 py-0.5 text-[10px] text-sky-300"><Network size={10} />{n}</span>) : <span className="text-[10px] text-slate-600">default</span>}
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Volumes:</span>
            {parsed.volumes.length ? parsed.volumes.map((v) => <span key={v} className="code-font flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/[0.06] px-2 py-0.5 text-[10px] text-emerald-300"><HardDrive size={10} />{v}</span>) : <span className="text-[10px] text-slate-600">none</span>}
            <ChevronRight size={12} className="ml-auto text-slate-600" />
          </div>
        </Panel>
      </div>
    </div>
  );
}
