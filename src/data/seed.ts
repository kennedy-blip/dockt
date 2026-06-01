import type { Container, LocalImage, RegistryImage } from "../types";

export const initialContainers: Container[] = [
  {
    id: "a1b2c3d4e5f6",
    name: "dp-postgres",
    image: "postgres:15-alpine",
    status: "running",
    ports: ["5432:5432"],
    cpu: 18.4,
    memory: 412,
    memLimit: 1024,
    uptime: 273420,
    network: "dp-backend",
    restartPolicy: "unless-stopped",
    health: "healthy",
    volumes: ["pgdata:/var/lib/postgresql/data"],
    env: { POSTGRES_DB: "app", POSTGRES_USER: "app", PGDATA: "/var/lib/postgresql/data/pgdata" },
    logs: [
      "2026-05-14 09:12:03.421 UTC [1] LOG:  starting PostgreSQL 15.6 on x86_64-pc-linux-musl",
      "2026-05-14 09:12:03.558 UTC [1] LOG:  listening on IPv4 address \"0.0.0.0\", port 5432",
      "2026-05-14 09:12:04.102 UTC [1] LOG:  database system is ready to accept connections",
    ],
    icon: "database",
    accent: "#38bdf8",
  },
  {
    id: "b2c3d4e5f607",
    name: "dp-redis-cache",
    image: "redis:alpine",
    status: "running",
    ports: ["6379:6379"],
    cpu: 7.2,
    memory: 96,
    memLimit: 512,
    uptime: 273380,
    network: "dp-backend",
    restartPolicy: "unless-stopped",
    health: "healthy",
    volumes: ["redisdata:/data"],
    env: { REDIS_ARGS: "--appendonly yes" },
    logs: [
      "1:C 14 May 2026 09:12:05.112 * Redis version=7.2.4, bits=64",
      "1:M 14 May 2026 09:12:05.114 * Running mode=standalone, port=6379.",
      "1:M 14 May 2026 09:12:05.116 * Ready to accept connections tcp",
    ],
    icon: "zap",
    accent: "#fb7185",
  },
  {
    id: "c3d4e5f60718",
    name: "nginx-proxy",
    image: "nginx:1.25-alpine",
    status: "running",
    ports: ["8080:80", "8443:443"],
    cpu: 4.8,
    memory: 42,
    memLimit: 256,
    uptime: 198750,
    network: "dp-frontend",
    restartPolicy: "always",
    health: "healthy",
    volumes: ["./nginx.conf:/etc/nginx/nginx.conf:ro"],
    env: { NGINX_ENTRYPOINT_QUIET_LOGS: "1" },
    logs: [
      "2026/05/14 09:14:02 [notice] 1#1: nginx/1.25.4",
      "2026/05/14 09:14:02 [notice] 1#1: start worker processes",
      "10.0.0.4 - - [14/May/2026:09:15:11 +0000] \"GET /health HTTP/1.1\" 200 12",
    ],
    icon: "globe",
    accent: "#34d399",
  },
  {
    id: "d4e5f6071829",
    name: "api-backend",
    image: "node:20-alpine",
    status: "running",
    ports: ["3000:3000"],
    cpu: 46.7,
    memory: 318,
    memLimit: 768,
    uptime: 198690,
    network: "dp-backend",
    restartPolicy: "unless-stopped",
    health: "healthy",
    volumes: ["./src:/app/src:ro"],
    env: { NODE_ENV: "production", PORT: "3000", LOG_LEVEL: "info" },
    logs: [
      "{\"level\":\"info\",\"msg\":\"server listening\",\"port\":3000}",
      "{\"level\":\"info\",\"msg\":\"connected to postgres\",\"pool\":10}",
      "{\"level\":\"info\",\"msg\":\"GET /api/v1/health 200 4ms\"}",
    ],
    icon: "server",
    accent: "#818cf8",
  },
  {
    id: "e5f60718293a",
    name: "queue-worker",
    image: "python:3.11-slim",
    status: "restarting",
    ports: ["—"],
    cpu: 63.1,
    memory: 184,
    memLimit: 512,
    uptime: 12,
    network: "dp-backend",
    restartPolicy: "on-failure",
    health: "degraded",
    volumes: ["worker-data:/var/lib/worker"],
    env: { PYTHONUNBUFFERED: "1", CELERY_BROKER: "redis://redis:6379/0" },
    logs: [
      "[2026-05-14 09:31:44] WARNING connection to broker lost, retrying...",
      "[2026-05-14 09:31:45] ERROR worker exited with code 1",
      "[2026-05-14 09:31:45] INFO restart policy on-failure triggered",
    ],
    icon: "cog",
    accent: "#fbbf24",
  },
  {
    id: "f60718293a4b",
    name: "metrics-agent",
    image: "prom/prometheus:latest",
    status: "stopped",
    ports: ["9090:9090"],
    cpu: 0,
    memory: 0,
    memLimit: 512,
    uptime: 0,
    network: "dp-monitoring",
    restartPolicy: "no",
    health: "none",
    volumes: ["promdata:/prometheus"],
    env: { TSDB_RETENTION: "15d" },
    logs: [
      "ts=2026-05-13T22:01:09Z caller=main.go:540 msg=\"Stopping Prometheus\"",
      "ts=2026-05-13T22:01:09Z caller=main.go:552 msg=\"See you next time!\"",
    ],
    icon: "activity",
    accent: "#a78bfa",
  },
];

