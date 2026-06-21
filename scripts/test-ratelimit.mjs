import http from "http";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const key = readFileSync(join(homedir(), "rl_key.txt"), "utf8").trim();

function req(): Promise<{ status: number; remaining: string; limit: string; policy: string }> {
  return new Promise((resolve) => {
    const r = http.request(
      { hostname: "localhost", port: 3000, path: "/v1/models", method: "GET", headers: { Authorization: "Bearer " + key } },
      (res) => {
        let b = "";
        res.on("data", (c) => (b += c));
        res.on("end", () =>
          resolve({
            status: res.statusCode || 0,
            remaining: res.headers["x-ratelimit-remaining"] as string || "?",
            limit: res.headers["x-ratelimit-limit"] as string || "?",
            policy: res.headers["x-ratelimit-policy"] as string || "?",
          })
        );
      }
    );
    r.end();
  });
}

async function main() {
  console.log("Testing sliding window rate limiter (limit=3 req/min)...\n");
  for (let i = 1; i <= 6; i++) {
    const r = await req();
    const icon = r.status === 429 ? "❌" : "✅";
    console.log(`${icon} Request ${i}: status=${r.status} remaining=${r.remaining}/${r.limit} policy=${r.policy}`);
  }
}

main();
