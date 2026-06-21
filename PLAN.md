# WebNesti — AI Model API Provider Platform
## Master Development Plan

> Dibuat: 2026-06-19 | Referensi: OpenRouter, LiteLLM, AI/ML API, Portkey, Bifrost, Cloudflare AI Gateway, Crazyrouter, EvoLink, Zuplo

---

## 1. VISI & MISI

**Visi:** Platform unified API yang menyediakan akses ke ratusan model AI dari berbagai provider melalui satu endpoint, satu API key, satu billing.

**Misi:**
- Satu API key untuk 100+ model (GPT, Claude, Gemini, DeepSeek, Llama, Mistral, dll)
- OpenAI-compatible format (drop-in replacement)
- Pricing transparan, pay-per-token
- Intelligent routing & automatic fallback
- Developer-first experience

---

## 2. REFERENSI KOMPETITOR & INSPIRASI

### 2.1 OpenRouter (Market Leader)
- **URL**: openrouter.ai
- **Model**: 500+ model, 60+ provider
- **Keunggulan**: Intelligent routing, auto-fallback, model marketplace, free tier models
- **Pricing**: Markup per-token di atas provider cost, no monthly fee
- **Arsitektur**: 2-layer routing (model routing + provider routing)
- **API**: OpenAI-compatible `/v1/chat/completions`
- **Fitur**: Usage tracking, cost dashboard, team management, model playground

### 2.2 LiteLLM (Open Source Leader)
- **URL**: github.com/BerriAI/litellm
- **Model**: 100+ provider, self-hosted
- **Keunggulan**: Open source, bisa self-host, virtual keys, budget per team
- **Arsitektur**: Proxy server → provider adapter pattern
- **DB**: PostgreSQL (usage tracking, keys, teams)
- **Fitur**: Load balancing, fallback, caching, guardrails, A/B testing, MCP gateway

### 2.3 AI/ML API
- **Keunggulan**: Multi-modal (chat + image + video + audio + music)
- **Pricing**: Below official pricing, per-image/per-second billing
- **Differentiator**: Video model coverage lebih luas dari kompetitor

### 2.4 Portkey
- **Keunggulan**: AI Gateway dengan guardrails, observability, semantic caching
- **Target**: Enterprise, production AI teams
- **Fitur**: Fallback chains, load balancing, canary deploys

### 2.5 Bifrost (by Maxim AI)
- **Keunggulan**: Open source, 11 microseconds overhead at 5000 RPS
- **Target**: High-performance production workloads
- **Arsitektur**: Edge-native, self-hosted

### 2.6 Cloudflare AI Gateway
- **Keunggulan**: Free core features, 100K logs/month free, edge-deployed
- **Target**: Teams already on Cloudflare

### 2.7 Crazyrouter
- **Keunggulan**: 627+ model, multi-modal (chat+image+video+audio+music)
- **Pricing**: Pay-per-token di bawah official pricing

---

## 3. ARSITEKTUR SISTEM

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                           │
│  Web Dashboard │ API Keys │ SDK │ OpenAI-Compatible Client  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────┐
│                     API GATEWAY LAYER                       │
│  Rate Limiting │ Auth │ Request Validation │ CORS           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    ROUTING ENGINE                            │
│  Model Router │ Provider Router │ Fallback Chain │ Load Bal  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 1. Parse model ID → resolve to provider(s)          │    │
│  │ 2. Check availability, latency, cost                │    │
│  │ 3. Select best provider (weighted/cheapest/fastest) │    │
│  │ 4. If fail → cascade to fallback                    │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  PROVIDER ADAPTER LAYER                      │
│  OpenAI │ Anthropic │ Google │ DeepSeek │ Mistral │ Meta    │
│  xAI │ Cohere │ AWS Bedrock │ Azure │ Local/Ollama          │
│  ─────────────────────────────────────────────────────────── │
│  Normalize request → Provider format                         │
│  Normalize response → OpenAI format                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                        │
│  PostgreSQL │ Redis │ Queue │ Cache │ Logging │ Monitoring  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. TECH STACK