export const registryImages: RegistryImage[] = [
  { name: "nginx", description: "High performance HTTP server, reverse proxy and load balancer.", pulls: 2_400_000_000, stars: 19800, official: true, verified: true, category: "Web", tags: ["1.25-alpine", "latest", "1.27", "stable-alpine"], accent: "#34d399", size: "18 MB" },
  { name: "postgres", description: "The world's most advanced open source relational database.", pulls: 1_600_000_000, stars: 13200, official: true, verified: true, category: "Database", tags: ["15-alpine", "16-alpine", "latest"], accent: "#38bdf8", size: "82 MB" },
  { name: "redis", description: "In-memory data structure store used as cache, broker and database.", pulls: 1_400_000_000, stars: 12600, official: true, verified: true, category: "Database", tags: ["alpine", "7-alpine", "latest"], accent: "#fb7185", size: "12 MB" },
  { name: "node", description: "Node.js JavaScript runtime built on Chrome's V8 engine.", pulls: 1_100_000_000, stars: 12100, official: true, verified: true, category: "Runtime", tags: ["20-alpine", "20-bookworm-slim", "latest"], accent: "#84cc16", size: "47 MB" },
  { name: "python", description: "Python programming language runtime for scripts and services.", pulls: 1_050_000_000, stars: 10800, official: true, verified: true, category: "Runtime", tags: ["3.11-slim", "3.12-alpine", "latest"], accent: "#fbbf24", size: "45 MB" },
  { name: "mongo", description: "Document-oriented NoSQL database for flexible, scalable apps.", pulls: 680_000_000, stars: 8900, official: true, verified: true, category: "Database", tags: ["7", "6", "latest"], accent: "#4ade80", size: "236 MB" },
  { name: "traefik", description: "Cloud-native edge router with automatic service discovery.", pulls: 420_000_000, stars: 5400, official: false, verified: true, category: "Web", tags: ["v3.0", "v2.11", "latest"], accent: "#22d3ee", size: "42 MB" },
  { name: "rabbitmq", description: "Open source message broker implementing AMQP and more.", pulls: 390_000_000, stars: 4700, official: true, verified: true, category: "Queue", tags: ["3-management-alpine", "latest"], accent: "#fb923c", size: "88 MB" },
  { name: "alpine", description: "Minimal Docker image based on Alpine Linux, only 5 MB.", pulls: 980_000_000, stars: 10100, official: true, verified: true, category: "Base OS", tags: ["3.19", "latest", "edge"], accent: "#94a3b8", size: "5 MB" },
  { name: "mysql", description: "Popular open source relational database management system.", pulls: 860_000_000, stars: 9600, official: true, verified: true, category: "Database", tags: ["8.0", "8.4", "latest"], accent: "#60a5fa", size: "152 MB" },
  { name: "grafana/grafana", description: "Observability platform for dashboards, metrics and alerts.", pulls: 310_000_000, stars: 3900, official: false, verified: true, category: "Monitoring", tags: ["10.4", "latest"], accent: "#f97316", size: "120 MB" },
  { name: "prom/prometheus", description: "Systems monitoring and alerting toolkit with time-series DB.", pulls: 290_000_000, stars: 3600, official: false, verified: true, category: "Monitoring", tags: ["v2.51", "latest"], accent: "#f43f5e", size: "94 MB" },
  { name: "rust", description: "Rust toolchain for building fast, memory-safe binaries.", pulls: 180_000_000, stars: 2800, official: true, verified: true, category: "Runtime", tags: ["1.76-slim", "1.77-alpine", "latest"], accent: "#c084fc", size: "210 MB" },
  { name: "httpd", description: "Apache HTTP Server, the classic battle-tested web server.", pulls: 470_000_000, stars: 4200, official: true, verified: true, category: "Web", tags: ["2.4-alpine", "latest"], accent: "#a78bfa", size: "54 MB" },
  { name: "elasticsearch", description: "Distributed search and analytics engine for all data types.", pulls: 260_000_000, stars: 5100, official: true, verified: true, category: "Search", tags: ["8.13.4", "7.17.21"], accent: "#facc15", size: "580 MB" },
  { name: "busybox", description: "Tiny utilities in a single executable, ideal for debugging.", pulls: 720_000_000, stars: 2900, official: true, verified: true, category: "Base OS", tags: ["1.36", "latest", "musl"], accent: "#94a3b8", size: "2 MB" },
];

