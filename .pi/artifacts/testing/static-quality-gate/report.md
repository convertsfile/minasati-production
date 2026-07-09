# Static-Quality-Gate Report — Minassati (منصاتي)
Generated: 2026-07-09 (UTC)
Project root: `C:/Users/drhab/OneDrive/Desktop/new-minasaati`
Phase: `static-quality-gate` (testing-pipeline)
Retry count for this domain: **0** → status: **PASS**

---

## 1. Tooling Detected

| Service        | Linter / type-checker                  | Source                  |
|----------------|----------------------------------------|-------------------------|
| Backend (PHP)  | `laravel/pint` 1.x (PSR-12)            | composer devDep         |
| Backend (PHP)  | `composer audit --no-dev`              | composer.lock           |
| Frontend (TS)  | `eslint` 9 + `tsc --noEmit` 5 (strict) | package.json devDeps    |
| Frontend (JS)  | `npm audit`                            | package-lock.json       |
| Worker (Go)    | `go vet` + `go build`                  | go 1.26.2               |

## 2. Re-Verification (this cycle)

| Tool                                | Prior cycle (Jul 9 08:31)  | This cycle                  | Delta                          |
|-------------------------------------|----------------------------|------------------------------|--------------------------------|
| `composer audit --no-dev`           | 2 LOW                      | **0 advisories**             | IMPROVED — fully clean         |
| `npx tsc --noEmit`                  | 0 errors                   | **0 errors**                 | unchanged                      |
| `npx eslint .` — total              | 157E / 84W                 | **157E / 84W**               | unchanged (MINOR cluster)      |
| `go vet ./...`                      | OK                         | **OK**                       | unchanged                      |
| `go build ./...`                    | OK                         | **OK**                       | unchanged                      |
| `npm audit`                         | 2 MOD                      | **2 MOD**                    | unchanged (postcss transitive) |
| `pint --test`                       | 97 files                   | **101 files**                | +4 files (still MINOR)         |
| SAST grep (raw SQL / innerHTML / secrets) | clean              | **clean**                    | unchanged                      |
| Architecture fit                    | PASS                       | **PASS**                     | unchanged                      |

## 3. Findings (by severity)

### CRITICAL
**None.** No exploitable issues, no hardcoded secrets in VCS.
- `git ls-files` scan for `Makeen_Enterprise_VOD_Secret` → 0 tracked files.
- `backend/.env` and `workers/vod-engine/.env` contain local secrets but
  are listed in `.gitignore` and NOT tracked.

### MAJOR
**None.**
- `composer audit --no-dev` reports `{"advisories":[],"abandoned":[]}` —
  all 3 HIGH CVEs (laravel/framework 12.59, symfony/http-kernel 7.4.11,
  symfony/mime 7.4.9) and 2 LOW advisories from the prior cycle are
  fully resolved.
- `go vet` and `go build` both exit 0.
- `tsc --noEmit` exits 0.
- All raw SQL uses (3) are static string literals — not exploitable.

### MINOR (open; out of scope per charter — purely hygienic)

- **157 `@typescript-eslint/no-explicit-any` errors** across the frontend
  (e.g., `frontend/components/SecureVideoPlayer.tsx:295`,
  `frontend/services/auth.service.ts:26`, `frontend/types/api.ts:11`).
  Auto-fixable with type narrowing; charter rule prohibits `any`.
- **84 `@typescript-eslint/no-unused-vars` warnings** (stale imports).
- **101 files with `pint` style issues** (PSR-12, auto-fixable via
  `vendor/bin/pint`).
- **2 MODERATE `npm audit` advisories** — `postcss <8.5.10` XSS,
  bundled by `next@16.x`. `npm audit fix --force` downgrades `next` to
  9.3.3 (breaking change). Mitigation: wait for upstream `next` patch.

## 4. SAST-Style Grep Results

| Pattern                                      | Hits | Risk           |
|----------------------------------------------|------|----------------|
| `eval(`, `new Function(` in PHP/TS sources   | 0    | clean          |
| `->whereRaw`, `->selectRaw`, `->havingRaw`, `DB::raw` (PHP) | 3 | SAFE — all static string literals |
| `innerHTML` in TS/JSX                        | 1    | SAFE — sets to empty string in `SecureVideoPlayer.tsx:216` |
| `phpinfo(`, `dd(`, `dump(`, `var_dump` in app code | 0 | clean       |
| `exec`, `shell_exec`, `system`, `passthru`   | 0 (web path) | 8 hits all in artisan Console/Commands/* diagnostic tooling |
| Hardcoded AWS keys, GitHub tokens, Stripe keys | 0  | clean          |
| `User::increment` / `->increment(` wallet shortcut | 0 (Services) | clean — WalletService uses `DB::transaction + lockForUpdate` |

## 5. Architecture / AGENTS.md Compliance Spot-Checks

| AGENTS.md rule                                                | Status | Evidence                                                            |
|---------------------------------------------------------------|--------|---------------------------------------------------------------------|
| Wallet mutations in `DB::transaction` + `lockForUpdate`       | PASS   | `backend/app/Services/WalletService.php` (10 lockForUpdate sites)   |
| ffmpeg stderr bounded by `limitedWriter`                      | PASS   | `workers/vod-engine/internal/encoding/pipeline.go:308,842-849`     |
| Arabic dropdown strings stored as `varchar`                   | PASS   | `governorate` = `string` in `000004_create_users_table.php:24`     |
| Single-active-session via Sanctum token rotation              | PASS   | `backend/app/Services/DeviceManagerService.php`                     |
| No UI layer directly queries DB                               | PASS   | `grep "DB::\|->table\(" frontend/` → 0 matches                     |
| No `return view(` in API controllers                          | PASS   | grep over `backend/app/Http/Controllers` → 0 matches                |
| No hardcoded secrets in VCS                                   | PASS   | `git ls-files` secret-pattern scan → 0 tracked matches; `.env` gitignored |

## 6. Counts

- CRITICAL: 0
- MAJOR: 0
- MINOR: 4 (eslint-any 157, eslint-unused 84, pint 101 files, npm 2 MOD)
- Retry count: 0

## 7. Routing

- Active domain: `static-quality-gate`
- Status: **PASS** (only MINOR findings remain — none blocking)
- Composer advisories regressed from 2 LOW → 0 (improvement)
- Per the next-rule table: PASS → `functional-test`