### 4.1 Backend
| Komponen | Teknologi | Alasan |
|----------|-----------|--------|
| **Runtime** | Node.js (TypeScript) | Ekosistem npm, async I/O sempurna untuk API proxy, type safety |
| **Framework** | Hono | Ultrafast, OpenAPI native, edge-compatible, middleware ringan |
| **ORM** | Drizzle ORM | Type-safe, performant, PostgreSQL native |
| **Auth** | JWT + API Keys | Standar industri, virtual key management |
| **Queue** | BullMQ (Redis) | Job queue untuk billing aggregation, async tasks |
| **Cache** | Redis | Rate limiting, response caching, session store |
| **Validation** | Zod | Schema validation, TypeScript integration |

### 4.2 Database
| Komponen | Teknologi | Alasan |
|----------|-----------|--------|
| **Primary DB** | PostgreSQL | ACID, JSON support, mature, scalable |
| **Cache/Queue** | Redis | In-memory, pub/sub, rate limiting |
| **Analytics** | ClickHouse (opsional) | High-volume event logging, token usage analytics |

### 4.3 Frontend
| Komponen | Teknologi | Alasan |
|----------|-----------|--------|
| **Framework** | Next.js 15 (App Router) | SSR, API routes, SEO, React ecosystem |
| **UI** | shadcn/ui + Tailwind | Fast development, consistent design |
| **Charts** | Recharts / Chart.js | Usage analytics visualization |
| **State** | Zustand | Lightweight, simple |

### 4.4 Infrastructure
| Komponen | Teknologi | Alasan |
|----------|-----------|--------|
| **Hosting** | VPS (DigitalOcean/Hetzner) | Cost-effective, full control |
| **CDN** | Cloudflare | DDoS protection, edge caching |
| **Monitoring** | Prometheus + Grafana | Metrics, alerting, dashboards |
| **Logging** | Pino + Loki | Structured logging, search |
| **CI/CD** | GitHub Actions | Free for public, well-integrated |

---

## 5. DATABASE SCHEMA