export const initialLocalImages: LocalImage[] = [
  { id: "sha256:1f4a9c02", repository: "postgres", tag: "15-alpine", sizeMb: 82, createdAt: "3 days ago" },
  { id: "sha256:2e8b7d14", repository: "redis", tag: "alpine", sizeMb: 12, createdAt: "3 days ago" },
  { id: "sha256:3c6d1e90", repository: "nginx", tag: "1.25-alpine", sizeMb: 18, createdAt: "2 days ago" },
  { id: "sha256:4a9f0b33", repository: "node", tag: "20-alpine", sizeMb: 47, createdAt: "2 days ago" },
  { id: "sha256:5b2c8a71", repository: "python", tag: "3.11-slim", sizeMb: 45, createdAt: "5 days ago" },
  { id: "sha256:6d7e4f22", repository: "prom/prometheus", tag: "latest", sizeMb: 94, createdAt: "1 week ago" },
  { id: "sha256:7e1d6b05", repository: "alpine", tag: "3.19", sizeMb: 5, createdAt: "2 weeks ago" },
  { id: "sha256:8f3a2c47", repository: "mongo", tag: "6", sizeMb: 224, createdAt: "3 weeks ago" },
];

export const defaultCompose = `name: dockerpulse-stack
# DockerPulse sample stack — edit me and watch the topology update

services:
  nginx-proxy:
    image: nginx:1.25-alpine
    container_name: dp-proxy
    ports:
      - "8080:80"
      - "8443:443"
    depends_on:
      - api-backend
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - frontend
    restart: unless-stopped

  api-backend:
    image: node:20-alpine
    container_name: dp-api
    command: npm run start
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://app@postgres:5432/app
    depends_on:
      - postgres
      - redis
    networks:
      - frontend
      - backend
    restart: unless-stopped

  worker:
    image: python:3.11-slim
    command: python worker.py
    depends_on:
      - redis
      - postgres
    networks:
      - backend
    restart: on-failure

  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=app
      - POSTGRES_USER=app
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - backend
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    networks:
      - backend
    restart: unless-stopped

volumes:
  pgdata:
  redisdata:

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
`;

