import type { ComposeService, ValidationIssue } from "../types";

export interface ParsedCompose {
  services: ComposeService[];
  volumes: string[];
  networks: string[];
  issues: ValidationIssue[];
  topLevel: string[];
}

const indentOf = (line: string) => line.match(/^\s*/)?.[0].length ?? 0;
const stripQuotes = (s: string) => s.trim().replace(/^["']|["']$/g, "");

export function parseCompose(yaml: string): ParsedCompose {
  const lines = yaml.split("\n");
  const services: ComposeService[] = [];
  const volumes: string[] = [];
  const networks: string[] = [];
  const issues: ValidationIssue[] = [];
  const topLevel: string[] = [];

  let section: "root" | "services" | "volumes" | "networks" | "other" = "root";
  let serviceIndent = -1;
  let current: ComposeService | null = null;
  let currentProp = "";
  const seenNames = new Set<string>();

  lines.forEach((raw, idx) => {
    const lineNo = idx + 1;
    const line = raw.replace(/\r$/, "");
    if (/\t/.test(line)) {
      issues.push({ line: lineNo, level: "error", message: "Tab character found — YAML requires spaces for indentation." });
    }
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const indent = indentOf(line);

    if (indent === 0) {
      current = null;
      currentProp = "";
      const keyMatch = trimmed.match(/^([\w.-]+)\s*:\s*(.*)$/);
      if (!keyMatch) {
        issues.push({ line: lineNo, level: "error", message: `Invalid top-level statement: "${trimmed.slice(0, 40)}"` });
        return;
      }
      const [, key, value] = keyMatch;
      topLevel.push(key);
      if (key === "services" && !value) section = "services";
      else if (key === "volumes" && !value) section = "volumes";
      else if (key === "networks" && !value) section = "networks";
      else section = "other";
      if (key === "version") issues.push({ line: lineNo, level: "warning", message: "The obsolete `version` attribute is ignored by Compose V2." });
      serviceIndent = -1;
      return;
    }

    if (section === "volumes" || section === "networks") {
      const decl = trimmed.match(/^([\w.-]+)\s*:\s*(.*)$/);
      if (decl && indent <= 2) {
        (section === "volumes" ? volumes : networks).push(decl[1]);
      }
      return;
    }

    if (section !== "services") return;

    if (serviceIndent < 0) serviceIndent = indent;
    if (indent === serviceIndent) {
      const keyMatch = trimmed.match(/^([\w.-]+)\s*:\s*(.*)$/);
      if (!keyMatch || keyMatch[2]) {
        issues.push({ line: lineNo, level: "warning", message: `Unexpected content in services block: "${trimmed.slice(0, 40)}"` });
        return;
      }
      const name = keyMatch[1];
      if (seenNames.has(name)) issues.push({ line: lineNo, level: "error", message: `Duplicate service name "${name}".` });
      seenNames.add(name);
      current = { name, line: lineNo, ports: [], volumes: [], dependsOn: [], networks: [], environment: [] };
      services.push(current);
      currentProp = "";
      return;
    }

    if (!current) return;

    if (trimmed.startsWith("- ")) {
      const value = stripQuotes(trimmed.slice(2));
      switch (currentProp) {
        case "ports": current.ports.push(value); break;
        case "volumes": current.volumes.push(value); break;
        case "depends_on": current.dependsOn.push(value); break;
        case "networks": current.networks.push(value); break;
        case "environment": current.environment.push(value); break;
        case "expose": current.ports.push(`${value} (expose)`); break;
      }
      if (currentProp === "ports" && !/^\d+(:\d+)?(\/(tcp|udp))?$/.test(value)) {
        issues.push({ line: lineNo, level: "warning", message: `Port "${value}" should look like "HOST:CONTAINER" (e.g. 8080:80).` });
      }
      return;
    }

    const prop = trimmed.match(/^([\w.-]+)\s*:\s*(.*)$/);
    if (!prop) return;
    const [, key, rawValue] = prop;
    const value = stripQuotes(rawValue);

    // Nested mapping entries (environment as map, build context, deploy, healthcheck...)
    if (indent > serviceIndent + 2 && value && currentProp === "environment") {
      current.environment.push(`${key}=${value}`);
      return;
    }
    if (indent > serviceIndent + 2 && currentProp === "build" && key === "context") {
      current.build = value;
      return;
    }

    currentProp = key;
    switch (key) {
      case "image": current.image = value; break;
      case "build": current.build = value || "."; break;
      case "container_name": current.containerName = value; break;
      case "restart": current.restart = value; break;
      case "command": current.command = value; break;
      case "networks": if (value) current.networks.push(value); break;
      case "ports": if (value) current.ports.push(value); break;
      case "volumes": if (value) current.volumes.push(value); break;
      case "depends_on": if (value) current.dependsOn.push(value); break;
      case "environment": if (value) current.environment.push(value); break;
    }
  });

  // Semantic validation
  if (!topLevel.includes("services")) {
    issues.push({ line: 1, level: "error", message: "Missing top-level `services:` mapping. A compose file must define at least one service." });
  } else if (services.length === 0) {
    issues.push({ line: lines.findIndex((l) => l.startsWith("services:")) + 1 || 1, level: "error", message: "No services defined under `services:`." });
  }

  const names = new Set(services.map((s) => s.name));
  services.forEach((s) => {
    if (!s.image && !s.build) issues.push({ line: s.line, level: "error", message: `Service "${s.name}" needs an \`image\` or \`build\` instruction.` });
    if (s.image && s.image.endsWith(":latest")) issues.push({ line: s.line, level: "warning", message: `Service "${s.name}" uses a floating :latest tag — pin a version for reproducibility.` });
    if (!s.restart) issues.push({ line: s.line, level: "info", message: `Service "${s.name}" has no restart policy (defaults to "no").` });
    s.dependsOn.forEach((dep) => {
      if (!names.has(dep)) issues.push({ line: s.line, level: "error", message: `Service "${s.name}" depends on unknown service "${dep}".` });
    });
    s.networks.forEach((net) => {
      if (net && !networks.includes(net)) issues.push({ line: s.line, level: "warning", message: `Network "${net}" used by "${s.name}" is not declared under networks:.` });
    });
    s.volumes.forEach((vol) => {
      const source = vol.split(":")[0];
      if (source && !source.startsWith(".") && !source.startsWith("/") && !source.startsWith("~") && !volumes.includes(source)) {
        issues.push({ line: s.line, level: "warning", message: `Named volume "${source}" is not declared under volumes:.` });
      }
    });
  });

  lines.forEach((line, idx) => {
    if (/privileged\s*:\s*true/i.test(line)) issues.push({ line: idx + 1, level: "warning", message: "Privileged mode grants full host access — avoid in production." });
  });

  const order = { error: 0, warning: 1, info: 2 } as const;
  issues.sort((a, b) => order[a.level] - order[b.level] || a.line - b.line);
  return { services, volumes, networks, issues, topLevel };
}

export function dependencyDepth(services: ComposeService[]): Record<string, number> {
  const map = new Map(services.map((s) => [s.name, s]));
  const result: Record<string, number> = {};
  const visiting = new Set<string>();
  const depth = (name: string): number => {
    if (result[name] !== undefined) return result[name];
    if (visiting.has(name)) return 0; // cycle guard
    visiting.add(name);
    const deps = map.get(name)?.dependsOn ?? [];
    const d = deps.length ? 1 + Math.max(...deps.map((x) => depth(x))) : 0;
    visiting.delete(name);
    result[name] = d;
    return d;
  };
  services.forEach((s) => depth(s.name));
  return result;
}
