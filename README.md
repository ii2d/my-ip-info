# 🌐 my-ip-info

> An open-source, high-performance IP intelligence and network connectivity diagnostic suite powered by Cloudflare Workers and Cloudflare Pages.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ii2d/my-ip-info)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Most IP lookup tools query a single remote server. **my-ip-info** cross-validates IP data across your self-hosted **Cloudflare edge backend**, public APIs (`ipify`, `ip-api.com`, `icanhazip.com`), and browser **WebRTC STUN candidates** to detect VPN/proxy leaks, diagnose coordinate variations across geolocation databases, and measure real-time latency.

- 🌐 **Live Web Dashboard**: [https://my-ip-info.ii2d.com](https://my-ip-info.ii2d.com)
- ⚡ **Live Worker API**: [https://my-ip-info.padghjgfdf.workers.dev/api/v1/info](https://my-ip-info.padghjgfdf.workers.dev/api/v1/info)

---

## ✨ Features

- ⚡ **Zero-Latency Edge Intelligence**: Powered by Cloudflare Workers. Automatically extracts city, region, coordinates, ASN (`AS6327`), ISP organization, and airport datacenter code (`colo`) directly from the edge TLS connection with no external database required.
- 🗺️ **Geolocation Convergence Map**: Interactive dark Leaflet map plotting coordinates reported by each provider to visualize database discrepancies.
- 🛡️ **WebRTC & STUN Leak Inspector**: Queries browser STUN ICE candidates to expose local network interfaces (LAN) and detect VPN/proxy bypasses.
- ⏱️ **Latency & Network Benchmark**: Measures round-trip time (RTT) to global Anycast edge nodes.
- 💻 **CLI & cURL Friendly**: Direct terminal support via versioned `/api/v1` routes:
  ```bash
  curl https://your-worker.workers.dev/api/v1/ip              # Plaintext IP
  curl -4 https://your-worker.workers.dev/api/v1/ip           # Force IPv4
  curl -6 https://your-worker.workers.dev/api/v1/ip           # Force IPv6
  curl https://your-worker.workers.dev/api/v1/info            # Terminal formatted diagnostic overview
  curl -H "Accept: application/json" https://your-worker.workers.dev/api/v1/info  # Full JSON intelligence
  curl https://your-worker.workers.dev/api/v1/geo             # Dedicated Geo info
  curl https://your-worker.workers.dev/api/v1/yaml            # Dedicated YAML output
  ```
- 🚀 **Automated Endpoint Sync**: Deploys backend services and automatically synchronizes assigned URLs into `apps/web/.env.local` without manual copy-pasting.

---

## 📁 Repository Structure

```text
my-ip-info/
├── apps/
│   ├── web/                    # Vite + React frontend dashboard
│   ├── server-cloudflare/      # Cloudflare Worker edge backend
│   └── server-node/            # Standalone Node/Bun/Docker server
├── packages/
│   └── core/                   # Shared types, IP parser, Bogon detector & Hono app
└── scripts/
    ├── deploy.mjs              # Unified Cloudflare Worker & Pages deployer with auto-sync
    └── destroy.mjs             # Safe teardown utility for Worker & Pages
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Run Locally

```bash
# Start the web dashboard (http://localhost:5173)
pnpm dev

# In another terminal, run standalone Node backend (optional)
pnpm --filter @my-ip/server-node dev
```

---

## ☁️ Deployment Guide

Copy `.env.example` to `.env` to configure optional account IDs or custom domains:

```bash
cp .env.example .env
```

### 1. One-Command Full Stack Deployment

Deploy the Worker API, automatically synchronize its live URL to the web dashboard, and deploy the React frontend to Cloudflare Pages:

```bash
pnpm deploy
```

### 2. Individual Deployments

```bash
pnpm deploy:api    # Deploy Cloudflare Worker API & sync live URL to web
pnpm deploy:web    # Build & deploy React dashboard to Cloudflare Pages
```

### 3. Custom Domain Configuration (Code-as-Config)

To bind your own domain without touching git-tracked files or using Terraform/Pulumi:

In your local `.env` (git-ignored):
```ini
# Custom domain for the Web Dashboard (e.g. ip.yourdomain.com)
CLOUDFLARE_PAGES_DOMAIN=ip.yourdomain.com

# Optional: Custom domain for the Worker API (e.g. api.yourdomain.com)
# CLOUDFLARE_WORKER_DOMAIN=api.yourdomain.com
```

When you run `pnpm deploy` (or `pnpm deploy:web`), the script automatically registers the domain and provisions universal SSL certificates.

---

## 🗑️ Teardown & Destruction Guide

Cleanly delete deployed Cloudflare services and reset your local frontend endpoints:

```bash
# Interactively select and destroy all deployed Cloudflare services
pnpm destroy

# Or destroy specific services
pnpm destroy:api   # Delete Cloudflare Worker API
pnpm destroy:web   # Delete Cloudflare Pages Web Project

# Non-interactive / CI teardown
pnpm destroy -- --force
```

---

## 📡 API Reference

All backend API routes are versioned under `/api/v1`:

| Route | Method | Content-Type | Description |
| :--- | :---: | :--- | :--- |
| `/api/v1/info` | `GET` | `text/plain` or `application/json` | Smart content negotiation: returns plaintext for CLI tools (`curl`, `wget`, `httpie`) or JSON for browsers & apps |
| `/api/v1/ip` | `GET` | `text/plain; charset=utf-8` | Returns the raw public client IP address with a trailing newline |
| `/api/v1/geo` | `GET` | `application/json` | Geolocation data (city, region, country, lat/lon, ASN, datacenter colo) |
| `/api/v1/yaml` | `GET` | `text/yaml; charset=utf-8` | Client metadata and network details formatted as clean YAML |
| `/api/v1/health`| `GET` | `application/json` | Health check endpoint returning status and provider identifier |

---

## 📄 License

MIT License. Contributions and PRs welcome!
