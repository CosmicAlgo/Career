# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| latest (main) | ✅ |
| older branches | ❌ |

---

## Reporting a Vulnerability

If you discover a security vulnerability, **do not open a public GitHub issue.**

Email: rahulsurya021@outlook.com  
Subject line: `[SECURITY] CareerRadar — brief description`

Please include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix if you have one

You will receive a response within 48 hours. If the issue is confirmed, a patch will be released as soon as possible and you will be credited in the release notes unless you prefer anonymity.

---

## Secrets and API Keys

CareerRadar handles sensitive credentials. Here is how they are protected:

**What we store:**
- GitHub Personal Access Token (read-only scopes only)
- AI provider API keys (Gemini / Anthropic)
- Supabase service role key

**How they are protected:**
- All secrets are stored as environment variables only — never in source code
- `.env` is in `.gitignore` and must never be committed
- Supabase service role key is backend-only and never exposed to the frontend
- The repository is scanned for accidentally committed secrets on every push via Gitleaks GitHub Action

**For self-hosters:**
- Never commit your `.env` file
- Use Railway and Vercel environment variable dashboards for production secrets
- Rotate your GitHub PAT regularly — it only needs `read:user` and `public_repo` scopes
- Enable Supabase Row Level Security before exposing your instance to multiple users

---

## Known Limitations

- CareerRadar is currently designed as a single-user self-hosted tool
- Multi-user deployments require enabling Supabase RLS and Auth — see `docs/SELF_HOSTING.md`
- The Anthropic API key (if used) should be treated as highly sensitive — it has billing implications if leaked

---

## Dependency Scanning

Dependencies are automatically scanned on every push:
- Python: `pip-audit` checks for known CVEs
- Node: `npm audit` checks for high-severity vulnerabilities
- Secrets: Gitleaks scans git history for accidentally committed credentials

See `.github/workflows/security.yml` for the full scanning pipeline.