```sql
-- Users & Authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  balance DECIMAL(12,6) DEFAULT 0,  -- USD balance
  tier VARCHAR(20) DEFAULT 'free',   -- free, starter, pro, enterprise
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys (Virtual Keys)
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL,    -- bcrypt hash
  key_prefix VARCHAR(10) NOT NULL,   -- "wn_" prefix + first 4 chars
  name VARCHAR(255),
  rate_limit INT DEFAULT 60,         -- requests per minute
  daily_limit INT DEFAULT 10000,     -- daily request cap
  monthly_budget DECIMAL(10,2),      -- USD cap per month
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Model Registry
CREATE TABLE models (
  id VARCHAR(255) PRIMARY KEY,       -- "openai/gpt-4o"
  provider_id VARCHAR(100) NOT NULL,
  display_name VARCHAR(255),
  context_length INT,
  pricing_input DECIMAL(10,8),       -- per token
  pricing_output DECIMAL(10,8),      -- per token
  supports_streaming BOOLEAN DEFAULT true,
  supports_vision BOOLEAN DEFAULT false,
  supports_tools BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,                    -- capabilities, limits, etc
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Provider Configuration
CREATE TABLE providers (
  id VARCHAR(100) PRIMARY KEY,       -- "openai", "anthropic"
  display_name VARCHAR(255),
  base_url VARCHAR(500),
  auth_type VARCHAR(50),             -- "bearer", "api_key", "oauth"
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 100,          -- routing priority (lower = higher)
  rate_limit INT,                    -- provider-level rate limit
  metadata JSONB
);

-- Usage Logs (high volume — partition by month)
CREATE TABLE usage_logs (
  id BIGSERIAL,
  user_id UUID REFERENCES users(id),
  api_key_id UUID REFERENCES api_keys(id),
  model_id VARCHAR(255),
  provider_id VARCHAR(100),
  prompt_tokens INT,
  completion_tokens INT,
  total_tokens INT,
  cost_usd DECIMAL(10,8),
  latency_ms INT,
  status_code INT,
  is_stream BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Billing Transactions
CREATE TABLE billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type VARCHAR(50),                  -- "topup", "usage", "refund", "credit"
  amount DECIMAL(12,6),
  description TEXT,
  metadata JSONB,                    -- payment gateway response
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. API ENDPOINTS

### 6.1 Public API (OpenAI-Compatible)
```
POST   /v1/chat/completions          — Chat completion (streaming & non-stream)
POST   /v1/completions               — Text completion (legacy)
POST   /v1/embeddings                — Embeddings
POST   /v1/images/generations        — Image generation
POST   /v1/audio/speech              — Text-to-speech
POST   /v1/audio/transcriptions      — Speech-to-text
GET    /v1/models                    — List available models
GET    /v1/models/:id                — Get model details
```

### 6.2 Dashboard API
```
POST   /api/auth/register            — Register
POST   /api/auth/login               — Login
GET    /api/auth/me                  — Current user
POST   /api/keys                     — Create API key
GET    /api/keys                     — List API keys
DELETE /api/keys/:id                 — Revoke API key
GET    /api/usage                    — Usage summary
GET    /api/usage/logs               — Detailed usage logs
GET    /api/usage/by-model           — Usage breakdown by model
POST   /api/billing/topup            — Top up balance
GET    /api/billing/transactions     — Transaction history
GET    /api/models                   — Model catalog with pricing
```

### 6.3 Admin API
```
GET    /api/admin/users              — User management
GET    /api/admin/usage              — Platform-wide usage
POST   /api/admin/models             — Add/update model
POST   /api/admin/providers          — Add/update provider
GET    /api/admin/health             — System health
```

---

## 7. FITUR INTI

### 7.1 Phase 1 — MVP (Minggu 1-3)
- [ ] API Gateway dengan OpenAI-compatible format
- [ ] Provider adapter: OpenAI, Anthropic, Google (3 provider utama)
- [ ] API key management (create, revoke, rate limit)
- [ ] User registration & login
- [ ] Token-based billing (per-token pricing)
- [ ] Basic usage dashboard
- [ ] Streaming response support (SSE)
- [ ] Model list endpoint

### 7.2 Phase 2 — Scaling (Minggu 4-6)
- [ ] Provider adapter: DeepSeek, Mistral, Meta/Llama, xAI
- [ ] Intelligent routing (latency-based, cost-based, availability)
- [ ] Automatic fallback chain
- [ ] Response caching (semantic cache untuk prompt mirip)
- [ ] Rate limiting per key (sliding window)
- [ ] Usage analytics dashboard (grafik, tabel per model/provider)
- [ ] Top-up system (payment gateway integration)
- [ ] Team management (organisasi, shared keys)

### 7.3 Phase 3 — Enterprise (Minggu 7-10)
- [ ] Provider adapter: Bedrock, Azure, Cohere, local/Ollama
- [ ] Load balancing across providers (round-robin, weighted)
- [ ] Budget management per team/user
- [ ] Webhook notifications (usage threshold, billing)
- [ ] Model playground (try models in browser)
- [ ] API documentation auto-generation (OpenAPI spec)
- [ ] Admin panel (user management, model management, analytics)
- [ ] Multi-modal support (image generation, TTS, STT)

### 7.4 Phase 4 — Monetization (Minggu 11-12)
- [ ] Pricing tiers (Free, Starter, Pro, Enterprise)
- [ ] Stripe/payment gateway integration
- [ ] Affiliate/referral system
- [ ] BYOK (Bring Your Own Key) mode
- [ ] White-label API for resellers
- [ ] Usage alerts & spending limits

---

## 8. ROUTING ENGINE

```typescript
// Core routing logic
interface RoutingDecision {
  model: string;           // "gpt-4o"
  provider: string;        // "openai"
  fallbackProviders: string[];  // ["azure", "openrouter"]
  strategy: 'cheapest' | 'fastest' | 'balanced' | 'manual';
}

