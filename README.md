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

### Provider Comparison

| Provider | Geolocation & ASN | Latency | Free Tier Policy | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Cloudflare Workers** (⭐ **Recommended**) | **Built-in** (City, Region, Lat/Lon, ASN, ISP, Colo) | **< 15ms** (Global Anycast) | 100k req/day free (No credit card required) | ✅ **Fully Tested & Verified** |
| **AWS Lambda** | IP & Headers only (Requires external DB for Geo) | ~50–200ms (Regional + cold start) | 1M req/mo free (AWS account required) | ✅ **Fully Tested & Verified** |
| **Firebase Functions v2** | IP & Headers only | ~200–800ms | Requires **Blaze (Pay-as-you-go)** plan | ⚠️ **Not Yet Tested** |

---

### ⭐ Option 1: Cloudflare Workers (Recommended)

> [!TIP]
> **Why Cloudflare Workers is the recommended backend:**
> 1. **Zero-Latency GeoIP & ASN**: Cloudflare's edge proxy automatically enriches `request.cf` with accurate coordinates, city, region, ASN (`AS6327`), ISP organization, and airport datacenter code (`colo: "YVR"`). No external GeoIP database or paid API keys needed!
> 2. **Edge Performance**: Routed instantly to the nearest physical city across 300+ global edge locations without cold start delays.
> 3. **No Credit Card Required**: Generous free tier (100,000 requests/day).

Click the button below to deploy directly via your browser:

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/donilan/my-ip-info)

Or deploy via terminal:
```bash
pnpm deploy:cloudflare
```

---

### Option 2: AWS Lambda (Function URLs)

Deploy as a standalone AWS Lambda function with a public, CORS-enabled Lambda Function URL:

```bash
pnpm deploy:lambda
```
*Requires AWS CLI configured with credentials (`AWS_PROFILE` in `.env`).*

---

### Option 3: Firebase Functions v2

> [!WARNING]
> **Maintainer Notice:** Firebase deployment has **not been tested yet**. 
> Note that Google Cloud requires the project to be upgraded to the **Blaze (pay-as-you-go) plan** to enable the required Cloud Build and Artifact Registry APIs. It cannot be deployed on the free Spark plan. Community testing, verification, and PRs are welcome!

```bash
pnpm deploy:firebase
```

---

### Option 4: Automated Multi-Cloud Deploy & Frontend Sync

Run our built-in deployment script to deploy all configured targets and automatically write the assigned live URLs into `apps/web/.env.local`:

```bash
pnpm deploy:all
```

---

## 🗑️ Teardown & Destruction Guide

Tear down deployed serverless services and automatically clean up `apps/web/.env.local`:

```bash
# Destroy all deployed services (interactive confirmation prompt)
pnpm destroy:all

# Or destroy specific providers
pnpm destroy:cloudflare
pnpm destroy:lambda
pnpm destroy:firebase

# Non-interactive / CI teardown
pnpm destroy:all -- --force
```

---

## 📄 License

MIT License. Contributions and PRs welcome!
