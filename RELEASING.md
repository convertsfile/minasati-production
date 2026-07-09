# Releasing Minassati

How to cut a release of the Minassati platform.

## 1. Pick a version

Follow [Semantic Versioning](https://semver.org/):

- MAJOR: breaking API change or auth model change
- MINOR: backwards-compatible feature
- PATCH: backwards-compatible bug fix

Write the version into `CHANGELOG.md` under a new heading.

## 2. Tag

```bash
git tag -a v1.2.3 -m "Release 1.2.3"
git push origin v1.2.3
```

The GitHub Actions workflows (`laravel-deploy.yml`, `next-deploy.yml`,
`vod-engine.yml`) will:

- Run the full test suite.
- Build the production container images.
- Push them to `ghcr.io/<org>/minassati-{laravel,frontend}:<tag>`.

## 3. Deploy to staging

```bash
# Laravel
TAG=v1.2.3 deploy/laravel/deploy-laravel.sh v1.2.3

# Frontend
TAG=v1.2.3 deploy/frontend/deploy-frontend.sh v1.2.3

# VOD engine
sudo cp workers/vod-engine/bin/vod-engine /usr/local/bin/
sudo systemctl restart vod-engine
```

Each deploy script appends one line per deploy to
`/var/backups/minassati/{service}-deploys.log` so the rollback script
can find the previous tag.

## 4. Smoke test

- `curl https://api.example.com/api/health/live` — must return 200.
- `curl https://api.example.com/api/health/ready` — must return 200.
- `curl https://api.example.com/api/metrics | head` — must be a
  Prometheus text exposition format.
- Open the frontend, sign in as a student, watch a video end-to-end.
- Open the admin dashboard, approve a pending topup.

## 5. Deploy to production

Repeat step 3 against the production hosts. The deploy scripts are
idempotent: re-running with the same tag is a no-op.

## 6. Roll back

If the smoke test fails or a regression is reported:

```bash
# Laravel
deploy/laravel/rollback-laravel.sh

# Frontend
deploy/frontend/rollback-frontend.sh

# VOD engine
deploy/rollback-ops-hardening.sh   # existing script
```

Each rollback script reads the previous line from the deploy log,
pulls the corresponding image, and waits for `/health/live` to return
200 before declaring success.

## 7. Post-release

- Update `CHANGELOG.md` with the release date.
- Announce in the team channel.
- Monitor `/metrics` and Sentry for 24h before considering the
  release final.
