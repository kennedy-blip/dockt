import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, CircleCheck, Copy, Download, FileCode2, Info, Layers3,
  Package, Plus, RotateCcw, Settings2, ShieldCheck, Sparkles, Terminal, Trash2, Zap,
} from "lucide-react";
import { baseImages } from "../data/seed";
import { cn } from "../utils/cn";
import { copyText, downloadFile } from "../utils/helpers";
import { Button, CodeBlock, FieldLabel, Panel, PanelHeader, inputClass } from "./ui";

interface KV { key: string; value: string }
interface BuilderConfig {
  baseId: string; variant: string; workdir: string; user: string; expose: string;
  env: KV[]; labels: KV[]; manifest: string; install: string; buildCmd: string; packages: string;
  multiStage: boolean; runtimeImage: string; cmd: string; useEntrypoint: boolean;
  healthcheck: boolean; healthCmd: string;
}

const defaultConfig: BuilderConfig = {
  baseId: "node", variant: "node:20-alpine", workdir: "/app", user: "node", expose: "3000",
  env: [{ key: "NODE_ENV", value: "production" }, { key: "PORT", value: "3000" }],
  labels: [{ key: "org.opencontainers.image.source", value: "https://github.com/acme/api" }],
  manifest: "package*.json", install: "npm ci", buildCmd: "npm run build", packages: "",
  multiStage: true, runtimeImage: "node:20-alpine", cmd: '["node", "dist/server.js"]',
  useEntrypoint: false, healthcheck: true, healthCmd: "wget -qO- http://localhost:3000/health || exit 1",
};

let builderCache: { config: BuilderConfig; step: number } | null = null;

const steps = [
  { title: "Base Image", desc: "Choose your runtime", icon: Package },
  { title: "Workspace", desc: "Workdir, user, env & ports", icon: Settings2 },
  { title: "Dependencies", desc: "Install & multi-stage build", icon: Layers3 },
  { title: "Runtime", desc: "CMD, healthcheck & labels", icon: Terminal },
];

function artifacts(c: BuilderConfig): string[] {
  switch (c.baseId) {
    case "python": return [
      "ENV PATH=\"/opt/venv/bin:$PATH\"",
      "COPY --from=builder /opt/venv /opt/venv",
      `COPY --from=builder ${c.workdir}/ .`,
    ];
    case "rust": return [`COPY --from=builder ${c.workdir}/target/release/app ./app`];
    case "go": return ["COPY --from=builder /app/server ./server"];
    default: return [
      `COPY --from=builder ${c.workdir}/node_modules ./node_modules`,
      `COPY --from=builder ${c.workdir}/dist ./dist`,
      `COPY --from=builder ${c.workdir}/package.json ./`,
    ];
  }
}

