import { registerMetric, inc, setGauge, renderMetrics } from "../src/metrics.js";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) { console.log(`  ✅ ${name}`); passed++; }
    else { console.log(`  ❌ ${name}`); failed++; }
  } catch (e: any) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

console.log("\n=== Metrics Tests ===\n");

test("registerMetric + renderMetrics includes metric in output", () => {
  registerMetric("test_counter", "counter", "A test counter");
  const out = renderMetrics();
  return out.includes("# HELP test_counter A test counter") &&
    out.includes("# TYPE test_counter counter");
});

test("inc increments counter", () => {
  registerMetric("test_inc", "counter", "Inc test");
  inc("test_inc", 1);
  inc("test_inc", 2);
  const out = renderMetrics();
  return out.includes("test_inc 3");
});

test("inc with labels renders label string", () => {
  registerMetric("test_labels", "counter", "Label test");
  inc("test_labels", 1, { method: "GET", status: "200" });
  const out = renderMetrics();
  return out.includes('test_labels{method="GET",status="200"} 1');
});

test("inc with different labels tracks separately", () => {
  registerMetric("test_multi_labels", "counter", "Multi label");
  inc("test_multi_labels", 5, { route: "/a" });
  inc("test_multi_labels", 3, { route: "/b" });
  const out = renderMetrics();
  return out.includes('test_multi_labels{route="/a"} 5') &&
    out.includes('test_multi_labels{route="/b"} 3');
});

test("setGauge sets gauge value", () => {
  registerMetric("test_gauge", "gauge", "Gauge test");
  setGauge("test_gauge", 42);
  const out = renderMetrics();
  return out.includes("test_gauge 42");
});

test("setGauge overwrites previous value", () => {
  registerMetric("test_gauge_overwrite", "gauge", "Overwrite test");
  setGauge("test_gauge_overwrite", 10);
  setGauge("test_gauge_overwrite", 99);
  const out = renderMetrics();
  return out.includes("test_gauge_overwrite 99") && !out.includes("test_gauge_overwrite 10");
});

test("renderMetrics always includes uptime", () => {
  const out = renderMetrics();
  return out.includes("webnesti_uptime_seconds");
});

test("renderMetrics includes TYPE line for registered metrics", () => {
  registerMetric("typed_gauge", "gauge", "Typed gauge");
  const out = renderMetrics();
  return out.includes("# TYPE typed_gauge gauge");
});

test("inc on unregistered metric auto-creates it as counter", () => {
  inc("auto_created", 7);
  const out = renderMetrics();
  return out.includes("auto_created 7");
});

test("labels are sorted alphabetically in output", () => {
  registerMetric("label_sort_test", "counter", "Sort test");
  inc("label_sort_test", 1, { z_key: "z", a_key: "a" });
  const out = renderMetrics();
  return out.includes('label_sort_test{a_key="a",z_key="z"} 1');
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
