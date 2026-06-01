import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity, ArrowDownUp, Boxes, ChevronDown, ChevronUp, Clock3, Copy, Cpu, Database,
  Download, FileText, Globe, HardDrive, Layers, MemoryStick, Network, Play, Plus, RotateCw,
  Search, Server, Square, Terminal, Trash2, Zap, Cog, Pause, CircleDot, ExternalLink,
} from "lucide-react";
import type { Container, ContainerStatus, DeployOptions, LocalImage } from "../types";
import { cn } from "../utils/cn";
import { copyText, downloadFile, formatUptime, timeStamp } from "../utils/helpers";
import { logTemplates } from "../data/seed";
import { Button, MetricBar, Modal, Panel, PanelHeader, Sparkline, StatusBadge, inputClass } from "./ui";

interface Props {
  containers: Container[];
  onAction: (id: string, action: "start" | "stop" | "restart") => void;
  onDeploy: (repository: string, tag: string, options?: DeployOptions) => void;
  localImages: LocalImage[];
  cpuHistory: number[];
  notify: (title: string, message: string, tone?: "success" | "info" | "error" | "warning") => void;
  onGoToRegistry: () => void;
}

function iconFor(kind: string, size = 18) {
  const props = { size, strokeWidth: 1.8 };
  switch (kind) {
    case "database": return <Database {...props} />;
    case "zap": return <Zap {...props} />;
    case "globe": return <Globe {...props} />;
    case "server": return <Server {...props} />;
    case "cog": return <Cog {...props} />;
    case "activity": return <Activity {...props} />;
    default: return <Boxes {...props} />;
  }
}

function StatCard({ label, value, sub, icon, color, children }: {
  label: string; value: string; sub: string; icon: ReactNode; color: string; children?: ReactNode;
}) {
  return (
    <Panel className="relative overflow-hidden p-4">
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: color }} />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <div className="code-font text-2xl font-bold tracking-tight text-white">{value}</div>
          <div className="mt-1 text-[11px] text-muted">{sub}</div>
        </div>
        {children}
      </div>
    </Panel>
  );
}