function generateDockerfile(c: BuilderConfig): string {
  const base = baseImages.find((b) => b.id === c.baseId) ?? baseImages[0];
  const L: string[] = [
    "# Generated with DockerPulse · Dockerfile Builder",
    `# ${base.label} · ${c.multiStage ? "multi-stage production build" : "single-stage build"}`,
    "",
  ];
  const pkgLine = c.packages.trim()
    ? (c.variant.includes("alpine") ? `RUN apk add --no-cache ${c.packages.trim()}` : `RUN apt-get update && apt-get install -y --no-install-recommends ${c.packages.trim()} && rm -rf /var/lib/apt/lists/*`)
    : "";
  const envLines = c.env.filter((e) => e.key.trim()).map((e) => `ENV ${e.key.trim()}=${e.value}`);
  const labelLines = c.labels.filter((l) => l.key.trim()).map((l) => `LABEL ${l.key.trim()}="${l.value}"`);

  if (c.multiStage) {
    L.push("# ────────── Stage 1 · build ──────────", `FROM ${c.variant} AS builder`, `WORKDIR ${c.workdir}`);
    if (pkgLine) L.push(pkgLine);
    if (c.baseId === "python") L.push("RUN python -m venv /opt/venv", "ENV PATH=\"/opt/venv/bin:$PATH\"");
    if (c.manifest.trim()) L.push(`COPY ${c.manifest.trim()} ./`);
    if (c.install.trim()) L.push(`RUN ${c.install.trim()}`);
    L.push("COPY . .");
    if (c.buildCmd.trim()) L.push(`RUN ${c.buildCmd.trim()}`);
    L.push("", "# ────────── Stage 2 · runtime ──────────", `FROM ${c.runtimeImage.trim() || c.variant}`, `WORKDIR ${c.workdir}`);
    if (pkgLine) L.push(pkgLine);
    L.push(...labelLines, ...envLines, ...artifacts(c));
  } else {
    L.push(`FROM ${c.variant}`, `WORKDIR ${c.workdir}`);
    if (pkgLine) L.push(pkgLine);
    L.push(...labelLines, ...envLines);
    if (c.manifest.trim()) L.push(`COPY ${c.manifest.trim()} ./`);
    if (c.install.trim()) L.push(`RUN ${c.install.trim()}`);
    L.push("COPY . .");
    if (c.buildCmd.trim()) L.push(`RUN ${c.buildCmd.trim()}`);
  }
  if (c.expose.trim()) L.push(`EXPOSE ${c.expose.trim()}`);
  if (c.user.trim() && c.user.trim() !== "root") L.push("", `USER ${c.user.trim()}`);
  if (c.healthcheck && c.healthCmd.trim()) L.push("", `HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \\`, `  CMD ${c.healthCmd.trim()}`);
  L.push("", c.useEntrypoint ? `ENTRYPOINT ${c.cmd.trim()}` : `CMD ${c.cmd.trim()}`);
  return L.join("\n");
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: () => void; label: string; hint?: string }) {
  return (
    <button onClick={onChange} className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-ink/60 p-3 text-left transition hover:border-slate-600">
      <div><p className="text-xs font-medium text-slate-200">{label}</p>{hint && <p className="mt-0.5 text-[10px] text-muted">{hint}</p>}</div>
      <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition", checked ? "bg-electric" : "bg-slate-700")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </span>
    </button>
  );
}

function KVEditor({ rows, onChange, keyPlaceholder, valuePlaceholder }: {
  rows: KV[]; onChange: (rows: KV[]) => void; keyPlaceholder: string; valuePlaceholder: string;
}) {
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2">
          <input value={row.key} onChange={(e) => onChange(rows.map((r, j) => j === i ? { ...r, key: e.target.value } : r))} placeholder={keyPlaceholder} className={cn(inputClass, "flex-1")} />
          <input value={row.value} onChange={(e) => onChange(rows.map((r, j) => j === i ? { ...r, value: e.target.value } : r))} placeholder={valuePlaceholder} className={cn(inputClass, "flex-1")} />
          <button onClick={() => onChange(rows.filter((_, j) => j !== i))} className="rounded-lg border border-line px-2 text-slate-500 transition hover:border-rose-500/40 hover:text-rose-300" aria-label="Remove row"><Trash2 size={14} /></button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => onChange([...rows, { key: "", value: "" }])}><Plus size={12} /> Add row</Button>
    </div>
  );
}

