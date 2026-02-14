# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| 0.1.x   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do NOT create a public issue

Security vulnerabilities should be reported privately to prevent potential exploitation.

### 2. Report via Email

Send details to: **security@lohasle.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### 3. Response Timeline

- **Acknowledgment**: Within 24 hours
- **Initial Assessment**: Within 72 hours
- **Fix Development**: Depends on severity
- **Disclosure**: After fix is released

## Security Best Practices

When using this plugin:

### Configuration Security

1. **Never commit secrets** to version control
2. Use environment variables for sensitive data:
   ```bash
   export WORKWEIXIN_CORP_SECRET="your_secret"
   export WORKWEIXIN_ENCODING_AES_KEY="your_key"
   ```
3. Enable `dmPolicy: "pairing"` for user approval

### API Security

1. **Validate callbacks** - The plugin validates signatures automatically
2. **Rate limiting** - Built-in rate limiter prevents abuse
3. **Circuit breaker** - Prevents cascade failures

### Network Security

1. Use HTTPS for webhook endpoints
2. Configure firewall rules appropriately
3. Keep dependencies updated

## Security Features

This plugin includes:

- ✅ Signature validation for callbacks
- ✅ Rate limiting (configurable)
- ✅ Circuit breaker pattern
- ✅ Request timeout handling
- ✅ Secure credential handling
- ✅ Input sanitization

## Dependencies

We regularly update dependencies to patch security vulnerabilities.

Run `npm audit` to check for known vulnerabilities:

```bash
npm audit
npm audit fix
```

---

*Last updated: 2026-02-15*
