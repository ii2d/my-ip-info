# 🌐 my-ip-info

> An open-source, multi-source IP intelligence and network connectivity diagnostic suite.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/donilan/my-ip-info)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Most IP tools check a single server. **my-ip-info** queries **multiple cloud backends, public APIs, and browser STUN candidates concurrently** to cross-validate IP addresses, detect VPN / proxy routing leaks, identify coordinate discrepancies across geolocation databases, and measure multi-cloud latency.

---

## ✨ Features

- ⚡ **Multi-Source Cross-Validation**: Compares results simultaneously across:
  - Self-hosted Cloudflare Workers, Firebase Functions, and AWS Lambda
  - Public APIs (`ipify` v4/v6, `ip-api.com`, `icanhazip.com`, etc.)
  - Custom user-defined API endpoints
- 🗺️ **Geolocation Convergence Map**: Interactive dark Leaflet map plotting coordinates reported by each provider to visualize database discrepancies.
- 🛡️ **WebRTC & STUN Leak Inspector**: Queries browser STUN ICE candidates to expose local network interfaces (LAN) and detect VPN/proxy bypasses.
- ⏱️ **Latency & Network Benchmark**: Measures round-trip time (RTT) to edge Anycast vs regional cloud functions.
- 💻 **CLI & cURL Friendly**: Direct terminal support:
  ```bash
  curl https://your-domain.com/ip       # Plaintext IP
  curl -4 https://your-domain.com/ip    # Force IPv4
  curl -6 https://your-domain.com/ip    # Force IPv6
  curl https://your-domain.com/json     # Full JSON
  ```
- 🚀 **Automated Endpoint Sync**: Deploys serverless backends and automatically updates frontend environment variables with zero manual copy-pasting.

---

## 📁 Repository Structure

```text
my-ip-info/
├── apps/
│   ├── web/                    # Modern Vite + React frontend dashboard
│   ├── server-cloudflare/      # Cloudflare Worker deployment
│   ├── server-firebase/        # Firebase Functions v2 HTTP deployment
│   ├── server-lambda/          # AWS Lambda handler
│   └── server-node/            # Standalone Node/Bun/Docker server
├── packages/
│   └── core/                   # Shared types, IP parser, Bogon detector & Hono app
└── scripts/
    └── deploy-and-sync.mjs     # Multi-cloud deployer & endpoint sync utility
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Run Locally

```bash
# Start frontend dashboard
pnpm dev

# In another terminal, run standalone Node backend (optional)
pnpm --filter @my-ip/server-node dev
```

Visit `http://localhost:5173` in your browser.

---

## ☁️ Deployment Guide

### Option 1: Cloudflare Worker (1-Click or CLI)

Click the button below to deploy directly in your browser:

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/donilan/my-ip-info)

Or deploy via terminal:
```bash
pnpm deploy:cloudflare
```

### Option 2: Firebase Functions v2

```bash
pnpm deploy:firebase
```

### Option 3: Automated Multi-Cloud Deploy & Frontend Sync

Run our built-in deployment script to deploy all targets and automatically write the assigned URLs into `apps/web/.env.local`:

```bash
pnpm deploy:all
```

---

## 📄 License

MIT License. Contributions and PRs welcome!
