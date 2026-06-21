const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const key = fs.readFileSync(path.join(os.homedir(), "admin_key.txt"), "utf8").trim();

function req(method, urlPath, body) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : "";
    const r = http.request(
      { hostname: "localhost", port: 3000, path: urlPath, method,
        headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } },
      (res) => { let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => { try { resolve(JSON.parse(b)); } catch { resolve(b); } }); }
    );
    if (data) r.write(data);
    r.end();
  });
}

async function main() {
  console.log("=== 1. Pricing Tiers ===");
  const pricing = await req("GET", "/api/pricing");
  pricing.tiers?.forEach((t) => console.log(`  ${t.name}: markup=${t.markup_percent}% min_topup=$${t.min_topup_usd} rate=${t.rate_limit_per_min}/min`));

  console.log("\n=== 2. Current Tier ===");
  const current = await req("GET", "/api/pricing/current");
  console.log(`  Tier: ${current.tier}, Markup: ${current.markup_percent}%, Balance: $${current.balance}`);
  console.log(`  Features: ${current.features?.join(", ")}`);

  console.log("\n=== 3. Cost Calculator ===");
  const calc = await req("GET", "/api/calculate?model=openai/gpt-4o&input_tokens=1000&output_tokens=500");
  console.log(`  Model: ${calc.model}`);
  console.log(`  Input: ${calc.input_tokens} tokens × $${calc.pricing?.input_per_token}/token`);
  console.log(`  Output: ${calc.output_tokens} tokens × $${calc.pricing?.output_per_token}/token`);
  console.log(`  Base cost: $${calc.cost?.base_usd}`);
  console.log(`  Markup: ${calc.cost?.markup_percent}%`);
  console.log(`  Total: $${calc.cost?.total_usd}`);
  console.log(`  Affordable: ${calc.affordable}`);

  console.log("\n=== 4. Referral Code ===");
  const referral = await req("GET", "/api/referral");
  console.log(`  Code: ${referral.code}`);
  console.log(`  Link: ${referral.referral_link}`);
  console.log(`  Referrals: ${referral.referrals_count}`);
  console.log(`  Earned: $${referral.total_earned}`);
  console.log(`  Reward: $${referral.reward_per_referral}/referral`);

  console.log("\n=== 5. Cost Calculator (cheap model) ===");
  const calc2 = await req("GET", "/api/calculate?model=deepseek/deepseek-chat&input_tokens=5000&output_tokens=2000");
  console.log(`  ${calc2.model}: $${calc2.cost?.total_usd} (${calc2.input_tokens}+${calc2.output_tokens} tokens)`);

  console.log("\n=== 6. Cost Calculator (expensive model) ===");
  const calc3 = await req("GET", "/api/calculate?model=anthropic/claude-3-opus-20240229&input_tokens=1000&output_tokens=1000");
  console.log(`  ${calc3.model}: $${calc3.cost?.total_usd} (${calc3.input_tokens}+${calc3.output_tokens} tokens)`);

  console.log("\n=== 7. Upgrade (should fail - already enterprise) ===");
  const upgrade = await req("POST", "/api/pricing/upgrade", { tier: "pro" });
  console.log(`  ${upgrade.error || "Upgraded"}`);
}

main();
