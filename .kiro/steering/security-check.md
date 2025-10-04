# Security Check (OWASP Top 10 Aligned)

Use this checklist during code generation and review. Avoid OWASP Top 10 issues by design.

## A01: Broken Access Control
- Enforce least privilege; validate authorization on every request/path
- No client-side trust; never rely on hidden fields or disabled UI

## A02: Cryptographic Failures
- Use HTTPS/TLS; do not roll your own crypto
- Store secrets in env vars/secret stores; never commit secrets

## A03: Injection
- Use parameterized queries/ORM and safe template APIs
- Sanitize/validate untrusted input; avoid string concatenation in queries

## A04: Insecure Design
- Threat model critical flows; add security requirements to design
- Fail secure; disable features by default until explicitly enabled

## A05: Security Misconfiguration
- Disable debug modes in prod; set secure headers (CSP, HSTS, X-Content-Type-Options)
- Pin dependencies and lock versions; no default credentials

## A06: Vulnerable & Outdated Components
- Track SBOM/dependencies; run npm audit or a scanner regularly and patch
- Prefer maintained libraries; remove unused deps

## A07: Identification & Authentication Failures
- Use vetted auth (OIDC/OAuth2); enforce MFA where applicable
- Secure session handling (HttpOnly, Secure, SameSite cookies)

## A08: Software & Data Integrity Failures
- Verify integrity of third-party artifacts; signed releases when possible
- Protect CI/CD: signed commits/tags, restricted tokens, principle of least privilege

## A09: Security Logging & Monitoring Failures
- Log authz/authn events and errors without sensitive data
- Add alerts for suspicious activity; retain logs per policy

## A10: Server-Side Request Forgery (SSRF)
- Validate/deny-list outbound destinations; no direct fetch to arbitrary URLs
- Use network egress controls; fetch via vetted proxies when needed

## General Practices
- Validate inputs (schema, length, type) and outputs (encoding)
- Handle errors without leaking stack traces or secrets
- Use content security best practices for templates/HTML
- Add security tests where feasible (authz, input validation)
