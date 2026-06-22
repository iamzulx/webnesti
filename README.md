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
cp .env.example .env
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
cp .env.example .env
docker compose up --build -d
```

Data persists in the `webnesti-data` volume.

### Compiled production

```bash
cp .env.example .env
npm install
npm run build
npm run start:prod
```

## Notes

- Development uses `npm run dev` (tsx watch).
- Production should use `npm run build` + `npm run start:prod`.
- Seed runs automatically on start inside the Docker entrypoint script.
- Seed manually with `npm run seed` if needed.
