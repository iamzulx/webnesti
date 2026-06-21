const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const key = fs.readFileSync(path.join(os.homedir(), "rl_key.txt"), "utf8").trim();

function req() {
  return new Promise((resolve) => {
    const r = http.request(
      { hostname: "localhost", port: 3000, path: "/v1/models", method: "GET", headers: { Authorization: "Bearer " + key } },
      (res) => {
        let b = "";
        res.on("data", (c) => (b += c));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            remaining: res.headers["x-ratelimit-remaining"] || "?",
            limit: res.headers["x-ratelimit-limit"] || "?",
            policy: res.headers["x-ratelimit-policy"] || "?",
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
    const icon = r.status === 429 ? "BLOCKED" : "OK";
    console.log(`${icon} Request ${i}: status=${r.status} remaining=${r.remaining}/${r.limit} policy=${r.policy}`);
  }
}

main();
