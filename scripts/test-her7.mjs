import http from "http";

function req(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : "";
    const opts = {
      hostname: "localhost", port: 3000, path, method,
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data), ...headers },
    };
    const r = http.request(opts, (res) => {
      let b = "";
      res.on("data", (c) => (b += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b || "{}"), raw: b }); }
        catch { resolve({ status: res.statusCode, body: null, raw: b }); }
      });
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}

const PASS = "test1234";

async function main() {
  // 1. Register
  console.log("=== 1. REGISTER ===");
  const reg = await req("POST", "/api/auth/register", { email: "hermes3@test.com", password: PASS, name: "Hermes 3" });
  console.log("Status:", reg.status);
  console.log("User:", reg.body.user);
  console.log("Has api_key:", !!reg.body.api_key);
  const userApiKey = reg.body.api_key;
  console.log("API key prefix:", userApiKey?.slice(0, 10));

  // 2. Login
  console.log("\n=== 2. LOGIN ===");
  const login = await req("POST", "/api/auth/login", { email: "hermes3@test.com", password: PASS });
  console.log("Status:", login.status);
  console.log("User:", login.body.user);
  console.log("Has token:", !!login.body.token);
  const jwtToken = login.body.token;

  // 3. Auth /me with JWT
  console.log("\n=== 3. AUTH /me (JWT) ===");
  const me = await req("GET", "/api/auth/me", null, { Authorization: "Bearer " + jwtToken });
  console.log("Status:", me.status);
  console.log("User:", me.body.user);

  // 4. Create API key (using user's API key)
  console.log("\n=== 4. CREATE KEY ===");
  const newKey = await req("POST", "/api/keys", { name: "project-key", rate_limit: 120 }, { Authorization: "Bearer " + userApiKey });
  console.log("Status:", newKey.status);
  console.log("Has key:", !!newKey.body.key);
  console.log("Name:", newKey.body.name);

  // 5. List keys
  console.log("\n=== 5. LIST KEYS ===");
  const keys = await req("GET", "/api/keys", null, { Authorization: "Bearer " + userApiKey });
  console.log("Status:", keys.status);
  console.log("Key count:", keys.body.data?.length);

  // 6. Top up
  console.log("\n=== 6. TOP UP ===");
  const topup = await req("POST", "/api/billing/topup", { amount: 10 }, { Authorization: "Bearer " + userApiKey });
  console.log("Status:", topup.status);
  console.log("Balance:", topup.body.balance);

  // 7. Usage
  console.log("\n=== 7. USAGE ===");
  const usage = await req("GET", "/api/usage", null, { Authorization: "Bearer " + userApiKey });
  console.log("Status:", usage.status);
  console.log("Balance:", usage.body.user?.balance);
  console.log("Requests:", usage.body.summary?.total_requests);

  // 8. Wrong password
  console.log("\n=== 8. WRONG PASSWORD ===");
  const bad = await req("POST", "/api/auth/login", { email: "hermes3@test.com", password: "wrongpassword" });
  console.log("Status:", bad.status);
  console.log("Error:", bad.body.error);

  // 9. Duplicate register
  console.log("\n=== 9. DUPLICATE ===");
  const dup = await req("POST", "/api/auth/register", { email: "hermes3@test.com", password: PASS });
  console.log("Status:", dup.status);
  console.log("Error:", dup.body.error);

  // 10. Missing auth
  console.log("\n=== 10. NO AUTH ===");
  const noAuth = await req("GET", "/api/usage");
  console.log("Status:", noAuth.status);
  console.log("Error:", noAuth.body.error);
}

main().catch(console.error);
