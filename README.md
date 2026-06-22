# WebNesti — AI Model API Provider

Unified API for 100+ AI models. One endpoint, one key, one billing.

## Quick Start

```bash
cp .env.example .env
npm install
npm run dev
```

## Production Start

```bash
cp .env.production.example .env.production
npm install
npm run build
npm run start:prod
```

## API Endpoints (OpenAI-Compatible)

```
POST /v1/chat/completions  — Chat completion
GET  /v1/models            — List models
GET  /v1/status            — Provider status snapshot
GET  /health               — Health check
```

## Architecture

```
Client → Hono API → Provider Adapters → {OpenAI, Anthropic, Google, DeepSeek, ...}
                     ↓
              SQLite (sql.js) → Usage tracking, billing, keys
```

## Tech Stack

- Runtime: Node.js + TypeScript
- Framework: Hono
- Database: sql.js (SQLite)
- Providers: OpenAI, Anthropic, Google, DeepSeek, Meta, xAI, Mistral, Cohere
- Frontend: Hono JSX + htmx + Alpine.js
- Deploy: Docker or compiled `node dist/src/index.js`

## Deployment

### Docker

```bash
cp .env.production.example .env
docker compose up --build -d
```

Data persists in the `webnesti-data` volume.

### Compiled production

```bash
cp .env.production.example .env
npm install
npm run build
npm run start:prod
```

### Railway

This repo includes `railway.json`. Railway uses the Dockerfile automatically.

### Render

This repo includes `render.yaml` with persistent disk config.

### GitHub Container Registry

This repo includes `.github/workflows/deploy.yml`.  
Set repository variable `ENABLE_IMAGE_PUSH=true` to push images to GHCR on `main` push.

## Auto Deploy

### Railway

Required:
- Repository secret `RAILWAY_TOKEN`
- Repository variable `ENABLE_RAILWAY_DEPLOY=true`
- Optional repository variable `RAILWAY_SERVICE_NAME` (default: `webnesti`)

### Render

Required:
- Repository secret `RENDER_DEPLOY_HOOK_URL`
- Repository variable `ENABLE_RENDER_DEPLOY=true`

## Release Workflow

Pushing a tag like `v0.9.0` will:
- Build Docker image
- Push `ghcr.io/OWNER/REPO:v0.9.0` and `latest`
- Create a GitHub release with generated notes

## Branch Protection

`main` is protected:
- Require PR before merge
- Require passing status check `build-test`
- Dismiss stale reviews
- Require conversation resolution
- Block force push and branch deletion

## Notes

- Development uses `npm run dev` (tsx watch).
- Production should use `npm run build` + `npm run start:prod`.
- Seed runs automatically on start inside the Docker entrypoint script.
- Seed manually with `npm run seed` if needed.