export default function DockerfileBuilder({ notify }: { notify: (title: string, message: string, tone?: "success" | "info" | "error" | "warning") => void }) {
  const [config, setConfig] = useState<BuilderConfig>(() => builderCache?.config ?? defaultConfig);
  const [step, setStep] = useState(() => builderCache?.step ?? 0);
  const [lineNumbers, setLineNumbers] = useState(true);
  useEffect(() => { builderCache = { config, step }; }, [config, step]);
  const dockerfile = useMemo(() => generateDockerfile(config), [config]);
  const lines = dockerfile.split("\n");
  const layerCount = lines.filter((l) => /^(FROM|RUN|COPY|ADD)\s/.test(l)).length;
  const base = baseImages.find((b) => b.id === config.baseId) ?? baseImages[0];
  const patch = (p: Partial<BuilderConfig>) => setConfig((c) => ({ ...c, ...p }));

  const selectBase = (id: string) => {
    const b = baseImages.find((x) => x.id === id)!;
    patch({
      baseId: id, variant: b.variants[0], manifest: b.manifest,
      install: id === "node" ? "npm ci" : b.install, buildCmd: b.build, cmd: b.start,
      runtimeImage: id === "rust" || id === "go" ? "debian:bookworm-slim" : b.variants[0],
      expose: id === "python" ? "8000" : id === "rust" || id === "go" ? "8080" : "3000",
      healthCmd: `wget -qO- http://localhost:${id === "python" ? "8000" : id === "rust" || id === "go" ? "8080" : "3000"}/health || exit 1`,
    });
  };

  const checks = [
    { label: "Version-pinned base image", ok: !config.variant.endsWith(":latest") && config.variant.includes(":") },
    { label: "Multi-stage build enabled", ok: config.multiStage },
    { label: "Runs as non-root user", ok: !!config.user.trim() && config.user !== "root" },
    { label: "HEALTHCHECK instruction", ok: config.healthcheck },
    { label: "Dependency manifest copied first", ok: !!config.manifest.trim() },
    { label: "Explicit EXPOSE port", ok: !!config.expose.trim() },
  ];
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-400"><span className="h-1.5 w-1.5 rounded-full bg-indigo-400" /> Build Studio</div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Dockerfile Generator</h2>
          <p className="mt-1 text-xs text-muted">Configure a production-ready, multi-stage Dockerfile in four guided steps.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setConfig(defaultConfig); setStep(0); notify("Configuration reset", "Restored the Node.js 20 multi-stage template.", "info"); }}><RotateCcw size={13} /> Reset</Button>
          <Button variant="primary" onClick={() => { downloadFile("Dockerfile", dockerfile); notify("Dockerfile downloaded", "Ready to run docker build.", "success"); }}><Download size={14} /> Download</Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <div className="space-y-4">
          <Panel>
            <div className="grid grid-cols-2 gap-2 border-b border-line/70 p-4 sm:grid-cols-4">
              {steps.map((s, i) => {
                const Icon = s.icon;
                return (
                  <button key={s.title} onClick={() => setStep(i)} className={cn("flex items-center gap-2 rounded-xl border p-2.5 text-left transition", step === i ? "border-indigo-500/50 bg-indigo-500/10" : i < step ? "border-emerald-500/25 bg-emerald-500/[0.05]" : "border-line bg-ink/40 hover:border-slate-600")}>
                    <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold", step === i ? "bg-electric text-white" : i < step ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-slate-500")}>{i < step ? <Check size={14} /> : <Icon size={14} />}</span>
                    <div className="min-w-0 hidden xl:block"><p className={cn("truncate text-[11px] font-semibold", step === i ? "text-white" : "text-slate-400")}>{s.title}</p><p className="truncate text-[9px] text-slate-600">{s.desc}</p></div>
                    <span className="text-[11px] font-semibold text-slate-400 xl:hidden">{i + 1}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between px-5 pt-4">
              <div><h3 className="text-sm font-semibold text-white">Step {step + 1} · {steps[step].title}</h3><p className="mt-0.5 text-[11px] text-muted">{steps[step].desc}</p></div>
              <span className="code-font rounded-md border border-line bg-ink px-2 py-1 text-[10px] text-slate-500">{step + 1}/4</span>
            </div>
            <div className="min-h-[330px] space-y-4 p-5">
              {step === 0 && (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {baseImages.map((b) => (
                      <button key={b.id} onClick={() => selectBase(b.id)} className={cn("rounded-xl border p-3 text-left transition", config.baseId === b.id ? "border-sky-500/60 bg-sky-500/[0.07]" : "border-line bg-ink/50 hover:border-slate-600")}>
                        <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-100">{b.label}</span>{config.baseId === b.id && <CircleCheck size={15} className="text-sky-400" />}</div>
                        <p className="code-font mt-1 text-[10px]" style={{ color: b.accent }}>{b.image}</p>
                        <p className="mt-1.5 text-[10px] leading-relaxed text-muted">{b.description}</p>
                      </button>
                    ))}
                  </div>
                  <div><FieldLabel hint="FROM">Base image tag</FieldLabel>
                    <select value={config.variant} onChange={(e) => patch({ variant: e.target.value, runtimeImage: config.baseId === "rust" || config.baseId === "go" ? config.runtimeImage : e.target.value })} className={inputClass}>{base.variants.map((v) => <option key={v} value={v}>{v}</option>)}</select>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border border-sky-500/20 bg-sky-500/[0.05] p-3 text-[11px] text-slate-400"><Info size={14} className="mt-0.5 shrink-0 text-sky-400" /> Alpine variants are ~5× smaller, but musl libc can break native dependencies. Use slim Debian builds when in doubt.</div>
                </>
              )}

              {step === 1 && (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div><FieldLabel hint="WORKDIR">Working directory</FieldLabel><input value={config.workdir} onChange={(e) => patch({ workdir: e.target.value })} className={inputClass} /></div>
                    <div><FieldLabel hint="USER">Runtime user</FieldLabel><input value={config.user} onChange={(e) => patch({ user: e.target.value })} className={inputClass} /></div>
                    <div><FieldLabel hint="EXPOSE">Container port</FieldLabel><input value={config.expose} onChange={(e) => patch({ expose: e.target.value })} className={inputClass} /></div>
                  </div>
                  <div><FieldLabel hint="ENV · injected into the runtime stage">Environment variables</FieldLabel><KVEditor rows={config.env} onChange={(env) => patch({ env })} keyPlaceholder="NODE_ENV" valuePlaceholder="production" /></div>
                  <div className="flex items-start gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/[0.05] p-3 text-[11px] text-slate-400"><Zap size={14} className="mt-0.5 shrink-0 text-indigo-400" /> Secrets should never be baked into an image — pass them with <span className="code-font mx-1 text-indigo-300">docker run -e</span> or Compose secrets.</div>
                </>
              )}

              {step === 2 && (
                <>
                  <Toggle checked={config.multiStage} onChange={() => patch({ multiStage: !config.multiStage })} label="Multi-stage build" hint="Compile in a full toolchain, ship only runtime artifacts" />
                  {config.multiStage && <div><FieldLabel hint="stage 2 FROM">Runtime image</FieldLabel><input value={config.runtimeImage} onChange={(e) => patch({ runtimeImage: e.target.value })} className={inputClass} /></div>}
                  <div><FieldLabel hint="COPY · cache-friendly layer">Dependency manifest</FieldLabel><input value={config.manifest} onChange={(e) => patch({ manifest: e.target.value })} className={inputClass} /></div>
                  <div><FieldLabel hint="RUN">Install command</FieldLabel><input value={config.install} onChange={(e) => patch({ install: e.target.value })} className={inputClass} /></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><FieldLabel hint="RUN · optional">Build command</FieldLabel><input value={config.buildCmd} onChange={(e) => patch({ buildCmd: e.target.value })} className={inputClass} /></div>
                    <div><FieldLabel hint="apk / apt-get">System packages</FieldLabel><input value={config.packages} onChange={(e) => patch({ packages: e.target.value })} placeholder="curl ca-certificates" className={inputClass} /></div>
                  </div>
                  <div className="rounded-lg border border-line bg-[#080c14] p-3"><p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Recommended .dockerignore</p><p className="code-font text-[10px] leading-relaxed text-slate-400">node_modules<br />.git<br />dist<br />*.log<br />.env*</p></div>
                </>
              )}

              {step === 3 && (
                <>
                  <div><FieldLabel hint="JSON array syntax recommended">Startup command</FieldLabel><input value={config.cmd} onChange={(e) => patch({ cmd: e.target.value })} className={inputClass} /></div>
                  <Toggle checked={config.useEntrypoint} onChange={() => patch({ useEntrypoint: !config.useEntrypoint })} label="Use ENTRYPOINT instead of CMD" hint="ENTRYPOINT is not overridden by docker run arguments" />
                  <Toggle checked={config.healthcheck} onChange={() => patch({ healthcheck: !config.healthcheck })} label="Add HEALTHCHECK" hint="Orchestrators can detect and restart unhealthy containers" />
                  {config.healthcheck && <div><FieldLabel hint="CMD">Health probe command</FieldLabel><input value={config.healthCmd} onChange={(e) => patch({ healthCmd: e.target.value })} className={inputClass} /></div>}
                  <div><FieldLabel hint="LABEL · OCI metadata">Image labels</FieldLabel><KVEditor rows={config.labels} onChange={(labels) => patch({ labels })} keyPlaceholder="maintainer" valuePlaceholder="devops@acme.io" /></div>
                </>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line/70 px-5 py-3">
              <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}><ArrowLeft size={13} /> Back</Button>
              <span className="hidden text-[11px] text-slate-600 sm:block">Changes apply instantly to the preview →</span>
              {step < 3 ? <Button variant="primary" onClick={() => setStep((s) => s + 1)}>Next step <ArrowRight size={13} /></Button> : <Button variant="primary" onClick={() => { copyText(dockerfile); notify("Dockerfile copied", `${lines.length} lines copied to clipboard.`, "success"); }}><Copy size={13} /> Copy Dockerfile</Button>}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Image Best Practices" subtitle="Live audit of the generated Dockerfile" icon={<ShieldCheck size={17} />} actions={<span className={cn("code-font rounded-lg border px-2.5 py-1 text-xs font-bold", score >= 80 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300")}>{score}/100</span>} />
            <div className="grid gap-x-5 gap-y-2 p-5 sm:grid-cols-2">
              {checks.map((c) => (
                <div key={c.label} className="flex items-center gap-2 text-[11px]"><span className={cn("flex h-4 w-4 items-center justify-center rounded-full", c.ok ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-700/50 text-slate-500")}>{c.ok ? <Check size={11} /> : <span className="h-1 w-1 rounded-full bg-slate-500" />}</span><span className={c.ok ? "text-slate-300" : "text-slate-500"}>{c.label}</span></div>
              ))}
            </div>
            <div className="mx-5 mb-5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-cyber via-electric to-neon transition-all duration-500" style={{ width: `${score}%` }} /></div>
          </Panel>
        </div>

        <Panel className="flex min-w-0 flex-col xl:sticky xl:top-4 xl:self-start">
          <PanelHeader title="Dockerfile" subtitle="Real-time syntax-highlighted preview" icon={<FileCode2 size={17} />}
            actions={
              <>
                <button onClick={() => setLineNumbers((v) => !v)} className={cn("rounded-lg border px-2 py-1.5 text-[10px] transition", lineNumbers ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300" : "border-line text-slate-500 hover:text-slate-300")}># lines</button>
                <Button size="sm" variant="outline" onClick={() => { copyText(dockerfile); notify("Dockerfile copied", `${lines.length} lines copied to clipboard.`, "success"); }}><Copy size={12} /> Copy Dockerfile</Button>
              </>
            } />
          <div className="flex flex-wrap items-center gap-2 border-b border-line/70 px-5 py-3 text-[10px]">
            <span className="flex items-center gap-1.5 rounded-md border border-line bg-ink px-2 py-1 text-slate-400"><Layers3 size={11} className="text-sky-400" /> {layerCount} layers</span>
            <span className="flex items-center gap-1.5 rounded-md border border-line bg-ink px-2 py-1 text-slate-400"><FileCode2 size={11} className="text-indigo-400" /> {lines.length} lines</span>
            <span className="flex items-center gap-1.5 rounded-md border border-line bg-ink px-2 py-1 text-slate-400"><Sparkles size={11} className="text-emerald-400" /> {config.multiStage ? "2 stages" : "1 stage"}</span>
            <span className="code-font ml-auto truncate text-slate-500">{config.variant}</span>
          </div>
          <div className="p-3">
            <CodeBlock code={dockerfile} lang="dockerfile" showLineNumbers={lineNumbers} className="max-h-[620px] min-h-[400px]" />
          </div>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line/70 px-5 py-3 text-[10px] text-slate-500">
            <span className="code-font">docker build -t {config.baseId}-app:1.0 .</span>
            <Button size="sm" variant="ghost" onClick={() => { downloadFile("Dockerfile", dockerfile); notify("Dockerfile downloaded", "Saved to your downloads folder.", "success"); }}><Download size={12} /> Save file</Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
