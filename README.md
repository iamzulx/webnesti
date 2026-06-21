# WebNesti — AI Model API Provider

Unified API for 100+ AI models. One endpoint, one key, one billing.

## Quick Start

```bash
cp .env.example .env
npm install
npm run dev
```

## API Endpoints (OpenAI-Compatible)

```
POST /v1/chat/completions  — Chat completion
GET  /v1/models            — List models
GET  /health               — Health check
```

## Architecture

```
Client → Hono API → Provider Adapters → {OpenAI, Anthropic, Google}
                     ↓
              SQLite (Drizzle ORM) → Usage tracking, billing
```

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Hono (ultrafast)
- **Database**: SQLite (MVP) → PostgreSQL (prod)
- **ORM**: Drizzle
- **Providers**: OpenAI, Anthropic, Google
