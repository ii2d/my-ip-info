# Security Policy

## Supported Versions

We provide security updates and patches for the following versions:

| Version | Supported          |
| :---    | :---               |
| 1.x.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

---

## Reporting a Vulnerability

We take the security of **my-ip-info** seriously. If you discover a vulnerability, please report it responsibly so we can investigate and publish a fix before public disclosure.

### How to Report Privately

1. Please **DO NOT** open a public issue, pull request, or discussion describing the vulnerability.
2. Instead, report it via **[GitHub Private Vulnerability Reporting](https://github.com/ii2d/my-ip-info/security/advisories/new)** under the repository's **Security** tab.
3. Include the following details in your report:
   - Type of issue (e.g., SSRF, XSS, token leakage, ReDoS, dependency vulnerability).
   - Component affected (Cloudflare Worker, Web Dashboard, Core package, or Infrastructure scripts).
   - Step-by-step reproduction instructions or a minimal Proof of Concept (PoC).
   - Potential impact of the issue.

---

## Response & Disclosure Process

- **Acknowledgment**: You will receive an initial response acknowledging receipt within **48 hours**.
- **Assessment**: We will validate the report, determine severity, and keep you informed of remediation progress.
- **Fix & Advisory**: Once resolved, we will release a patched version and publish a GitHub Security Advisory crediting your responsible disclosure.
