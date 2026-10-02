# Local Self-Hosted Observability & Monitoring Engine

This guide details the 100% local, self-hosted observability, metrics collection, and live tracing architecture implemented inside **Gina AI Factory**. It requires **zero external cloud services** and is designed specifically for local AI environments.

---

## 1. SigNoz vs. Lightweight Prometheus + Grafana Architecture

### Why not SigNoz Community Edition for Local AI?
- **SigNoz Community Edition** is a great full-stack APM, but it requires **ClickHouse**, **Zookeeper/Keeper**, and an **OTel Collector daemon**. On a single local development machine with an NVIDIA RTX 3070 Ti (8GB) and 32GB RAM, running ClickHouse + Zookeeper consumes **4GB–8GB of system RAM** and background CPU cycles that directly compete with your local LLMs (Qwen 2.5-VL / Qwen Coder) and ComfyUI.
- **Built-in Native Engine + Prometheus/Grafana**:
  1. **Zero-VRAM / Minimal RAM footprint**: Gina's native Observability Engine runs directly inside the Node.js process using Node's high-speed in-memory ring buffer and built-in `node:sqlite` (`DatabaseSync`). It uses less than **25MB of RAM** and **0MB VRAM**.
  2. **Native Prometheus Scrape Endpoint**: Serves standard Prometheus metrics format directly on `/metrics`.
  3. **Real-time Live Tool & Code Traces**: Captures file reads, code edits, terminal commands, test validations, and LLM token rates in real time.
  4. **Optional Containerized Docker Stack**: For long-term historical metrics visualization, spin up the included `docker-compose.observability.yml` running Prometheus and Grafana on port 3001 with persistent volume mapping.

---

## 2. Dependencies & Prerequisites

### Required for Built-in Native Observability:
- **Node.js 22+**: Built-in `node:sqlite` provides zero-dependency SQLite persistence for audit logs and trace history.
- **Vite & React 19**: Interactive in-dashboard Observability Studio and Claude-style streaming chat.
- **Recharts / D3**: Embedded latency, TPS, and VRAM telemetry graphs.

### Optional for Docker Containerized Prometheus & Grafana:
- **Docker Desktop** (or Docker Engine on Linux)
- **Docker Compose v2**

---

## 3. Quickstart: Launching the Local Observability Stack

### Step 1: Start Gina AI Factory
```bash
# Gina automatically runs the metrics server on port 3000 / 3200
npm run dev
```

### Step 2: (Optional) Launch Local Prometheus & Grafana
```bash
docker compose -f docker-compose.observability.yml up -d
```
- **Prometheus UI**: `http://localhost:9090`
- **Grafana Dashboard**: `http://localhost:3001` (User: `admin` / Password: `gina_local_admin`)
- **Metrics Endpoint**: `http://localhost:3000/metrics`

---

## 4. Key Endpoints & REST API Documentation

| Endpoint | Method | Description |
|---|---|---|
| `/metrics` | `GET` | Standard Prometheus metrics exposition (QPS, Latencies, VRAM, RAM, Token TPS) |
| `/api/observability/metrics` | `GET` | Real-time JSON telemetry snapshot with anomaly status |
| `/api/observability/traces` | `GET` | Real-time agent execution traces (code snippets, commands, file operations) |
| `/api/observability/audit` | `GET` | Comprehensive system audit logs with actor, role, IP, and status |
| `/api/observability/audit/export` | `GET` | Export audit logs as CSV or JSON for compliance |
| `/api/observability/alerts` | `GET/POST`| View and update custom anomaly thresholds (VRAM, latency, error rates) |
| `/api/observability/backup` | `POST` | Automated configuration & database snapshot creation |
| `/api/docs` | `GET` | Embedded OpenAPI / Swagger interactive documentation |

---

## 5. Security, RBAC & Data Integrity
- **Role-Based Access Control (RBAC)**: Supports `admin`, `auditor`, and `viewer` roles.
- **Threat Detection**: Automated detection of directory traversal and remote command injection patterns.
- **Audit Logging**: Immutable local SQLite database records all actions and access attempts.
- **Data Retention & Archival**: Automatic archival of logs older than 30 days to JSON archives.
