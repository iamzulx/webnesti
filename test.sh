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

# 3. Start server briefly and test endpoints
echo ""
echo "3. Endpoint smoke tests..."
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
echo "=== All tests complete ==="