// Provider selection strategies
enum RoutingStrategy {
  CHEAPEST = 'cheapest',      // Minimize cost per token
  FASTEST = 'fastest',        // Minimize latency
  BALANCED = 'balanced',      // Weighted score (cost + latency + reliability)
  MANUAL = 'manual',          // User specifies provider order
  ROUND_ROBIN = 'round_robin', // Distribute evenly
}

// Fallback chain example
const FALLBACK_CHAINS = {
  'gpt-4o': ['openai', 'azure', 'openrouter'],
  'claude-sonnet-4': ['anthropic', 'openrouter', 'bedrock'],
  'gemini-2.0-flash': ['google', 'openrouter'],
};
```

---

## 9. MONETIZATION MODEL

### Pricing Strategy (Pay-Per-Token)
| Tier | Markup | Min Top-up | Rate Limit | Features |
|------|--------|-----------|------------|----------|
| **Free** | 0% (promo models only) | - | 20 req/min | Limited models, no SLA |
| **Starter** | +10% dari provider cost | $5 | 60 req/min | Semua model, basic analytics |
| **Pro** | +5% dari provider cost | $50 | 300 req/min | Priority routing, advanced analytics |
| **Enterprise** | Custom | $500+ | Custom | SLA, dedicated support, white-label |

### Revenue Streams
1. **Markup per-token** — Primary revenue (5-20% di atas provider cost)
2. **Monthly subscriptions** — Fixed plans untuk heavy users
3. **BYOK fee** — Flat fee/month untuk users yang pakai API key sendiri
4. **Enterprise contracts** — Custom pricing, volume discounts
5. **Data & analytics** — Premium usage insights

---

## 10. SECURITY

- API key hashing (bcrypt, never store raw keys)
- Rate limiting per IP + per API key
- Request/response logging (optional, privacy-first mode)
- CORS configuration
- Input validation (Zod schemas)
- HTTPS-only
- DDoS protection (Cloudflare)
- SQL injection prevention (parameterized queries via Drizzle)
- Key rotation support

---

## 11. MONITORING & OBSERVABILITY

| Komponen | Metrics |
|----------|---------|
| **Request Latency** | P50, P95, P99 per model/provider |
| **Error Rate** | Per provider, per model, per status code |
| **Token Usage** | Total tokens, by model, by user |
| **Cost** | Provider cost vs revenue, margin per model |
| **Availability** | Provider uptime, fallback trigger rate |
| **Cache Hit Rate** | Semantic cache effectiveness |

---

## 12. FILE STRUCTURE

```
webnesti/
├── PLAN.md                      ← File ini
├── README.md                    ← Project documentation
├── package.json
├── tsconfig.json
├── .env.example
├── docker-compose.yml
├── drizzle.config.ts
│
├── apps/
│   ├── api/                     ← Backend API (Hono)
│   │   ├── src/
│   │   │   ├── index.ts         ← Entry point
│   │   │   ├── routes/
│   │   │   │   ├── v1.ts        ← /v1/chat/completions, dll
│   │   │   │   ├── auth.ts      ← Login, register
│   │   │   │   ├── keys.ts      ← API key CRUD
│   │   │   │   ├── usage.ts     ← Usage analytics
│   │   │   │   └── admin.ts     ← Admin endpoints
│   │   │   ├── providers/       ← Provider adapters
│   │   │   │   ├── openai.ts
│   │   │   │   ├── anthropic.ts
│   │   │   │   ├── google.ts
│   │   │   │   ├── deepseek.ts
│   │   │   │   ├── mistral.ts
│   │   │   │   ├── meta.ts
│   │   │   │   ├── xai.ts
│   │   │   │   └── base.ts      ← Base adapter interface
│   │   │   ├── routing/         ← Routing engine
│   │   │   │   ├── router.ts    ← Core routing logic
│   │   │   │   ├── fallback.ts  ← Fallback chain
│   │   │   │   └── strategies.ts ← Routing strategies
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts      ← JWT + API key auth
│   │   │   │   ├── rateLimit.ts ← Rate limiter
│   │   │   │   ├── usage.ts     ← Usage tracking
│   │   │   │   └── errorHandler.ts
│   │   │   ├── db/
│   │   │   │   ├── schema.ts    ← Drizzle schema
│   │   │   │   ├── migrate.ts   ← Migration runner
│   │   │   │   └── index.ts     ← DB connection
│   │   │   ├── services/
│   │   │   │   ├── billing.ts   ← Billing logic
│   │   │   │   ├── cache.ts     ← Response caching
│   │   │   │   └── queue.ts     ← Background jobs
│   │   │   └── utils/
│   │   │       ├── crypto.ts    ← API key hashing
│   │   │       ├── streaming.ts ← SSE helpers
│   │   │       └── tokens.ts    ← Token counting
│   │   └── tests/
│   │
│   └── web/                     ← Frontend (Next.js)
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx         ← Landing page
│       │   │   ├── login/page.tsx
│       │   │   ├── register/page.tsx
│       │   │   ├── dashboard/
│       │   │   │   ├── page.tsx     ← Main dashboard
│       │   │   │   ├── keys/page.tsx
│       │   │   │   ├── usage/page.tsx
│       │   │   │   ├── billing/page.tsx
│       │   │   │   └── playground/page.tsx
│       │   │   ├── docs/page.tsx    ← API documentation
│       │   │   └── pricing/page.tsx
│       │   └── components/
│       └── public/
│
├── packages/
│   └── shared/                  ← Shared types & utils
│       └── types.ts
│
├── migrations/                  ← Drizzle migrations
├── scripts/
│   ├── seed-models.ts           ← Seed model catalog
│   └── seed-providers.ts        ← Seed provider configs
└── deploy/
    ├── Dockerfile
    ├── docker-compose.yml
    └── nginx.conf
