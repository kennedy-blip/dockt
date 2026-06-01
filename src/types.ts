export type TabId = "fleet" | "dockerfile" | "compose" | "registry";

export type ContainerStatus = "running" | "restarting" | "stopped" | "starting";

export interface Container {
  id: string;
  name: string;
  image: string;
  status: ContainerStatus;
  ports: string[];
  cpu: number;
  memory: number;
  memLimit: number;
  uptime: number;
  network: string;
  restartPolicy: string;
  health: "healthy" | "degraded" | "none";
  volumes: string[];
  env: Record<string, string>;
  logs: string[];
  icon: string;
  accent: string;
  transition?: number;
}

export interface RegistryImage {
  name: string;
  description: string;
  pulls: number;
  stars: number;
  official: boolean;
  category: string;
  tags: string[];
  accent: string;
  size: string;
  verified?: boolean;
}

export interface LocalImage {
  id: string;
  repository: string;
  tag: string;
  sizeMb: number;
  createdAt: string;
}

export interface DeployOptions {
  name?: string;
  ports?: string[];
  memLimit?: number;
  network?: string;
  restartPolicy?: string;
}

export interface Toast {
  id: number;
  title: string;
  message: string;
  tone: "success" | "info" | "error" | "warning";
}

export interface ComposeService {
  name: string;
  line: number;
  image?: string;
  build?: string;
  ports: string[];
  volumes: string[];
  dependsOn: string[];
  networks: string[];
  environment: string[];
  containerName?: string;
  restart?: string;
  command?: string;
}

export interface ValidationIssue {
  line: number;
  level: "error" | "warning" | "info";
  message: string;
}
