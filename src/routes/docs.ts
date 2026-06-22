// Auto-generated OpenAPI 3.0 spec for WebNesti API
export function generateOpenAPISpec() {
  return {
    openapi: "3.0.3",
    info: {
      title: "WebNesti API",
      description: "Unified API for 100+ AI models. One endpoint, one key, one billing.",
      version: "0.8.0",
      contact: { name: "WebNesti Support", url: "https://webnesti.ai" },
      license: { name: "MIT" },
    },
    servers: [
      { url: "https://api.webnesti.ai", description: "Production" },
      { url: "http://localhost:3000", description: "Local development" },
    ],
    paths: {
      "/v1/chat/completions": {
        post: {
          summary: "Create chat completion",
          description: "OpenAI-compatible chat completion endpoint. Supports streaming and non-streaming.",
          tags: ["Chat"],
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChatRequest" },
              },
            },
          },
          responses: {
            "200": { description: "Chat completion", content: { "application/json": { schema: { $ref: "#/components/schemas/ChatResponse" } } } },
            "400": { description: "Invalid request" },
            "401": { description: "Unauthorized" },
            "402": { description: "Insufficient balance" },
            "404": { description: "Model not available" },
            "429": { description: "Rate limit exceeded" },
            "502": { description: "Provider error" },
          },
        },
      },
      "/v1/models": {
        get: {
          summary: "List available models",
          tags: ["Models"],
          responses: { "200": { description: "Model list", content: { "application/json": { schema: { type: "object", properties: { object: { type: "string" }, data: { type: "array", items: { $ref: "#/components/schemas/Model" } } } } } } } },
        },
      },
      "/v1/models/{id}": {
        get: {
          summary: "Get model details",
          tags: ["Models"],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Model details" }, "404": { description: "Model not found" } },
        },
      },
      "/api/auth/register": {
        post: {
          summary: "Register new user",
          tags: ["Auth"],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["email", "password"], properties: { email: { type: "string" }, password: { type: "string", minLength: 8 }, name: { type: "string" } } } } } },
          responses: { "201": { description: "User created with API key" }, "409": { description: "Email already registered" } },
        },
      },
      "/api/auth/login": {
        post: {
          summary: "Login",
          tags: ["Auth"],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["email", "password"], properties: { email: { type: "string" }, password: { type: "string" } } } } } },
          responses: { "200": { description: "Login successful, returns JWT token" }, "401": { description: "Invalid credentials" } },
        },
      },
      "/api/auth/me": {
        get: {
          summary: "Get current user",
          tags: ["Auth"],
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "User details" }, "401": { description: "Not authenticated" } },
        },
      },
      "/api/keys": {
        get: { summary: "List API keys", tags: ["Keys"], security: [{ BearerAuth: [] }], responses: { "200": { description: "Key list" } } },
        post: { summary: "Create API key", tags: ["Keys"], security: [{ BearerAuth: [] }], responses: { "201": { description: "Key created" } } },
      },
      "/api/keys/{id}": {
        delete: { summary: "Revoke API key", tags: ["Keys"], security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Key revoked" } } },
      },
      "/api/usage": {
        get: { summary: "Get usage stats", tags: ["Usage"], security: [{ BearerAuth: [] }], responses: { "200": { description: "Usage summary" } } },
      },
      "/api/billing/topup": {
        post: { summary: "Top up balance (disabled, use Midtrans)", tags: ["Billing"], security: [{ BearerAuth: [] }], responses: { "400": { description: "Use Midtrans" } } },
      },
      "/api/billing/transactions": {
        get: { summary: "Transaction history", tags: ["Billing"], security: [{ BearerAuth: [] }], responses: { "200": { description: "Transaction list" } } },
      },
      "/api/budget": {
        get: { summary: "Get budget settings", tags: ["Budget"], security: [{ BearerAuth: [] }], responses: { "200": { description: "Budget info" } } },
        put: { summary: "Update monthly budget cap", tags: ["Budget"], security: [{ BearerAuth: [] }], responses: { "200": { description: "Budget updated" } } },
      },
      "/api/budget/alerts": {
        get: { summary: "Get spending alerts", tags: ["Budget"], security: [{ BearerAuth: [] }], responses: { "200": { description: "Alert list" } } },
      },
      "/api/pricing": {
        get: { summary: "List pricing tiers", tags: ["Pricing"], responses: { "200": { description: "Tier list" } } },
      },
      "/api/pricing/current": {
        get: { summary: "Current user tier", tags: ["Pricing"], security: [{ BearerAuth: [] }], responses: { "200": { description: "Current tier" } } },
      },
      "/api/pricing/upgrade": {
        post: { summary: "Upgrade tier", tags: ["Pricing"], security: [{ BearerAuth: [] }], responses: { "200": { description: "Upgraded" } } },
      },
      "/api/referral": {
        get: { summary: "Get referral code", tags: ["Referral"], security: [{ BearerAuth: [] }], responses: { "200": { description: "Referral info" } } },
      },
      "/api/referral/apply": {
        post: { summary: "Apply referral code", tags: ["Referral"], security: [{ BearerAuth: [] }], responses: { "200": { description: "Applied" } } },
      },
      "/api/byok": {
        get: { summary: "List BYOK keys", tags: ["BYOK"], security: [{ BearerAuth: [] }], responses: { "200": { description: "Key list" } } },
        post: { summary: "Register BYOK key", tags: ["BYOK"], security: [{ BearerAuth: [] }], responses: { "200": { description: "Registered" } } },
      },
      "/api/calculate": {
        get: { summary: "Estimate cost", tags: ["Pricing"], security: [{ BearerAuth: [] }], parameters: [{ name: "model", in: "query", required: true, schema: { type: "string" } }, { name: "input_tokens", in: "query", schema: { type: "integer" } }, { name: "output_tokens", in: "query", schema: { type: "integer" } }], responses: { "200": { description: "Cost estimate" } } },
      },
      "/api/admin/users": {
        get: { summary: "List all users", tags: ["Admin"], security: [{ BearerAuth: [] }], responses: { "200": { description: "User list" }, "403": { description: "Admin access required" } } },
      },
      "/api/admin/usage": {
        get: { summary: "Platform-wide usage", tags: ["Admin"], security: [{ BearerAuth: [] }], parameters: [{ name: "days", in: "query", schema: { type: "integer", default: 7 } }], responses: { "200": { description: "Usage stats" } } },
      },
      "/api/admin/health": {
        get: { summary: "System health", tags: ["Admin"], security: [{ BearerAuth: [] }], responses: { "200": { description: "Health status" } } },
      },
      "/health": {
        get: { summary: "Health check", tags: ["System"], responses: { "200": { description: "OK" } } },
      },
    },
    components: {
      securitySchemes: {
        BearerAuth: { type: "http", scheme: "bearer", description: "API key (wn_...) or JWT token" },
      },
      schemas: {
        ChatRequest: {
          type: "object",
          required: ["model", "messages"],
          properties: {
            model: { type: "string", description: "Model ID (e.g., openai/gpt-4o)" },
            messages: { type: "array", items: { type: "object", properties: { role: { type: "string", enum: ["system", "user", "assistant"] }, content: { type: "string" } } } },
            temperature: { type: "number", minimum: 0, maximum: 2 },
            max_tokens: { type: "integer", minimum: 1, maximum: 200000 },
            top_p: { type: "number", minimum: 0, maximum: 1 },
            stream: { type: "boolean" },
          },
        },
        ChatResponse: {
          type: "object",
          properties: {
            id: { type: "string" },
            object: { type: "string" },
            model: { type: "string" },
            choices: { type: "array" },
            usage: { type: "object" },
          },
        },
        Model: {
          type: "object",
          properties: {
            id: { type: "string" },
            object: { type: "string" },
            owned_by: { type: "string" },
            pricing: { type: "object" },
            capabilities: { type: "object" },
            context_length: { type: "integer" },
          },
        },
      },
    },
    tags: [
      { name: "Chat", description: "Chat completion endpoints" },
      { name: "Models", description: "Model catalog" },
      { name: "Auth", description: "Authentication" },
      { name: "Keys", description: "API key management" },
      { name: "Usage", description: "Usage analytics" },
      { name: "Billing", description: "Balance & payments" },
      { name: "Budget", description: "Spending limits & alerts" },
      { name: "Pricing", description: "Tiers & upgrades" },
      { name: "Referral", description: "Referral system" },
      { name: "BYOK", description: "Bring Your Own Key" },
      { name: "Admin", description: "Admin panel (is_admin flag)" },
      { name: "System", description: "Health & status" },
    ],
  };
}
