# Changelog

All notable changes to Minassati (منصاتي) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `GET /api/health/live` and `GET /api/health/ready` — split liveness vs. readiness
  endpoints so orchestrators can drain traffic from a degraded instance
  (RELIABILITY-MAJOR-01).
- `GET /api/metrics` — Prometheus-compatible text-format metrics endpoint
  with `http_requests_total`, `http_request_duration_seconds`,
  `webhook_received_total`, `queue_pending_jobs`, `queue_failed_jobs`,
  `wallet_pending_topups` (RELIABILITY-MAJOR-02).
- `LOG_CHANNEL=json` — structured one-JSON-object-per-line log channel for
  production; directly ingestable by Loki/Elasticsearch/Datadog
  (RELIABILITY-MAJOR-03).
- `deploy/laravel/{Dockerfile,docker-compose.yml,nginx.conf,deploy-laravel.sh,rollback-laravel.sh}` —
  production deploy + rollback for the Laravel backend (RELIABILITY-MAJOR-04).
- `deploy/frontend/{Dockerfile,deploy-frontend.sh,rollback-frontend.sh}` —
  production deploy + rollback for the Next.js frontend (RELIABILITY-MAJOR-04).
- `.github/workflows/laravel-deploy.yml`, `next-deploy.yml`, `vod-engine.yml` —
  CI + container image build for all three services.
- `RecordHttpMetrics` middleware — records every API request as
  `http_requests_total` + `http_request_duration_seconds`.
- `MetricsRegistry`, `ApplicationMetrics`, `PrometheusServiceProvider` —
  in-process metrics stack.
- `HealthController` — `/health/live` and `/health/ready`.

### Changed
- `FawryController::webhook`, `VodafoneCashController::webhook`,
  `VideoEngineController::handleWebhook` — now emit `webhook_received_total`
  Prometheus counter with `source`/`event`/`outcome` labels.

## [1.0.0] — 2026-07-09

### Added
- Initial release of the Minassati platform.
- Laravel 12 API with Sanctum auth, wallet, payments, video, exams, forum.
- Next.js 16 frontend with RTL Arabic UI.
- Go 1.25 VOD engine (FFmpeg + HLS + AES-128 + Backblaze B2).
- Twilio OTP, InstaPay/Vodafone Cash manual payments, Firebase FCM, Pusher.
- Security headers middleware, JWT secret hardening, payment-webhook HMAC
  verification, private-bucket storage policy.
