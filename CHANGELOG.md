# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Media message support (images, videos, files)
- Group message support
- Onboarding wizard
- Message reactions
- Thread support

## [0.2.0] - 2026-01-31

### Added
- Dynamic Agent management - Create independent Agent instances for each user/group
- Message queue with retry mechanism
- HTTP connection pool management
- Request caching optimization
- Health check and monitoring system
- WebHook handler
- Message routing system
- Rate limiter (60 requests/minute by default)
- Circuit breaker pattern
- Batch operation management
- Account templates
- Enhanced CLI commands
- Structured logging system
- Message chunking for large messages
- Template message support
- Markdown message support

### Changed
- Improved error handling
- Optimized API response caching
- Enhanced message delivery reliability

### Fixed
- Various bug fixes from 20 iterations

## [0.1.0] - 2026-01-30

### Added
- Initial release
- Basic text message sending/receiving
- WorkWeixin callback handling
- Account configuration management
- Pairing approval workflow
- Basic CLI commands

---

## Version History Summary

| Version | Date | Description |
|---------|------|-------------|
| 0.2.0 | 2026-01-31 | Major feature update with 20 iterations |
| 0.1.0 | 2026-01-30 | Initial release |

[Unreleased]: https://github.com/lohasle/clawd-gateway-wework/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/lohasle/clawd-gateway-wework/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/lohasle/clawd-gateway-wework/releases/tag/v0.1.0