```

---

## 13. DEVELOPMENT TIMELINE

| Minggu | Milestone | Deliverables |
|--------|-----------|-------------|
| **1** | Foundation | Repo setup, DB schema, auth system, API key CRUD |
| **2** | Core API | Provider adapter (OpenAI, Anthropic), /v1/chat/completions, streaming |
| **3** | MVP Launch | Google adapter, basic dashboard, billing, model list |
| **4** | Routing | Intelligent routing, fallback chains, 4+ additional providers |
| **5** | Analytics | Usage dashboard, cost analytics, rate limiting |
| **6** | Billing | Top-up system, payment gateway, team management |
| **7-8** | Scale | Cache, load balancing, remaining providers, admin panel |
| **9-10** | Polish | Model playground, API docs, multi-modal support |
| **11-12** | Monetize | Pricing tiers, BYOK, white-label, referral system |

---

## 14. COMPETITIVE ADVANTAGE

1. **Indonesia-first** — Pembayaran lokal (QRIS, transfer bank), support Bahasa Indonesia
2. **Transparent pricing** — Real-time cost calculator, no hidden fees
3. **Developer experience** — Playground, SDK, comprehensive docs
4. **Privacy-first** — No request logging by default, optional for debugging
5. **Local models** — Support model lokal Indonesia (jika tersedia)
6. **Free tier generous** — Model gratis untuk onboarding mudah

---

## 15. RISKS & MITIGASI

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Provider API changes | Breaking changes | Adapter pattern isolates per-provider logic |
| High provider cost | Margin squeeze | Multi-provider comparison, negotiate volume pricing |
| DDoS / Abuse | Service disruption | Cloudflare + rate limiting + key revocation |
| Data privacy concerns | User trust | No-logging default, GDPR compliance, SOC2 roadmap |
| Competition (OpenRouter) | Market share | Differentiate on local market, pricing, DX |
| Billing disputes | Customer churn | Transparent logging, audit trail, refund process |

---

## 16. QUICK START COMMANDS

```bash
# Setup
cd ~/webnesti
cp .env.example .env  # Edit dengan API keys
npm install

# Database
npx drizzle-kit generate
npx drizzle-kit migrate
npm run seed

# Development
npm run dev           # Start API + Web
npm run dev:api       # API only
npm run dev:web       # Web only

# Production
docker-compose up -d
```

---

**Next Step:** Mulai implementasi Phase 1 (Minggu 1 — Foundation)
