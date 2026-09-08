# 🌐 my-ip-info

> A high-performance IP intelligence and network connectivity diagnostic suite built as a unified Cloudflare Worker with Static Assets.
>
> 🚀 **Live Deployment**: [https://my-ip-info.ii2d-dev.workers.dev](https://my-ip-info.ii2d-dev.workers.dev)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Most IP lookup tools query a single remote server. **my-ip-info** cross-validates IP data across your self-hosted **Cloudflare edge backend**, public APIs (`ipify`, `ipapi.co`, `icanhazip.com`), and browser **WebRTC STUN candidates** to detect VPN/proxy leaks, diagnose coordinate variations across geolocation databases, and measure real-time latency.

---

## ✨ Features

- ⚡ **Unified Cloudflare Worker**: Front-end (React SPA) and Edge API (Hono) deploy together under a single origin. Static assets are served via Cloudflare's edge cache (free & unlimited quota), while API requests run on the edge.
- ⚡ **Zero-Latency Edge Intelligence**: Automatically extracts city, region, coordinates, ASN (`AS6327`), ISP organization, and airport datacenter code (`colo`) directly from the edge TLS connection without external database lookups.
- 🗺️ **Geolocation Convergence Map**: Interactive dark Leaflet map plotting coordinates reported by each provider to visualize database discrepancies.
- 🛡️ **WebRTC & STUN Leak Inspector**: Queries browser STUN ICE candidates to expose local network interfaces (LAN) and detect VPN/proxy bypasses.
- ⏱️ **Latency & Network Benchmark**: Measures round-trip time (RTT) to global Anycast edge nodes.
- 📱 **Progressive Web App (PWA)**: Installable directly from the browser on desktop and mobile with standalone window support, offline UI shell caching, and automatic refetching on network reconnect.
- 💻 **CLI & cURL Friendly**: Direct terminal support at root `/` and versioned `/api/v1` routes:
  ```bash
  curl https://my-ip-info.ii2d-dev.workers.dev/                       # Plaintext IP (auto-detected CLI)
  curl https://my-ip-info.ii2d-dev.workers.dev/ip                     # Plaintext IP shorthand
  curl https://my-ip-info.ii2d-dev.workers.dev/api/v1/ip              # Versioned plaintext IP
  curl https://my-ip-info.ii2d-dev.workers.dev/api/v1/info            # Terminal formatted diagnostic overview
  curl -H "Accept: application/json" https://my-ip-info.ii2d-dev.workers.dev/api/v1/info  # Full JSON intelligence
  curl https://my-ip-info.ii2d-dev.workers.dev/api/v1/geo             # Dedicated Geo info
  curl https://my-ip-info.ii2d-dev.workers.dev/api/v1/yaml            # Dedicated YAML output
  ```

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

---

## ☁️ Deployment

Deploying requires **zero environment variables**:

```bash
# Build frontend and deploy unified worker
pnpm deploy
```

Wrangler will authenticate via your browser or respect your standard `CLOUDFLARE_API_TOKEN` environment variable.

### Custom Domain (Optional)

To bind a custom domain in your Cloudflare zone, uncomment the route in `wrangler.toml`:

```toml
routes = [
  { pattern = "ip.yourdomain.com", custom_domain = true }
]
```

Cloudflare Workers will automatically configure the DNS record and provision SSL certificates with zero external tools needed.

---

## 🗑️ Teardown

To delete the deployed worker and its assets:

```bash
npx wrangler delete
```

---

## 📡 API Reference

All backend API routes are versioned under `/api/v1`:

| Route | Method | Content-Type | Description |
| :--- | :---: | :--- | :--- |
| `/` | `GET` | `text/html` or `text/plain` | Serves React SPA to browsers; returns raw client IP to CLI tools (`curl`, `wget`) |
| `/ip` | `GET` | `text/plain; charset=utf-8` | Shorthand endpoint returning raw public IP |
| `/api/v1/info` | `GET` | `text/plain` or `application/json` | Smart content negotiation: returns plaintext for CLI tools or JSON for browsers & apps |
| `/api/v1/ip` | `GET` | `text/plain; charset=utf-8` | Returns raw public client IP address with a trailing newline |
| `/api/v1/geo` | `GET` | `application/json` | Geolocation data (city, region, country, lat/lon, ASN, datacenter colo) |
| `/api/v1/yaml` | `GET` | `text/yaml; charset=utf-8` | Client metadata and network details formatted as clean YAML |
| `/api/v1/health`| `GET` | `application/json` | Health check endpoint returning status and provider identifier |

---

## 📄 License

MIT License. Contributions and PRs welcome!
