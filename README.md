# 🌐 my-ip-info

> A high-performance IP intelligence and network connectivity diagnostic suite built as a unified Cloudflare Worker with Static Assets.
>
> 🚀 **Website**: [https://ip.ii2d.com](https://ip.ii2d.com)

[![CI](https://github.com/ii2d/my-ip-info/actions/workflows/ci.yml/badge.svg)](https://github.com/ii2d/my-ip-info/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Hono](https://img.shields.io/badge/Hono-E36002?logo=hono&logoColor=white)](https://hono.dev)
[![React 19](https://img.shields.io/badge/React_19-20232A?logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Biome](https://img.shields.io/badge/Linter-Biome-60a5fa?logo=biome&logoColor=white)](https://biomejs.dev)

Most IP lookup tools query a single remote server. **my-ip-info** cross-validates IP data across your self-hosted **Cloudflare edge backend**, public APIs (`Cloudflare Trace`, `ipify`, `ipwho.is`, `IP.SB`, `ip.guide`, `SeeIP`, `icanhazip.com`, `IPIP.net`), and browser **WebRTC STUN candidates** to detect VPN/proxy leaks, diagnose coordinate variations across geolocation databases, and measure real-time latency.

---

## ✨ Features

- ⚡ **Unified Cloudflare Worker**: Front-end (React SPA) and Edge API (Hono) deploy together under a single origin. Static assets are served via Cloudflare's edge cache (free & unlimited quota), while API requests run on the edge.
- ⚡ **Zero-Latency Edge Intelligence**: Automatically extracts city, region, coordinates, ASN (`AS6327`), ISP organization, and airport datacenter code (`colo`) directly from the edge TLS connection without external database lookups.
- 🗺️ **Geolocation Convergence Map**: Interactive dark Leaflet map plotting coordinates reported by each provider to visualize database discrepancies.
- 🛡️ **Dual-Stack WebRTC & DNS Leak Inspector**: Interrogates STUN ICE candidates (IPv4/IPv6) and resolves one-time nonce subdomains to uncover upstream DNS resolvers and detect VPN/proxy leaks.
- 📜 **Local IP Connection History**: 100% on-device timeline tracking with automatic deduplication, manual snapshots, and safe CSV / JSON data export.
- ⚙️ **Custom Endpoints & Provider Toggles**: Enable or disable specific public providers, or register user-defined private backend endpoints in in-app settings.
- ⏱️ **Latency & Network Benchmark**: Measures round-trip time (RTT) to global Anycast edge nodes.
- 📱 **Progressive Web App (PWA)**: Installable directly from the browser on desktop and mobile with standalone window support, offline UI shell caching, and automatic refetching on network reconnect.

---

## 📱 Progressive Web App (PWA)

**my-ip-info** can be installed directly as a standalone desktop or mobile application without needing third-party app stores.

### Why Use the PWA?
- **Zero App Store Friction**: Install immediately without having to search, download, or authenticate through the Apple App Store or Google Play Store.
- **Cross-Platform Consistency**: Provides a unified, native app experience across macOS, Windows, Linux, iOS, and Android from a single shared web standard.
- **Fast App Launch & Offline Shell**: Static app shell assets (HTML, CSS, JS, fonts, and icons) are pre-cached locally using Workbox Service Workers, delivering near-instant loading even on slow or intermittent network connections.
- **Always-Fresh Network Diagnostics**: Specifically architected with strict cache-busting and API bypass rules (`navigateFallbackDenylist`) so dynamic IP and geo lookups are never served from stale caches. Real-time window focus and network reconnect listeners automatically re-probe your IP when toggling VPNs or switching Wi-Fi networks.

### How to Install & Use
- **Desktop (Chrome / Edge / Brave / Opera)**: Click the **Install** icon in the browser address bar (or navigate to menu `...` → **Install my-ip-info**). The application will launch in its own dedicated, borderless desktop window and can be pinned to your Dock or Taskbar.
- **Desktop (Safari on macOS Sonoma+)**: Go to **File** → **Add to Dock**.
- **Mobile (iOS Safari)**: Tap the **Share** button (box with an upward arrow) → scroll down and tap **Add to Home Screen**.
- **Mobile (Android Chrome)**: Tap the menu `⋮` → select **Add to Home screen** or **Install app**.

---

## 📁 Project Structure

```text
my-ip-info/
├── src/
│   ├── client/       # React SPA (components, hooks, styling)
│   ├── server/       # Cloudflare Worker entrypoint & Hono API (/api/v1/*, CLI detection)
│   └── shared/       # Shared TypeScript types and IP utilities
├── public/           # Static assets, favicon, redirects
├── test/             # Unit tests (node:test)
├── index.html        # SPA entry HTML
├── vite.config.ts    # Client build configuration
├── wrangler.toml     # Unified Cloudflare Worker configuration with [assets]
└── Dockerfile        # Standalone Node/Docker server image
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Run Locally

```bash
# Boot frontend (http://localhost:5173) and Cloudflare Worker (http://localhost:8787) concurrently
pnpm dev

# Or run services individually:
pnpm dev:client  # Vite SPA with HMR (proxies /api to :8787)
pnpm dev:worker  # Cloudflare Worker via Wrangler / workerd
pnpm dev:node    # Standalone Node.js server (:3000)
```

### 3. Testing & Code Quality

Native git pre-commit hooks (`.githooks/pre-commit`) automatically format and lint staged changes with Biome via `lint-staged`, run TypeScript typechecks, and execute unit tests prior to committing:

```bash
pnpm test           # Run 51 unit tests across core, worker pipeline, and providers
pnpm test:coverage  # Run tests with V8 code coverage report
pnpm typecheck      # Validate TypeScript types without emit
pnpm lint           # Check code against Biome rules
pnpm lint:fix       # Automatically apply Biome safe fixes
pnpm format         # Format codebase with Biome
pnpm format:check   # Verify code formatting
pnpm pre-commit     # Run pre-commit checks on staged files (lint-staged)
```

---

## ☁️ Deployment

Deploying requires **zero environment variables**:

```bash
# Build frontend and deploy unified worker
pnpm deploy
```

Wrangler will authenticate via your browser or respect your standard `CLOUDFLARE_API_TOKEN` environment variable.

### Secrets & API Keys (e.g. IP2Location)

Cloudflare Workers isolates local dev environment variables from deployed production secrets:
- **Local Development**: `wrangler dev` automatically reads `.env`.
- **Production Deployment**: `wrangler deploy` does not upload `.env`. To upload your secret directly from `.env` without manual typing:
  ```bash
  pnpm run secret:ip2location
  ```
  Secrets can also be added via the Cloudflare Dashboard (**Workers & Pages > my-ip-info > Settings > Variables and Secrets**).

### Custom Domain (Optional)

To bind a custom domain in your Cloudflare zone, uncomment the route in `wrangler.toml`:

```toml
routes = [
  { pattern = "ip.yourdomain.com", custom_domain = true }
]
```

Cloudflare Workers will automatically configure the DNS record and provision SSL certificates with zero external tools needed.

### GitHub Pages Deployment (Optional)

The frontend can be deployed independently to GitHub Pages via [.github/workflows/pages.yml](.github/workflows/pages.yml). The build supports customizable GitHub Actions variables (set via **Settings → Secrets and variables → Actions → Variables**):

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_BACKEND_URL` / `BACKEND_URL` | Cloudflare Worker or backend API endpoint URL | `https://my-ip-info.ii2d-dev.workers.dev` |
| `FRONTEND_DOMAIN` / `CUSTOM_DOMAIN` | Custom domain written to `CNAME` for GitHub Pages | `ip.ii2d.com` |
| `ENABLE_IP2LOCATION` | Enable or disable IP2Location.io provider (`'true'` / `'false'`) | `true` |
| `VITE_BASE_PATH` | Base path for GitHub Pages if not using root custom domain | `/` |

Manual workflow runs via `workflow_dispatch` also provide optional inputs to override `backend_url` and `frontend_domain` on demand.

---

## 🗑️ Teardown

To delete the deployed worker and its assets:

```bash
pnpm undeploy # or: npx wrangler delete
```

---

## 📡 API Reference

All backend API routes are versioned under `/api/v1`:

| Route | Method | Content-Type | Description |
| :--- | :---: | :--- | :--- |
| `/` | `GET` | `text/html` or `text/plain` | Serves React SPA to browsers; returns raw client IP to CLI tools (`curl`, `wget`) |
| `/ip` | `GET` | `text/plain; charset=utf-8` | Shorthand endpoint returning raw public IP with defensive security headers |
| `/api/v1/info` | `GET` | `text/plain` or `application/json` or `text/yaml` | Smart content negotiation: returns plaintext for CLI or JSON for browsers. Supports explicit query override: `?format=json`, `?format=yaml`, `?format=text`, `?format=ip` |
| `/api/v1/ip` | `GET` | `text/plain; charset=utf-8` | Returns raw public client IP address with a trailing newline |
| `/api/v1/geo` | `GET` | `application/json` | Geolocation data (city, region, country, lat/lon, ASN, datacenter colo) |
| `/api/v1/yaml` | `GET` | `text/yaml; charset=utf-8` | Client metadata and network details formatted as safe YAML |
| `/api/v1/health`| `GET` | `application/json` | Health check endpoint returning status and provider identifier |

---

## 📄 License

MIT License. Contributions and PRs welcome!
