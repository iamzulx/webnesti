#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "=== WebNesti Test Suite ==="
echo ""

# 1. Encryption tests
echo "1. Encryption tests..."
node --import tsx test/encryption.test.ts

# 2. Validator tests
echo ""
echo "2. Validator tests..."
node --import tsx test/validators.test.ts

# 3. Cache tests
echo ""
echo "3. Cache tests..."
node --import tsx test/cache.test.ts

# 4. Error classes tests
echo ""
echo "4. Error classes tests..."
node --import tsx test/errors.test.ts

# 5. Metrics tests
echo ""
echo "5. Metrics tests..."
node --import tsx test/metrics.test.ts

# 6. Routing strategies tests
echo ""
echo "6. Routing strategies tests..."
node --import tsx test/strategies.test.ts

# 7. Fallback tests
echo ""
echo "7. Fallback tests..."
node --import tsx test/fallback.test.ts

# 8. Start server briefly and test endpoints
echo ""
echo "8. Endpoint smoke tests..."
node --import tsx -e "
import { getDb } from './src/db/index.js';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import viewsRoutes from './src/routes/views.js';
import { renderMetrics, setGauge } from './src/metrics.js';

async function test() {
  await getDb();
  const app = new Hono();
  app.route('/views', viewsRoutes);
  // Add /metrics endpoint for testing
  app.get('/metrics', (c) => {
    setGauge('webnesti_uptime_seconds', Math.round(process.uptime()));
    return c.text(renderMetrics(), 200, { 'Content-Type': 'text/plain; version=0.0.4' });
  });
  const server = serve({ fetch: app.fetch, port: 18999 }, async () => {
    const routes = ['/views/dashboard','/views/models','/views/playground','/views/keys',
                    '/views/usage','/views/billing','/views/budget','/views/pricing',
                    '/views/referral','/views/byok','/views/auth','/views/health','/metrics'];
    let ok = 0, fail = 0;
    for (const r of routes) {
      const res = await fetch('http://localhost:18999' + r, { redirect: 'manual' });
      if (res.status >= 200 && res.status < 400) { ok++; console.log('  ✅ ' + r + ' → ' + res.status); }
      else { fail++; console.log('  ❌ ' + r + ' → ' + res.status); }
    }
    console.log('\\n  ' + ok + ' passed, ' + fail + ' failed');
    server.close();
    process.exit(fail > 0 ? 1 : 0);
  });
}
test().catch(e => { console.error(e); process.exit(1); });
" 2>&1 | grep -v "^\[db\]"

echo ""
echo "9. Aggregator endpoint tests (/v1/status, /v1/models filter)..."
node --import tsx -e "
import { getDb } from './src/db/index.js';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import modelsRoutes from './src/routes/models.js';
import statusRoutes from './src/routes/status.js';

async function test() {
  await getDb();
  const app = new Hono();
  app.route('/v1/models', modelsRoutes);
  app.route('/v1/status', statusRoutes);
  const server = serve({ fetch: app.fetch, port: 18998 }, async () => {
    let ok = 0, fail = 0;
    const check = (name, cond) => { if (cond) { ok++; console.log('  ✅ ' + name); } else { fail++; console.log('  ❌ ' + name); } };

    const status = await (await fetch('http://localhost:18998/v1/status')).json();
    check('/v1/status has summary + providers array', status.object === 'status' && Array.isArray(status.providers));

    const all = await (await fetch('http://localhost:18998/v1/models')).json();
    check('/v1/models returns list', all.object === 'list' && all.data.length > 0);
    check('/v1/models normalizes pricing to \$/1M', typeof all.data[0].pricing.prompt_per_million === 'number');

    const anthro = await (await fetch('http://localhost:18998/v1/models?providers=anthropic')).json();
    check('?providers= filters by provider', anthro.data.every(m => m.owned_by === 'anthropic') && anthro.data.length < all.data.length);

    const sorted = await (await fetch('http://localhost:18998/v1/models?sort=pricing-low-to-high')).json();
    const prices = sorted.data.map(m => m.pricing.prompt_per_million);
    check('?sort=pricing-low-to-high is ascending', prices.every((p, i) => i === 0 || prices[i-1] <= p));

    console.log('\\n  ' + ok + ' passed, ' + fail + ' failed');
    server.close();
    process.exit(fail > 0 ? 1 : 0);
  });
}
test().catch(e => { console.error(e); process.exit(1); });
" 2>&1 | grep -v "^\[db\]"

echo ""
echo "=== All tests complete ==="