function LogsModal({ container, onClose, notify }: { container: Container | null; onClose: () => void; notify: Props["notify"] }) {
  const [lines, setLines] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [paused, setPaused] = useState(false);
  const [wrap, setWrap] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (container) setLines(container.logs.slice()); }, [container?.id]);
  useEffect(() => {
    if (!container || paused) return;
    const timer = window.setInterval(() => {
      const pool = logTemplates[container.icon] ?? logTemplates.default;
      const line = `${timeStamp()} ${pool[Math.floor(Math.random() * pool.length)]}`;
      setLines((prev) => [...prev.slice(-120), line]);
    }, 1400);
    return () => window.clearInterval(timer);
  }, [container?.id, paused]);
  useEffect(() => { if (!paused && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [lines, paused]);

  const shown = lines.filter((l) => l.toLowerCase().includes(filter.toLowerCase()));
  return (
    <Modal open={!!container} onClose={onClose} title="Container Logs" subtitle={container ? `docker logs -f ${container.name}` : ""} icon={<FileText size={17} />} width="max-w-4xl"
      footer={
        <>
          <span className="mr-auto flex items-center gap-2 text-[11px] text-muted">
            <span className="relative h-1.5 w-1.5 rounded-full bg-neon text-neon pulse-dot" /> {paused ? "Stream paused" : "Streaming live"} · {shown.length} lines
          </span>
          <Button size="sm" variant="outline" onClick={() => setWrap((w) => !w)}><ArrowDownUp size={13} /> {wrap ? "No wrap" : "Wrap"}</Button>
          <Button size="sm" variant="outline" onClick={() => { setPaused((p) => !p); }}>{paused ? <Play size={13} /> : <Pause size={13} />} {paused ? "Resume" : "Pause"}</Button>
          <Button size="sm" variant="outline" onClick={() => { copyText(lines.join("\n")); notify("Logs copied", `${lines.length} lines copied to clipboard.`, "success"); }}><Copy size={13} /> Copy</Button>
          <Button size="sm" variant="outline" onClick={() => { downloadFile(`${container?.name ?? "container"}.log`, lines.join("\n")); notify("Logs downloaded", "Log file saved.", "success"); }}><Download size={13} /> Download</Button>
        </>
      }>
      <div className="flex items-center gap-2 border-b border-line bg-ink/50 px-4 py-2.5">
        <Search size={14} className="text-slate-500" />
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter log lines (try: error, 200, ready)" className="code-font w-full bg-transparent text-[11px] text-slate-200 placeholder:text-slate-600" />
      </div>
      <div ref={scrollRef} className="code-font h-[52vh] overflow-auto bg-[#070b12] p-4 text-[11px] leading-[1.75]">
        {shown.map((line, i) => {
          const isError = /error|fail|exit/i.test(line);
          const isWarn = /warn|retry|lost/i.test(line);
          return (
            <div key={`${i}-${line.slice(0, 12)}`} className={cn("flex gap-3 hover:bg-white/[0.025]", wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre")}>
              <span className="w-9 shrink-0 select-none text-right text-slate-700">{i + 1}</span>
              <span className={isError ? "text-rose-300" : isWarn ? "text-amber-300" : /GET|LOG:|info/i.test(line) ? "text-emerald-300/90" : "text-slate-300"}>{line}</span>
            </div>
          );
        })}
        {!shown.length && <p className="py-8 text-center text-slate-600">No matching log lines.</p>}
        {!paused && <span className="cursor-blink ml-12 text-sky-400">▋</span>}
      </div>
    </Modal>
  );
}

type TerminalLine = { kind: "cmd" | "out" | "err" | "sys"; text: string };

function ShellModal({ container, onClose }: { container: Container | null; onClose: () => void }) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [cmd, setCmd] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container) return;
    setLines([
      { kind: "sys", text: `DockerPulse interactive shell · ${container.name} (${container.id.slice(0, 12)})` },
      { kind: "sys", text: `Connected to ${container.image} · type "help" for available commands` },
    ]);
    setCmd(""); setHistory([]);
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [container?.id]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [lines]);

  const run = () => {
    if (!container || !cmd.trim()) return;
    const c = cmd.trim();
    const [bin, ...args] = c.split(/\s+/);
    const out: TerminalLine[] = [{ kind: "cmd", text: c }];
    const add = (text: string, kind: TerminalLine["kind"] = "out") => out.push({ kind, text });
    switch (bin) {
      case "help":
        add("Available: help, ls, pwd, whoami, ps, env, cat, df, uname, docker, echo, clear, exit"); break;
      case "ls":
        add("bin/  boot/  dev/  etc/  home/  lib/  proc/  tmp/  usr/  var/  app/"); break;
      case "pwd": add("/app"); break;
      case "whoami": add("root"); break;
      case "ps":
        add("  PID   USER   %CPU   %MEM   COMMAND");
        add(`    1   root   ${container.cpu.toFixed(1)}   ${((container.memory / container.memLimit) * 100).toFixed(1)}   ${container.image.split(":")[0]}`);
        add("   18   root    0.2    0.1   healthcheck"); break;
      case "env":
        Object.entries(container.env).forEach(([k, v]) => add(`${k}=${v}`));
        add(`HOSTNAME=${container.id.slice(0, 12)}`); break;
      case "cat":
        if (args[0] === "/etc/os-release") {
          add('NAME="Alpine Linux"'); add("ID=alpine"); add('VERSION_ID="3.19"'); add('HOME_URL="https://alpinelinux.org/"');
        } else if (args[0] === "/app/package.json") add('{ "name": "api-backend", "version": "1.4.2", "main": "dist/server.js" }');
        else add(`cat: ${args[0] ?? ""} No such file or directory`, "err");
        break;
      case "df":
        add("Filesystem      Size  Used Avail Use% Mounted on");
        add("overlay          32G  8.4G   23G  27% /");
        add("tmpfs            64M     0   64M   0% /dev"); break;
      case "uname": add(`Linux ${container.id.slice(0, 12)} 6.6.12-linuxkit #1 SMP x86_64 Linux`); break;
      case "docker":
        add("Cannot run Docker CLI inside a container (no socket mounted).", "err"); break;
      case "echo": add(args.join(" ")); break;
      case "clear": setLines([]); setCmd(""); return;
      case "exit": onClose(); return;
      default: add(`sh: ${bin}: not found`, "err");
    }
    setLines((prev) => [...prev, ...out]);
    setHistory((h) => [c, ...h].slice(0, 30));
    setHistIdx(-1);
    setCmd("");
  };

  return (
    <Modal open={!!container} onClose={onClose} title="Inspect Shell" subtitle={container ? `docker exec -it ${container.name} /bin/sh` : ""} icon={<Terminal size={17} />} width="max-w-3xl">
      <div ref={scrollRef} className="code-font h-[50vh] overflow-auto bg-[#05080e] p-4 text-[11px] leading-[1.8]" onClick={() => inputRef.current?.focus()}>
        {lines.map((l, i) => (
          <div key={i} className={cn("whitespace-pre-wrap break-all", l.kind === "cmd" ? "text-sky-300" : l.kind === "err" ? "text-rose-300" : l.kind === "sys" ? "text-slate-500" : "text-slate-300")}>
            {l.kind === "cmd" ? <><span className="text-neon">root@{container?.name ?? "container"}</span><span className="text-slate-500">:</span><span className="text-indigo-300">/app</span><span className="text-slate-400">$ </span>{l.text}</> : l.text}
          </div>
        ))}
        <div className="mt-1 flex items-center gap-2">
          <span className="shrink-0"><span className="text-neon">root@{container?.name ?? "container"}</span><span className="text-slate-500">:</span><span className="text-indigo-300">/app</span><span className="text-slate-400">$ </span></span>
          <input
            ref={inputRef} value={cmd} onChange={(e) => setCmd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") run();
              if (e.key === "ArrowUp") { e.preventDefault(); const next = Math.min(histIdx + 1, history.length - 1); if (next >= 0) { setHistIdx(next); setCmd(history[next]); } }
              if (e.key === "ArrowDown") { e.preventDefault(); const next = histIdx - 1; setHistIdx(next); setCmd(next >= 0 ? history[next] : ""); }
            }}
            className="min-w-0 flex-1 bg-transparent text-sky-200 caret-sky-400" spellCheck={false} autoComplete="off" aria-label="Shell command"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line bg-ink/60 px-4 py-3">
        <span className="mr-1 text-[11px] text-slate-500">Try:</span>
        {["help", "ls", "ps", "env", "cat /etc/os-release", "df -h"].map((c) => (
          <button key={c} onClick={() => { setCmd(c); setTimeout(() => inputRef.current?.focus(), 0); }} className="code-font rounded-md border border-line bg-white/[0.03] px-2 py-1 text-[10px] text-slate-400 transition hover:border-cyber/40 hover:text-sky-300">{c}</button>
        ))}
      </div>
    </Modal>
  );
}

