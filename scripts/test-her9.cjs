const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const key = fs.readFileSync(path.join(os.homedir(), "admin_key.txt"), "utf8").trim();

function req(method, urlPath) {
  return new Promise((resolve) => {
    const r = http.request(
      { hostname: "localhost", port: 3000, path: urlPath, method, headers: { Authorization: "Bearer " + key } },
      (res) => {
        let b = "";
        res.on("data", (c) => (b += c));
        res.on("end", () => { try { resolve(JSON.parse(b)); } catch { resolve(b); } });
      }
    );
    r.end();
  });
}

async function main() {
  console.log("=== Admin Health ===");
  const health = await req("GET", "/api/admin/health");
  console.log(JSON.stringify(health, null, 2));

  console.log("\n=== Admin Users ===");
  const users = await req("GET", "/api/admin/users");
  console.log(`Total users: ${users.pagination?.total}`);
  users.data?.forEach((u) => console.log(`  ${u.email} | ${u.tier} | balance=$${u.balance}`));

  console.log("\n=== Admin Usage (7d) ===");
  const usage = await req("GET", "/api/admin/usage?days=7");
  console.log(`Requests: ${usage.summary?.total_requests}, Revenue: $${usage.summary?.total_revenue}, Users: ${usage.summary?.active_users}`);
  console.log("By provider:");
  usage.by_provider?.forEach((p) => console.log(`  ${p.provider_id}: ${p.requests} req, $${p.revenue}`));

  console.log("\n=== Admin Providers ===");
  const providers = await req("GET", "/api/admin/providers");
  providers.data?.forEach((p) => console.log(`  ${p.id}: loaded=${p.is_loaded}, models=${p.model_count}`));

  console.log("\n=== Budget ===");
  const budget = await req("GET", "/api/budget");
  console.log(JSON.stringify(budget, null, 2));

  console.log("\n=== Budget Alerts ===");
  const alerts = await req("GET", "/api/budget/alerts");
  console.log(JSON.stringify(alerts, null, 2));
}

main();
