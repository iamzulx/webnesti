/**
 * Prometheus-compatible metrics collector.
 * Exposes /metrics endpoint in Prometheus text format.
 */

interface Metric {
  type: "counter" | "gauge" | "histogram";
  help: string;
  values: Map<string, number>;
}

const metrics = new Map<string, Metric>();

function getMetric(name: string): Metric {
  let m = metrics.get(name);
  if (!m) {
    m = { type: "counter", help: "", values: new Map() };
    metrics.set(name, m);
  }
  return m;
}

export function registerMetric(name: string, type: "counter" | "gauge" | "histogram", help: string): void {
  metrics.set(name, { type, help, values: new Map() });
}

export function inc(name: string, value: number = 1, labels: Record<string, string> = {}): void {
  const m = getMetric(name);
  m.type = "counter";
  const key = labelsToString(labels);
  m.values.set(key, (m.values.get(key) || 0) + value);
}

export function setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
  const m = getMetric(name);
  m.type = "gauge";
  const key = labelsToString(labels);
  m.values.set(key, value);
}

function labelsToString(labels: Record<string, string>): string {
  const keys = Object.keys(labels).sort();
  if (keys.length === 0) return "";
  return "{" + keys.map(k => `${k}="${labels[k]}"`).join(",") + "}";
}

export function renderMetrics(): string {
  const lines: string[] = [];
  lines.push("# HELP webnesti_uptime_seconds Process uptime in seconds");
  lines.push("# TYPE webnesti_uptime_seconds gauge");
  lines.push("webnesti_uptime_seconds " + Math.round(process.uptime()));
  lines.push("");

  for (const [name, metric] of metrics) {
    lines.push("# HELP " + name + " " + metric.help);
    lines.push("# TYPE " + name + " " + metric.type);
    for (const entry of metric.values.entries()) {
      const key = entry[0];
      const value = entry[1];
      lines.push(key ? name + key + " " + value : name + " " + value);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// Register standard metrics
registerMetric("http_requests_total", "counter", "Total HTTP requests");
registerMetric("http_request_duration_ms_total", "counter", "Total HTTP request duration in ms");
registerMetric("chat_requests_total", "counter", "Total chat completion requests");
registerMetric("chat_errors_total", "counter", "Total chat errors");
registerMetric("tokens_total", "counter", "Total tokens processed");
