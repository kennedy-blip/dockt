import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownUp, Box, Check, CloudDownload, Database, Download, ExternalLink, HardDrive,
  Layers3, PackageCheck, Play, Search, ShieldCheck, Star, Trash2, TrendingUp,
} from "lucide-react";
import { registryImages } from "../data/seed";
import type { LocalImage } from "../types";
import { cn } from "../utils/cn";
import { formatNumber } from "../utils/helpers";
import { Button, Panel, PanelHeader } from "./ui";

interface Props {
  localImages: LocalImage[];
  unusedImages: LocalImage[];
  onPull: (repository: string, tag: string, sizeMb: number) => boolean;
  onDeploy: (repository: string, tag: string) => void;
  onPrune: () => void;
  notify: (title: string, message: string, tone?: "success" | "info" | "error" | "warning") => void;
}

export default function RegistrySearch({ localImages, unusedImages, onPull, onDeploy, onPrune, notify }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("pulls");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(["nginx", "postgres", "redis"]);
  const [selectedTags, setSelectedTags] = useState<Record<string, string>>({});
  const [pulling, setPulling] = useState<Record<string, number>>({});
  const [localQuery, setLocalQuery] = useState("");
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearInterval(t)), []);

  const categories = useMemo(() => ["All", ...Array.from(new Set(registryImages.map((i) => i.category)))], []);
  const localKeys = useMemo(() => new Set(localImages.map((i) => `${i.repository}:${i.tag}`)), [localImages]);
  const unusedKeys = useMemo(() => new Set(unusedImages.map((i) => `${i.repository}:${i.tag}`)), [unusedImages]);
  const reclaimedMb = unusedImages.reduce((s, i) => s + i.sizeMb, 0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = registryImages.filter((img) =>
      (category === "All" || img.category === category) &&
      (!onlyFavorites || favorites.includes(img.name)) &&
      (!q || `${img.name} ${img.description} ${img.category} ${img.tags.join(" ")}`.toLowerCase().includes(q)),
    );
    return [...list].sort((a, b) => sort === "stars" ? b.stars - a.stars : sort === "name" ? a.name.localeCompare(b.name) : sort === "size" ? parseFloat(a.size) - parseFloat(b.size) : b.pulls - a.pulls);
  }, [query, category, sort, onlyFavorites, favorites]);

  const tagFor = (name: string, fallback: string) => selectedTags[name] ?? fallback;

  const startPull = (name: string, tag: string, size: string) => {
    const key = `${name}:${tag}`;
    if (pulling[key] !== undefined) return;
    if (localKeys.has(key)) { notify("Already up to date", `${key} is present in the local image cache.`, "info"); return; }
    setPulling((p) => ({ ...p, [key]: 4 }));
    let progress = 4;
    const timer = window.setInterval(() => {
      progress += 9 + Math.random() * 16;
      if (progress >= 100) {
        window.clearInterval(timer);
        setPulling((p) => { const next = { ...p }; delete next[key]; return next; });
        onPull(name, tag, parseFloat(size) || 64);
        notify("Image pulled", `${key} is now available locally.`, "success");
      } else {
        setPulling((p) => ({ ...p, [key]: Math.round(progress) }));
      }
    }, 280);
    timers.current.push(timer);
  };

  const deploy = (name: string, tag: string, size: string) => {
    if (!localKeys.has(`${name}:${tag}`)) onPull(name, tag, parseFloat(size) || 64);
    onDeploy(name, tag);
  };

  const toggleFavorite = (name: string) => setFavorites((f) => f.includes(name) ? f.filter((x) => x !== name) : [...f, name]);
  const visibleLocal = localImages.filter((img) => `${img.repository}:${img.tag}`.toLowerCase().includes(localQuery.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400"><span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> Image Catalog</div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Registry Search</h2>
          <p className="mt-1 text-xs text-muted">Discover official images, pull them locally and deploy containers in one click.</p>
        </div>
        <div className="flex items-center gap-2"><span className="hidden items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-300 sm:flex"><ShieldCheck size={13} /> Registry: docker.io · Connected</span></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Panel className="p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Catalog Images</p><p className="code-font mt-1 text-2xl font-bold text-white">{registryImages.length}</p><p className="mt-1 text-[10px] text-muted">{categories.length - 1} categories</p></Panel>
        <Panel className="p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Local Cache</p><p className="code-font mt-1 text-2xl font-bold text-white">{localImages.length}</p><p className="mt-1 text-[10px] text-muted">{(localImages.reduce((s, i) => s + i.sizeMb, 0) / 1024).toFixed(2)} GB on disk</p></Panel>
        <Panel className="p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Unused / Reclaimable</p><p className="code-font mt-1 text-2xl font-bold text-amber-300">{unusedImages.length}</p><p className="mt-1 text-[10px] text-muted">{(reclaimedMb / 1024).toFixed(2)} GB can be freed</p></Panel>
        <Panel className="p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Pulls</p><p className="code-font mt-1 text-2xl font-bold text-white">{formatNumber(registryImages.reduce((s, i) => s + i.pulls, 0))}</p><p className="mt-1 text-[10px] text-muted">across catalog entries</p></Panel>
      </div>

      <Panel>
        <PanelHeader title="Docker Hub Catalog" subtitle="docker search · curated public images" icon={<CloudDownload size={17} />}
          actions={
            <div className="flex items-center gap-2">
              <button onClick={() => setOnlyFavorites((v) => !v)} className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition", onlyFavorites ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-line text-slate-500 hover:text-slate-300")}><Star size={12} fill={onlyFavorites ? "currentColor" : "none"} /> Favorites</button>
              <div className="flex items-center gap-1.5"><ArrowDownUp size={12} className="text-slate-500" /><select value={sort} onChange={(e) => setSort(e.target.value)} className="code-font rounded-lg border border-line bg-ink/70 px-2 py-1.5 text-[11px] text-slate-300"><option value="pulls">Most pulled</option><option value="stars">Most starred</option><option value="name">Name A–Z</option><option value="size">Smallest first</option></select></div>
            </div>
          } />
        <div className="flex flex-col gap-3 border-b border-line/70 px-5 py-3 lg:flex-row lg:items-center">
          <div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search images, e.g. postgres, cache, monitoring…" className="w-full rounded-lg border border-line bg-ink/70 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyber/60" /></div>
          <div className="flex flex-wrap gap-1.5">{categories.map((c) => <button key={c} onClick={() => setCategory(c)} className={cn("rounded-md border px-2.5 py-1.5 text-[10px] font-medium transition", category === c ? "border-sky-500/40 bg-sky-500/10 text-sky-300" : "border-line bg-ink/40 text-slate-500 hover:text-slate-300")}>{c}</button>)}</div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((img) => {
            const tag = tagFor(img.name, img.tags[0]);
            const key = `${img.name}:${tag}`;
            const isLocal = localKeys.has(key);
            const progress = pulling[key];
            const fav = favorites.includes(img.name);
            return (
              <div key={img.name} className="group flex flex-col rounded-xl border border-line bg-[#0e1522]/80 p-4 transition hover:border-slate-600/70">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border" style={{ color: img.accent, backgroundColor: `${img.accent}14`, borderColor: `${img.accent}35` }}><Box size={19} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5"><h3 className="code-font truncate text-xs font-semibold text-slate-100">{img.name}</h3>{img.official && <span className="rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-sky-300">Official</span>}</div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500"><span className="flex items-center gap-1"><Download size={10} />{formatNumber(img.pulls)}</span><span className="flex items-center gap-1"><Star size={10} className="text-amber-400" />{formatNumber(img.stars)}</span><span className="flex items-center gap-1"><HardDrive size={10} />{img.size}</span></div>
                  </div>
                  <button onClick={() => toggleFavorite(img.name)} className={cn("rounded-md p-1 transition", fav ? "text-amber-400" : "text-slate-600 hover:text-amber-400")} title="Toggle favorite"><Star size={15} fill={fav ? "currentColor" : "none"} /></button>
                </div>
                <p className="mt-3 min-h-[38px] text-[11px] leading-relaxed text-slate-400">{img.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-slate-600">Tag</span>
                  <select value={tag} onChange={(e) => setSelectedTags((s) => ({ ...s, [img.name]: e.target.value }))} className="code-font rounded-md border border-line bg-ink px-2 py-1 text-[10px] text-sky-300">{img.tags.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                  <span className="rounded-md border border-line bg-white/[0.02] px-2 py-1 text-[10px] text-slate-500">{img.category}</span>
                  {isLocal && <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-300"><Check size={11} /> cached</span>}
                </div>
                {progress !== undefined && (
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-[10px] text-slate-400"><span className="code-font">Pulling {tag}…</span><span className="code-font text-sky-300">{progress}%</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-cyber to-electric transition-all duration-300" style={{ width: `${progress}%` }} /></div>
                  </div>
                )}
                <div className="mt-auto flex gap-2 pt-4">
                  <Button size="sm" variant="outline" className="flex-1" disabled={progress !== undefined} onClick={() => startPull(img.name, tag, img.size)}>{isLocal ? <PackageCheck size={12} /> : <Download size={12} />}{isLocal ? "Pulled" : progress !== undefined ? "Pulling…" : "Pull"}</Button>
                  <Button size="sm" variant="primary" className="flex-1" onClick={() => deploy(img.name, tag, img.size)}><Play size={11} /> Deploy</Button>
                </div>
              </div>
            );
          })}
          {!results.length && <div className="col-span-full flex flex-col items-center gap-2 py-14 text-center"><Search size={26} className="text-slate-600" /><p className="text-sm text-slate-400">No images found</p><button onClick={() => { setQuery(""); setCategory("All"); setOnlyFavorites(false); }} className="text-xs text-sky-400 hover:underline">Clear search &amp; filters</button></div>}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Local Images" subtitle="docker images · shared across all views" icon={<Layers3 size={17} />}
          actions={<Button size="sm" variant="danger" onClick={onPrune} disabled={!unusedImages.length}><Trash2 size={12} /> Prune {unusedImages.length} unused</Button>} />
        <div className="flex flex-wrap items-center gap-2 border-b border-line/70 px-5 py-3">
          <div className="relative min-w-[200px] flex-1"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={localQuery} onChange={(e) => setLocalQuery(e.target.value)} placeholder="Filter local images…" className="w-full rounded-lg border border-line bg-ink/70 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyber/60" /></div>
          <span className="flex items-center gap-1.5 text-[11px] text-amber-300"><TrendingUp size={12} /> {(reclaimedMb / 1024).toFixed(2)} GB reclaimable</span>
        </div>
        <div className="divide-y divide-line/60">
          {visibleLocal.map((img) => {
            const key = `${img.repository}:${img.tag}`;
            const unused = unusedKeys.has(key);
            return (
              <div key={img.id} className="flex flex-wrap items-center gap-3 px-5 py-3 transition hover:bg-white/[0.02]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-ink/70 text-slate-400"><Database size={15} /></div>
                <div className="min-w-0 flex-1"><p className="code-font truncate text-[11px] text-slate-200">{key}</p><p className="code-font mt-0.5 text-[10px] text-slate-600">{img.id} · {img.createdAt}</p></div>
                <span className="code-font text-[11px] text-slate-400">{img.sizeMb} MB</span>
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", unused ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300")}>{unused ? "unused" : "in use"}</span>
                <Button size="sm" variant="ghost" onClick={() => onDeploy(img.repository, img.tag)}><Play size={11} /> Run</Button>
              </div>
            );
          })}
          {!visibleLocal.length && <div className="px-5 py-10 text-center text-xs text-slate-500">No local images match. Pull one from the catalog above.</div>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 px-5 py-3 text-[10px] text-slate-600">
          <span className="flex items-center gap-1.5"><ExternalLink size={11} /> Pulled images persist while you explore other tabs.</span>
          <span className="code-font">docker image prune -a</span>
        </div>
      </Panel>
    </div>
  );
}