export const composePresets: Record<string, string> = {
  "Default Stack": defaultCompose,
  "Minimal Web App": `name: minimal-web

services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    networks:
      - edge
    restart: always

networks:
  edge:
    driver: bridge
`,
  "MEAN Stack": `name: mean-stack

services:
  proxy:
    image: nginx:alpine
    ports:
      - "80:80"
    depends_on:
      - express
    networks:
      - edge

  express:
    image: node:20-alpine
    command: node server.js
    ports:
      - "3000:3000"
    environment:
      - MONGO_URI=mongodb://mongo:27017/app
    depends_on:
      - mongo
    networks:
      - edge
      - data
    restart: unless-stopped

  mongo:
    image: mongo:7
    volumes:
      - mongodata:/data/db
    networks:
      - data
    restart: unless-stopped

volumes:
  mongodata:

networks:
  edge:
    driver: bridge
  data:
    driver: bridge
`,
};

export interface BaseImageOption {
  id: string;
  label: string;
  language: string;
  image: string;
  variants: string[];
  manifest: string;
  install: string;
  build: string;
  start: string;
  accent: string;
  description: string;
}

export const baseImages: BaseImageOption[] = [
  {
    id: "node",
    label: "Node.js 20",
    language: "JavaScript / TypeScript",
    image: "node:20-alpine",
    variants: ["node:20-alpine", "node:20-bookworm-slim", "node:20", "node:22-alpine"],
    manifest: "package*.json",
    install: "npm ci --omit=dev",
    build: "npm run build",
    start: '["node", "dist/server.js"]',
    accent: "#84cc16",
    description: "V8 runtime with npm, ideal for APIs and SSR apps.",
  },
  {
    id: "python",
    label: "Python 3.11",
    language: "Python",
    image: "python:3.11-slim",
    variants: ["python:3.11-slim", "python:3.11-alpine", "python:3.12-slim"],
    manifest: "requirements.txt",
    install: "pip install --no-cache-dir -r requirements.txt",
    build: "python -m compileall .",
    start: '["python", "app.py"]',
    accent: "#fbbf24",
    description: "Slim Debian-based interpreter for services and workers.",
  },
  {
    id: "rust",
    label: "Rust-slim",
    language: "Rust",
    image: "rust:1.76-slim",
    variants: ["rust:1.76-slim", "rust:1.77-slim", "rust:1.76-alpine"],
    manifest: "Cargo.toml Cargo.lock",
    install: "cargo fetch",
    build: "cargo build --release",
    start: '["./target/release/app"]',
    accent: "#c084fc",
    description: "Compiled, memory-safe binaries with tiny final runtime.",
  },
  {
    id: "go",
    label: "Go 1.22",
    language: "Go",
    image: "golang:1.22-alpine",
    variants: ["golang:1.22-alpine", "golang:1.22-bookworm"],
    manifest: "go.mod go.sum",
    install: "go mod download",
    build: "go build -o /app/server .",
    start: '["/app/server"]',
    accent: "#22d3ee",
    description: "Statically linked services with fast compile times.",
  },
];

export const logTemplates: Record<string, string[]> = {
  database: ["LOG:  checkpoint starting: time", "LOG:  checkpoint complete: wrote 42 buffers", "LOG:  database system is ready to accept connections"],
  web: ['10.0.0.8 - - "GET /api/health HTTP/1.1" 200 14 "-" "healthcheck/1.0"', '10.0.0.5 - - "GET /dashboard HTTP/1.1" 200 2841'],
  api: ['{"level":"info","msg":"GET /api/v1/containers 200 8ms"}', '{"level":"debug","msg":"cache hit: fleet:summary"}'],
  default: ["heartbeat: process healthy", "scheduled task completed in 34ms", "metrics scraped: 24 series"],
};
