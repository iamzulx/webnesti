import http from "http";

function req(method, path, headers = {}, body = null) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : "";
    const opts = {
      hostname: "localhost", port: 3000, path, method,
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data), ...headers },
    };
    const r = http.request(opts, (res) => {
      let b = "";
      res.on("data", (c) => (b += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b || "{}") }); }
        catch { resolve({ status: res.statusCode, body: b }); }
      });
    });
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  console.log("=== 1. Register new user ===");
  const reg = await req("POST", "/api/auth/register", {}, { email: "her7@webnesti.com", password: "testpass123", name: "HER7 Tester" });
  console.log("Status:", reg.status);
  console.log(JSON.stringify(reg.body, null, 2));

  if (!reg.body.api_key) {
    console.log("FAIL: No API key returned");
    process.exit(1);
  }

  const KEY = reg.body.api_key;

  console.log("\n=== 2. Login with password ===");
  const login = await req("POST", "/api/auth/login", {}, { email: "her7@webnesti.com", password: "testpass123" });
  console.log("Status:", login.status);
  console.log(JSON.stringify(login.body, null, 2));
  const token = login.body.token;

  console.log("\n=== 3. GET /api/auth/me ===");
  const me = await req("GET", "/api/auth/me", { Authorization: "Bearer " + token });
  console.log("Status:", me.status);
  console.log(JSON.stringify(me.body, null, 2));

  console.log("\n=== 4. List API keys (from registration) ===");
  const keys = await req("GET", "/api/keys", { Authorization: "Bearer " + KEY });
  console.log("Status:", keys.status);
  console.log(JSON.stringify(keys.body, null, 2));

  console.log("\n=== 5. Top up with new key ===");
  const topup = await req("POST", "/api/billing/topup", { Authorization: "Bearer " + KEY }, { amount: 2.0 });
  console.log("Status:", topup.status);
  console.log(JSON.stringify(topup.body, null, 2));

  console.log("\n=== 6. Check /api/auth/me (balance updated) ===");
  const me2 = await req("GET", "/api/auth/me", { Authorization: "Bearer " + token });
  console.log("Status:", me2.status);
  console.log(JSON.stringify(me2.body, null, 2));

  console.log("\n=== 7. Login with wrong password ===");
  const badLogin = await req("POST", "/api/auth/login", {}, { email: "her7@webnesti.com", password: "wrongpassword" });
  console.log("Status:", badLogin.status);
  console.log(JSON.stringify(badLogin.body, null, 2));

  console.log("\n=== 8. Register duplicate email ===");
  const dupReg = await req("POST", "/api/auth/register", {}, { email: "her7@webnesti.com", password: "anotherpass" });
  console.log("Status:", dupReg.status);
  console.log(JSON.stringify(dupReg.body, null, 2));

  console.log("\n=== 9. Register with short password ===");
  const shortReg = await req("POST", "/api/auth/register", {}, { email: "another@webnesti.com", password: "123" });
  console.log("Status:", shortReg.status);
  console.log(JSON.stringify(shortReg.body, null, 2));

  console.log("\n=== ALL TESTS COMPLETE ===");
})();
