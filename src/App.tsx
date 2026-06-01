import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Boxes, Container as ContainerIcon, Download, FileCode2, GitBranch, HardDriveDownload,
  Layers3, Search, Sparkles, TerminalSquare, Trash2,
} from "lucide-react";
import { cn } from "./utils/cn";
import { initialContainers, initialLocalImages, defaultCompose, logTemplates } from "./data/seed";
import type { Container, DeployOptions, LocalImage, TabId, Toast } from "./types";
import { downloadFile, randomId, timeStamp } from "./utils/helpers";
import { Button, DockerWhale, ToastStack } from "./components/ui";
import ContainerFleet from "./components/ContainerFleet";
import DockerfileBuilder from "./components/DockerfileBuilder";
import ComposeVisualizer from "./components/ComposeVisualizer";
import RegistrySearch from "./components/RegistrySearch";

const tabs: { id: TabId; label: string; icon: typeof Boxes }[] = [
  { id: "fleet", label: "Containers Fleet", icon: Boxes },
  { id: "dockerfile", label: "Dockerfile Generator", icon: FileCode2 },
  { id: "compose", label: "Compose Visualizer", icon: GitBranch },
  { id: "registry", label: "Registry Search", icon: Search },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("fleet");
  const [containers, setContainers] = useState<Container[]>(initialContainers);
  const [localImages, setLocalImages] = useState<LocalImage[]>(initialLocalImages);
  const [composeYaml, setComposeYaml] = useState(defaultCompose);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [cpuHistory, setCpuHistory] = useState<number[]>([22, 26, 24, 31, 29, 35, 33, 28, 37, 34, 41, 38, 36, 43, 39, 35]);
  const [clock, setClock] = useState(timeStamp());
  const containersRef = useRef(containers);
  const toastId = useRef(0);

  useEffect(() => { containersRef.current = containers; }, [containers]);

  const notify = useCallback((title: string, message: string, tone: Toast["tone"] = "info") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev.slice(-3), { id, title, message, tone }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  // Simulated Docker daemon telemetry loop
  useEffect(() => {
    const timer = window.setInterval(() => {
      setContainers((prev) => prev.map((c) => {
        const jitter = (v: number, spread: number, min: number, max: number) =>
          Math.max(min, Math.min(max, v + (Math.random() - 0.5) * spread));
        if (c.status === "stopped") return c;
        let status = c.status;
        let transition = c.transition;
        if (transition !== undefined) {
          transition -= 1;
          if (transition <= 0) {
            status = "running";
            transition = undefined;
          }
        }
        const next: Container = {
          ...c,
          status,
          transition,
          uptime: c.uptime + 2,
          cpu: status === "restarting" ? jitter(c.cpu, 16, 18, 78) : jitter(c.cpu, 9, 1, 92),
          memory: status === "starting" ? Math.min(c.memLimit, c.memory + 18) : jitter(c.memory, 22, 12, c.memLimit * 0.94),
          health: status === "restarting" ? "degraded" : c.health === "degraded" ? "healthy" : c.health,
        };
        if (Math.random() < 0.16) {
          const pool = logTemplates[c.icon] ?? logTemplates.default;
          next.logs = [...c.logs, `${timeStamp()} ${pool[Math.floor(Math.random() * pool.length)]}`].slice(-60);
        }
        return next;
      }));
      const snapshot = containersRef.current;
      const active = snapshot.filter((c) => c.status !== "stopped");
      const avg = active.length ? active.reduce((sum, c) => sum + c.cpu, 0) / active.length : 0;
      setCpuHistory((h) => [...h.slice(-31), avg]);
      setClock(timeStamp());
    }, 1600);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        setActiveTab(tabs[Number(e.key) - 1].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const usedImages = useMemo(() => new Set(containers.map((c) => c.image)), [containers]);
  const unusedImages = useMemo(
    () => localImages.filter((img) => !usedImages.has(`${img.repository}:${img.tag}`)),
    [localImages, usedImages],
  );

  const handleAction = useCallback((id: string, action: "start" | "stop" | "restart") => {
    const c = containersRef.current.find((x) => x.id === id);
    if (!c) return;
    if ((action === "start" && (c.status === "running" || c.status === "starting")) || (action === "stop" && c.status === "stopped")) {
      notify("No change needed", `${c.name} is already ${c.status}.`, "info");
      return;
    }
    const stamp = timeStamp();
    setContainers((prev) => prev.map((x) => {
      if (x.id !== id) return x;
      const logs = [...x.logs, `${stamp} [dockerpulse] docker ${action} ${x.name}`].slice(-60);
      if (action === "start") return { ...x, status: "starting", transition: 2, uptime: 0, cpu: 8, memory: Math.min(48, x.memLimit * 0.2), health: "healthy", logs };
      if (action === "stop") return { ...x, status: "stopped", transition: undefined, cpu: 0, memory: 0, uptime: 0, health: "none", logs };
      return { ...x, status: "restarting", transition: 3, uptime: 0, cpu: 34, memory: x.memLimit * 0.3, health: "degraded", logs };
    }));
    const verb = action === "start" ? "started" : action === "stop" ? "stopped" : "restarting";
    notify(`Container ${verb}`, `${c.name} · ${c.image}`, action === "stop" ? "warning" : "success");
  }, [notify]);

  const pullImage = useCallback((repository: string, tag: string, sizeMb: number): boolean => {
    if (localImages.some((i) => i.repository === repository && i.tag === tag)) return false;
    setLocalImages((prev) => [{ id: `sha256:${randomId().slice(0, 8)}`, repository, tag, sizeMb, createdAt: "just now" }, ...prev]);
    return true;
  }, [localImages]);

  const deployImage = useCallback((repository: string, tag: string, options?: DeployOptions) => {
    const image = `${repository}:${tag}`;
    const name = options?.name?.trim() || `dp-${repository.split("/").pop()?.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${randomId().slice(0, 4)}`;
    const portMap: Record<string, string> = {
      nginx: "8080:80", httpd: "8080:80", redis: "6379:6379", postgres: "5432:5432",
      mongo: "27017:27017", mysql: "3306:3306", node: "3000:3000", python: "8000:8000",
      rabbitmq: "5672:5672", traefik: "80:80", "prom/prometheus": "9090:9090",
      "grafana/grafana": "3001:3000", elasticsearch: "9200:9200",
    };
    const newContainer: Container = {
      id: randomId(), name, image, status: "starting", transition: 2,
      ports: options?.ports?.length ? options.ports : [portMap[repository] ?? "—"], cpu: 8, memory: 24,
      memLimit: options?.memLimit ?? 512, uptime: 0,
      network: options?.network || "dp-bridge", restartPolicy: options?.restartPolicy || "unless-stopped", health: "healthy",
      volumes: [], env: {}, icon: "default", accent: "#38bdf8",
      logs: [`${timeStamp()} [dockerpulse] creating container ${name}`, `${timeStamp()} [dockerpulse] image ${image} already present locally`],
    };
    setContainers((prev) => [newContainer, ...prev]);
    notify("Container deployed", `${name} is starting from ${image}. View it in Containers Fleet.`, "success");
  }, [notify]);

  const pruneImages = useCallback(() => {
    if (!unusedImages.length) {
      notify("Nothing to prune", "All locally cached images are in use by a container.", "info");
      return;
    }
    const reclaimed = unusedImages.reduce((s, i) => s + i.sizeMb, 0);
    setLocalImages((prev) => prev.filter((i) => usedImages.has(`${i.repository}:${i.tag}`)));
    notify("Prune complete", `Removed ${unusedImages.length} unused image${unusedImages.length > 1 ? "s" : ""} · reclaimed ${(reclaimed / 1024).toFixed(2)} GB of disk space.`, "success");
  }, [unusedImages, usedImages, notify]);

  const exportCompose = useCallback(() => {
    downloadFile("docker-compose.yml", composeYaml, "text/yaml");
    notify("Compose exported", "docker-compose.yml downloaded to your machine.", "success");
  }, [composeYaml, notify]);

  const runningCount = containers.filter((c) => c.status === "running").length;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-ink text-slate-200">
      <div className="pointer-events-none fixed inset-0 bg-grid opacity-60" />
      <div className="pointer-events-none fixed -top-40 left-1/4 h-[420px] w-[620px] rounded-full bg-cyber/10 blur-[130px]" />
      <div className="pointer-events-none fixed -top-52 right-0 h-[380px] w-[420px] rounded-full bg-electric/10 blur-[130px]" />

      <header className="relative z-20 border-b border-line/80 bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="glow-blue flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-500/10">
              <DockerWhale className="h-8 w-8 drop-shadow-[0_0_10px_rgba(56,189,248,0.65)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-white sm:text-xl">Docker<span className="text-sky-400">Pulse</span></h1>
                <span className="hidden rounded-md border border-electric/30 bg-electric/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-300 sm:inline">v2.4.0</span>
              </div>
              <p className="hidden text-[10px] text-muted sm:block">Interactive Container Fleet Manager &amp; Compose Studio</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-1.5">
              <span className="relative h-2 w-2 rounded-full bg-neon text-neon pulse-dot" />
              <span className="text-[11px] font-medium text-emerald-200">Docker Daemon: Running</span>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-line bg-panel/70 px-3 py-1.5 lg:flex">
              <TerminalSquare size={13} className="text-sky-400" />
              <span className="code-font text-[11px] text-slate-400">{clock} UTC</span>
            </div>
            <Button variant="outline" onClick={pruneImages} title="Remove unused local images" className="inline-flex">
              <Trash2 size={14} /> <span className="hidden xl:inline">Prune Unused Images</span><span className="xl:hidden">Prune</span>
              {unusedImages.length > 0 && <span className="ml-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">{unusedImages.length}</span>}
            </Button>
            <Button variant="primary" onClick={exportCompose} title="Download docker-compose.yml">
              <Download size={14} /> <span className="hidden xl:inline">Export Compose YAML</span><span className="xl:hidden">Export</span>
            </Button>
          </div>
        </div>

        <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
          <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Primary">
            {tabs.map((tab, i) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "group relative flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition-colors sm:px-4",
                    active ? "border-sky-400 text-white" : "border-transparent text-muted hover:border-line hover:text-slate-200",
                  )}
                >
                  <Icon size={15} className={active ? "text-sky-400" : "text-slate-500 group-hover:text-slate-300"} />
                  {tab.label}
                  {tab.id === "fleet" && <span className={cn("rounded-full px-1.5 py-0.5 text-[9px]", active ? "bg-sky-500/15 text-sky-300" : "bg-white/5 text-slate-500")}>{runningCount}/{containers.length}</span>}
                  <span className="hidden text-[9px] text-slate-600 lg:inline">⌘{i + 1}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
        <div key={activeTab} className="animate-fade-up">
          {activeTab === "fleet" && (
            <ContainerFleet
              containers={containers}
              onAction={handleAction}
              onDeploy={deployImage}
              localImages={localImages}
              cpuHistory={cpuHistory}
              notify={notify}
              onGoToRegistry={() => setActiveTab("registry")}
            />
          )}
          {activeTab === "dockerfile" && <DockerfileBuilder notify={notify} />}
          {activeTab === "compose" && (
            <ComposeVisualizer yaml={composeYaml} onYamlChange={setComposeYaml} notify={notify} onExport={exportCompose} />
          )}
          {activeTab === "registry" && (
            <RegistrySearch localImages={localImages} unusedImages={unusedImages} onPull={pullImage} onDeploy={deployImage} onPrune={pruneImages} notify={notify} />
          )}
        </div>
      </main>

      <footer className="relative z-10 mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 border-t border-line/70 px-4 py-5 text-[11px] text-slate-600 sm:px-6">
        <div className="flex items-center gap-2">
          <DockerWhale className="h-4 w-4 opacity-60" />
          <span>DockerPulse · Simulated Docker Engine 25.0 · All data runs locally in your browser</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><ContainerIcon size={12} /> {containers.length} containers</span>
          <span className="flex items-center gap-1.5"><Layers3 size={12} /> {localImages.length} images</span>
          <span className="flex items-center gap-1.5"><Sparkles size={12} /> <HardDriveDownload size={12} /> 0 network calls</span>
        </div>
      </footer>

      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