function DeployModal({ open, onClose, localImages, onDeploy, onGoToRegistry, notify }: {
  open: boolean; onClose: () => void; localImages: LocalImage[];
  onDeploy: Props["onDeploy"]; onGoToRegistry: () => void; notify: Props["notify"];
}) {
  const [image, setImage] = useState("");
  const [name, setName] = useState("");
  const [hostPort, setHostPort] = useState("8080");
  const [containerPort, setContainerPort] = useState("80");
  const [memLimit, setMemLimit] = useState("512");
  const [network, setNetwork] = useState("dp-bridge");
  const [restart, setRestart] = useState("unless-stopped");

  useEffect(() => {
    if (open) {
      const first = localImages[0];
      setImage(first ? `${first.repository}:${first.tag}` : "");
      setName(`dp-${(first?.repository.split("/").pop() ?? "service").replace(/[^a-z0-9]/gi, "-")}-${Math.floor(Math.random() * 90 + 10)}`);
    }
  }, [open, localImages.length]);

  const submit = () => {
    const [repo, tag] = image.split(":");
    if (!repo || !tag) { notify("Invalid image", "Select a local image in repository:tag format.", "error"); return; }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name)) { notify("Invalid name", "Use letters, numbers, dashes, dots or underscores.", "error"); return; }
    if (!/^\d+$/.test(hostPort) || !/^\d+$/.test(containerPort)) { notify("Invalid ports", "Port mappings must be numeric, e.g. 8080:80.", "error"); return; }
    onDeploy(repo, tag, { name, ports: [`${hostPort}:${containerPort}`], memLimit: Number(memLimit), network, restartPolicy: restart });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Deploy New Container" subtitle="docker run -d ..." icon={<Plus size={17} />} width="max-w-xl"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}><Play size={13} /> Deploy Container</Button></>}>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Local Image</label>
          <select value={image} onChange={(e) => setImage(e.target.value)} className={inputClass}>
            {localImages.map((img) => <option key={img.id} value={`${img.repository}:${img.tag}`}>{img.repository}:{img.tag} · {img.sizeMb} MB</option>)}
          </select>
          <button onClick={() => { onClose(); onGoToRegistry(); }} className="mt-2 inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300">Need another image? Search the registry <ExternalLink size={11} /></button>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Container Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="dp-my-service" />
        </div>
        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Host Port</label>
          <input value={hostPort} onChange={(e) => setHostPort(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Container Port</label>
          <input value={containerPort} onChange={(e) => setContainerPort(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Memory Limit</label>
          <select value={memLimit} onChange={(e) => setMemLimit(e.target.value)} className={inputClass}><option value="256">256 MB</option><option value="512">512 MB</option><option value="1024">1 GB</option><option value="2048">2 GB</option></select>
        </div>
        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Network</label>
          <select value={network} onChange={(e) => setNetwork(e.target.value)} className={inputClass}><option>dp-bridge</option><option>dp-backend</option><option>dp-frontend</option><option>host</option></select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Restart Policy</label>
          <select value={restart} onChange={(e) => setRestart(e.target.value)} className={inputClass}><option>unless-stopped</option><option>always</option><option>on-failure</option><option>no</option></select>
        </div>
      </div>
    </Modal>
  );
}

export default function ContainerFleet({ containers, onAction, onDeploy, localImages, cpuHistory, notify, onGoToRegistry }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ContainerStatus>("all");
  const [sort, setSort] = useState("cpu");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [modal, setModal] = useState<{ type: "logs" | "shell"; id: string } | null>(null);
  const [deployOpen, setDeployOpen] = useState(false);

  const selected = modal ? containers.find((c) => c.id === modal.id) ?? null : null;
  const running = containers.filter((c) => c.status === "running").length;
  const active = containers.filter((c) => c.status !== "stopped");
  const avgCpu = active.length ? active.reduce((s, c) => s + c.cpu, 0) / active.length : 0;
  const memUsed = containers.reduce((s, c) => s + c.memory, 0);
  const memTotal = containers.reduce((s, c) => s + c.memLimit, 0);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = containers.filter((c) =>
      (statusFilter === "all" || c.status === statusFilter) &&
      (!q || [c.name, c.image, c.id, c.network, ...c.ports].some((v) => v.toLowerCase().includes(q))),
    );
    return [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "uptime") return b.uptime - a.uptime;
      if (sort === "memory") return b.memory - a.memory;
      if (sort === "status") return a.status.localeCompare(b.status);
      return b.cpu - a.cpu;
    });
  }, [containers, query, statusFilter, sort]);

  const openModal = (type: "logs" | "shell", c: Container) => {
    if (type === "shell" && c.status === "stopped") {
      notify("Shell unavailable", `Start ${c.name} before attaching an interactive shell.`, "warning");
      return;
    }
    setModal({ type, id: c.id });
  };

  const filters: { id: "all" | ContainerStatus; label: string }[] = [
    { id: "all", label: "All" },
    { id: "running", label: "Running" },
    { id: "restarting", label: "Restarting" },
    { id: "stopped", label: "Stopped" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400"><span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> Runtime Overview</div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Container Fleet</h2>
          <p className="mt-1 text-xs text-muted">Manage services, stream logs and monitor live CPU / memory telemetry.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-300 sm:flex"><span className="relative h-1.5 w-1.5 rounded-full bg-neon text-neon pulse-dot" /> Live metrics · 1.6s</span>
          <Button variant="primary" onClick={() => setDeployOpen(true)}><Plus size={14} /> Deploy Container</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Containers" value={String(containers.length)} sub={`${running} healthy & running`} icon={<Boxes size={17} />} color="#38bdf8" />
        <StatCard label="Active Services" value={`${running}/${containers.length}`} sub={`${containers.filter((c) => c.status === "restarting").length} restarting · ${containers.filter((c) => c.status === "stopped").length} stopped`} icon={<CircleDot size={17} />} color="#10b981" />
        <StatCard label="Avg CPU Load" value={`${avgCpu.toFixed(1)}%`} sub="Across active containers" icon={<Cpu size={17} />} color="#6366f1">
          <div className="w-24 opacity-80"><Sparkline data={cpuHistory} color="#818cf8" /></div>
        </StatCard>
        <StatCard label="Memory Allocated" value={`${(memUsed / 1024).toFixed(2)} GB`} sub={`of ${(memTotal / 1024).toFixed(2)} GB reserved`} icon={<MemoryStick size={17} />} color="#f59e0b">
          <div className="w-20"><MetricBar label="" value={(memUsed / Math.max(1, memTotal)) * 100} detail={`${Math.round((memUsed / Math.max(1, memTotal)) * 100)}%`} color="#f59e0b" /></div>
        </StatCard>
      </div>

      <Panel>
        <PanelHeader title="Services" subtitle="docker ps -a · simulated engine state" icon={<Layers size={17} />}
          actions={
            <div className="flex flex-wrap items-center gap-1">
              {filters.map((f) => (
                <button key={f.id} onClick={() => setStatusFilter(f.id)} className={cn("rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition", statusFilter === f.id ? "border-sky-500/40 bg-sky-500/10 text-sky-300" : "border-transparent text-slate-500 hover:bg-white/5 hover:text-slate-300")}>
                  {f.label}<span className="ml-1.5 text-[10px] opacity-60">{f.id === "all" ? containers.length : containers.filter((c) => c.status === f.id).length}</span>
                </button>
              ))}
            </div>
          } />
        <div className="flex flex-col gap-2 border-b border-line/70 px-5 py-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, image, ID or port…" className="w-full rounded-lg border border-line bg-ink/70 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyber/60" />
          </div>
          <div className="flex items-center gap-2">
            <ArrowDownUp size={13} className="text-slate-500" />
            <select value={sort} onChange={(e) => setSort(e.target.value)} className={cn(inputClass, "w-auto py-2")}>
              <option value="cpu">Sort: CPU</option><option value="memory">Sort: Memory</option><option value="name">Sort: Name</option><option value="uptime">Sort: Uptime</option><option value="status">Sort: Status</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          {visible.map((c) => {
            const isExpanded = expanded.includes(c.id);
            const cpu = c.cpu;
            const memPct = (c.memory / c.memLimit) * 100;
            return (
              <div key={c.id} className="overflow-hidden rounded-xl border border-line bg-[#0e1522]/80 transition hover:border-slate-600/60">
                <div className="grid gap-4 p-4 lg:grid-cols-[minmax(230px,1.15fr)_minmax(190px,0.9fr)_minmax(190px,1fr)]">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border" style={{ color: c.accent, backgroundColor: `${c.accent}14`, borderColor: `${c.accent}35` }}>{iconFor(c.icon)}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-slate-100">{c.name}</h3>
                        <StatusBadge status={c.status} compact />
                      </div>
                      <p className="code-font mt-1 truncate text-[11px] text-sky-300/90">{c.image}</p>
                      <p className="code-font mt-0.5 truncate text-[10px] text-slate-600">ID {c.id.slice(0, 12)} · {c.health === "healthy" ? "healthy" : c.health === "degraded" ? "unhealthy" : "no healthcheck"}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-start gap-2 text-slate-400"><Network size={13} className="mt-0.5 shrink-0 text-slate-500" /><span className="shrink-0">Ports</span><div className="flex flex-wrap gap-1">{c.ports.map((p) => <span key={p} className="code-font rounded border border-line bg-ink px-1.5 py-0.5 text-[10px] text-slate-300">{p}</span>)}</div></div>
                    <div className="flex items-center gap-2 text-slate-400"><Clock3 size={13} className="text-slate-500" /> Uptime <span className="code-font text-slate-300">{formatUptime(c.uptime)}</span></div>
                    <div className="flex items-center gap-2 text-slate-400"><HardDrive size={13} className="text-slate-500" /> {c.network} · <span className="code-font text-slate-500">{c.restartPolicy}</span></div>
                  </div>

                  <div className="space-y-2.5">
                    <MetricBar label="CPU" value={cpu} detail={`${cpu.toFixed(1)}%`} />
                    <MetricBar label="MEM" value={memPct} detail={`${Math.round(c.memory)} / ${c.memLimit} MB`} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 border-t border-line/70 bg-ink/40 px-3 py-2.5">
                  <Button size="sm" variant="success" disabled={c.status === "running" || c.status === "starting"} onClick={() => onAction(c.id, "start")}><Play size={12} /> Start</Button>
                  <Button size="sm" variant="danger" disabled={c.status === "stopped"} onClick={() => onAction(c.id, "stop")}><Square size={11} /> Stop</Button>
                  <Button size="sm" variant="ghost" onClick={() => onAction(c.id, "restart")}><RotateCw size={12} /> Restart</Button>
                  <span className="mx-1 hidden h-4 w-px bg-line sm:block" />
                  <Button size="sm" variant="ghost" onClick={() => openModal("logs", c)}><FileText size={12} /> View Logs</Button>
                  <Button size="sm" variant="ghost" onClick={() => openModal("shell", c)}><Terminal size={12} /> Inspect Shell</Button>
                  <button onClick={() => setExpanded((prev) => isExpanded ? prev.filter((x) => x !== c.id) : [...prev, c.id])} className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-slate-500 transition hover:bg-white/5 hover:text-slate-200">
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />} {isExpanded ? "Hide" : "Inspect"}
                  </button>
                </div>

                {isExpanded && (
                  <div className="animate-fade-up grid gap-4 border-t border-line/70 p-4 md:grid-cols-3">
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Environment</p>
                      <div className="space-y-1">{Object.entries(c.env).length ? Object.entries(c.env).map(([k, v]) => <div key={k} className="code-font truncate text-[10px] text-slate-400"><span className="text-sky-300">{k}</span>=<span className="text-emerald-300/80">{v}</span></div>) : <p className="text-[11px] text-slate-600">No variables set</p>}</div>
                    </div>
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Volume Mounts</p>
                      <div className="space-y-1">{c.volumes.map((v) => <div key={v} className="code-font truncate text-[10px] text-slate-400">{v}</div>)}</div>
                    </div>
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Inspect JSON</p>
                      <pre className="code-font max-h-28 overflow-auto rounded-lg border border-line bg-[#080c14] p-2 text-[10px] leading-relaxed text-slate-400">{JSON.stringify({ Id: c.id, Image: c.image, State: { Status: c.status, Health: c.health, Running: c.status === "running" }, HostConfig: { PortBindings: c.ports, RestartPolicy: { Name: c.restartPolicy }, Memory: c.memLimit * 1048576 }, NetworkSettings: { Networks: { [c.network]: { Aliases: [c.name] } } } }, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!visible.length && (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <Search size={26} className="text-slate-600" /><p className="text-sm text-slate-400">No containers match your filters</p>
              <button onClick={() => { setQuery(""); setStatusFilter("all"); }} className="text-xs text-sky-400 hover:underline">Clear filters</button>
            </div>
          )}
        </div>
      </Panel>

      <div className="grid gap-3 md:grid-cols-3">
        <Panel className="flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400"><Activity size={17} /></div><div><p className="text-xs font-semibold text-slate-200">Telemetry active</p><p className="mt-0.5 text-[11px] text-muted">CPU &amp; RAM drift every 1.6 seconds</p></div></Panel>
        <Panel className="flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400"><Terminal size={17} /></div><div><p className="text-xs font-semibold text-slate-200">Interactive exec</p><p className="mt-0.5 text-[11px] text-muted">Try <span className="code-font text-slate-400">help</span> in a container shell</p></div></Panel>
        <Panel className="flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400"><Trash2 size={17} /></div><div><p className="text-xs font-semibold text-slate-200">Housekeeping</p><p className="mt-0.5 text-[11px] text-muted">Prune unused images from the header</p></div></Panel>
      </div>

      <LogsModal container={modal?.type === "logs" ? selected : null} onClose={() => setModal(null)} notify={notify} />
      <ShellModal container={modal?.type === "shell" ? selected : null} onClose={() => setModal(null)} />
      <DeployModal open={deployOpen} onClose={() => setDeployOpen(false)} localImages={localImages} onDeploy={onDeploy} onGoToRegistry={onGoToRegistry} notify={notify} />
    </div>
  );
}
