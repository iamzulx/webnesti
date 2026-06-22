/**
 * WebNesti Dashboard — Client-side JavaScript
 * 
 * XSS Note: innerHTML is used only for:
 * 1. Trusted UI elements (cards, alerts, badges generated from this script)
 * 2. API error messages (displayed as-is from our own API)
 * 3. User content in playground is escaped via escapeHtml() before use
 * No untrusted server-rendered HTML is injected.
 */

(function () {
  const API_BASE = ""; // relative, same origin

  // --- Utility: fetch wrapper ---
  async function api(method, path, body) {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(path, opts);
    try { return await res.json(); } catch { return { error: "Server error" }; }
  }

  // --- Auth: Login ---
  window.doLogin = async function () {
    const form = document.getElementById("login-form");
    const email = form.querySelector('[name="email"]').value;
    const password = form.querySelector('[name="password"]').value;
    const res = await api("POST", "/api/auth/login", { email, password });
    if (res.error) {
      alert(res.error);
      return;
    }
    window.location.href = "/views/dashboard";
  };

  // --- Auth: Register ---
  window.doRegister = async function () {
    const form = document.getElementById("register-form");
    const email = form.querySelector('[name="email"]').value;
    const password = form.querySelector('[name="password"]').value;
    const name = form.querySelector('[name="name"]')?.value || "";
    const res = await api("POST", "/api/auth/register", { email, password, name });
    if (res.error) {
      alert(res.error);
      return;
    }
    if (res.api_key) {
      alert("Account created! Your API key:\n" + res.api_key + "\n\nSave it now — it won't be shown again.");
      window.location.href = "/views/dashboard";
    }
  };

  // --- API Keys: Create ---
  window.createKey = async function () {
    const name = document.querySelector('[x-model="name"]')?.value || "default";
    const rate = parseInt(document.querySelector('[x-model="rate"]')?.value) || 60;
    const daily = parseInt(document.querySelector('[x-model="daily"]')?.value) || 10000;
    const res = await api("POST", "/api/keys", { name, rate_limit: rate, daily_limit: daily });
    const el = document.getElementById("new-key-result");
    if (res.key) {
      el.innerHTML = '<div class="card" style="background:#10b98110;border-color:#10b981"><h4 style="color:#10b981;margin-bottom:8px">✅ Key Created!</h4><pre style="background:#1e293b;padding:12px;border-radius:8px;font-size:13px;word-break:break-all">' + res.key + '</pre><p style="font-size:12px;color:#9ca3af;margin-top:8px">Save this key — it will not be shown again.</p></div>';
    } else if (res.error) {
      el.innerHTML = '<div class="card" style="background:#ef444410;border-color:#ef4444"><p style="color:#ef4444">' + JSON.stringify(res.error) + '</p></div>';
    }
  };

  // --- API Keys: Revoke ---
  window.revokeKey = async function (id) {
    if (!confirm("Revoke this API key?")) return;
    const res = await api("DELETE", "/api/keys/" + id);
    if (res.deleted) location.reload();
  };

  // --- Billing: Top Up ---
  document.getElementById("topup-btn")?.addEventListener("click", async () => {
    const amount = parseInt(document.getElementById("topup-amount").value);
    if (!amount || amount < 1000) { alert("Minimum top-up: Rp1.000"); return; }
    const res = await api("POST", "/api/midtrans/create", { amount });
    const el = document.getElementById("topup-result");
    if (res.snap_redirect_url) {
      el.innerHTML = '<a href="' + res.snap_redirect_url + '" target="_blank" class="btn-primary" style="display:inline-block;text-decoration:none;margin-top:8px">Complete Payment</a>';
    } else if (res.error) {
      el.innerHTML = '<p style="color:#ef4444;margin-top:8px">' + (res.error.message || JSON.stringify(res.error)) + '</p>';
    }
  });

  // --- Budget: Save ---
  document.getElementById("budget-save")?.addEventListener("click", async () => {
    const monthlyBudget = parseFloat(document.getElementById("budget-monthly").value);
    const res = await api("PUT", "/api/budget", { monthly_budget: monthlyBudget || null });
    if (res.updated) { alert("Budget updated!"); location.reload(); }
    else if (res.error) { alert(res.error); }
  });

  // --- Pricing: Upgrade ---
  window.upgradeTo = async function (tier) {
    if (!confirm("Upgrade to " + tier + " tier?")) return;
    const res = await api("POST", "/api/pricing/upgrade", { tier });
    if (res.upgraded) { alert("Upgraded to " + tier + "!"); location.reload(); }
    else if (res.error) { alert(res.error); }
  };

  // --- Pricing: Calculator ---
  async function calculate() {
    const model = document.getElementById("calc-model")?.value || "openai/gpt-4o";
    const input = parseInt(document.getElementById("calc-input")?.value) || 1000;
    const output = parseInt(document.getElementById("calc-output")?.value) || 500;
    const res = await api("GET", "/api/calculate?model=" + encodeURIComponent(model) + "&input_tokens=" + input + "&output_tokens=" + output);
    const el = document.getElementById("calc-result");
    if (res.model) {
      el.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px"><div><div style="font-size:11px;color:#9ca3af">Base Cost</div><div style="font-size:18px;font-weight:700;color:#0ea5e9">$' + (res.cost?.base_usd || 0).toFixed(6) + '</div></div><div><div style="font-size:11px;color:#9ca3af">Markup (' + res.cost?.markup_percent + '%)</div><div style="font-size:18px;font-weight:700;color:#f59e0b">$' + (res.cost?.markup_usd || 0).toFixed(6) + '</div></div><div><div style="font-size:11px;color:#9ca3af">Total</div><div style="font-size:18px;font-weight:700;color:#10b981">$' + (res.cost?.total_usd || 0).toFixed(6) + '</div></div></div>';
    }
  }
  ["calc-model", "calc-input", "calc-output"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", calculate);
  });
  calculate(); // initial calc

  // --- Referral: Apply ---
  document.getElementById("referral-apply-btn")?.addEventListener("click", async () => {
    const code = document.getElementById("referral-apply-code")?.value;
    if (!code) { alert("Enter a referral code"); return; }
    const res = await api("POST", "/api/referral/apply", { code });
    const el = document.getElementById("referral-apply-result");
    if (res.applied) {
      el.innerHTML = '<div style="color:#10b981;font-size:14px">✅ ' + res.message + '</div>';
    } else if (res.error) {
      el.innerHTML = '<div style="color:#ef4444;font-size:14px">❌ ' + res.error + '</div>';
    }
  });

  // --- Referral: Copy ---
  window.copyReferralLink = function () {
    const link = document.querySelector('[style*="word-break"]')?.textContent?.trim();
    if (link) {
      navigator.clipboard.writeText(link).then(() => alert("Copied!"));
    }
  };

  // --- Playground: Chat ---
  (function initPlayground() {
    const sendBtn = document.getElementById("pg-send");
    const input = document.getElementById("pg-input");
    const messages = document.getElementById("pg-messages");
    const modelSelect = document.getElementById("pg-model");
    const systemEl = document.getElementById("pg-system");

    if (!sendBtn || !input || !messages || !modelSelect) return;

    let history = [];

    sendBtn.addEventListener("click", async () => {
      const text = input.value.trim();
      if (!text) return;

      // Add user message
      const userDiv = document.createElement("div");
      userDiv.style.cssText = "margin-bottom:16px;padding:12px 16px;border-radius:12px;max-width:85%;margin-left:auto;background:#0ea5e920;border:1px solid #0ea5e940";
      userDiv.innerHTML = '<div style="font-size:11px;font-weight:600;margin-bottom:4px;color:#0ea5e9">user</div><div style="font-size:14px;line-height:1.6;white-space:pre-wrap">' + escapeHtml(text) + '</div>';
      messages.appendChild(userDiv);

      // Clear input, show loading
      input.value = "";
      const loading = document.createElement("div");
      loading.style.cssText = "color:#6b7280;font-size:14px;padding:12px 16px";
      loading.textContent = "Thinking...";
      messages.appendChild(loading);
      messages.scrollTop = messages.scrollHeight;

      // Build messages array
      const sysMsg = systemEl?.value?.trim();
      const msgList = sysMsg ? [{ role: "system", content: sysMsg }] : [];
      msgList.push(...history, { role: "user", content: text });

      try {
        const res = await fetch("/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: modelSelect.value, messages: msgList, max_tokens: 4096 }),
        });
        const data = await res.json();
        loading.remove();

        if (data.error) {
          const errDiv = document.createElement("div");
          errDiv.style.cssText = "color:#ef4444;padding:12px 16px";
          errDiv.textContent = "Error: " + data.error.message;
          messages.appendChild(errDiv);
        } else if (data.choices?.[0]?.message?.content) {
          const reply = data.choices[0].message.content;
          history.push({ role: "user", content: text }, { role: "assistant", content: reply });
          // Keep last 10 messages for context
          if (history.length > 20) history = history.slice(-20);

          const replyDiv = document.createElement("div");
          replyDiv.style.cssText = "margin-bottom:16px;padding:12px 16px;border-radius:12px;max-width:85%;background:#1e293b;border:1px solid #374151";
          const cost = data.webnesti?.cost_usd ? '$' + data.webnesti.cost_usd.toFixed(6) : '';
          replyDiv.innerHTML = '<div style="font-size:11px;font-weight:600;margin-bottom:4px;color:#8b5cf6">assistant</div><div style="font-size:14px;line-height:1.6;white-space:pre-wrap">' + escapeHtml(reply) + '</div>' + (cost ? '<div style="font-size:11px;color:#6b7280;margin-top:6px">Cost: ' + cost + '</div>' : '');
          messages.appendChild(replyDiv);
        }
      } catch (err) {
        loading.remove();
        const errDiv = document.createElement("div");
        errDiv.style.cssText = "color:#ef4444;padding:12px 16px";
        errDiv.textContent = "Network error: " + err.message;
        messages.appendChild(errDiv);
      }
      messages.scrollTop = messages.scrollHeight;
    });

    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendBtn.click(); } });
  })();

  // --- BYOK: Register ---
  document.getElementById("byok-register-btn")?.addEventListener("click", async () => {
    const provider = document.getElementById("byok-provider")?.value;
    const key = document.getElementById("byok-key")?.value;
    if (!provider || !key) { alert("Select provider and enter key"); return; }
    const res = await api("POST", "/api/byok", { provider, key });
    const el = document.getElementById("byok-register-result");
    if (res.registered) { el.innerHTML = '<div style="color:#10b981">✅ Key registered!</div>'; setTimeout(() => location.reload(), 1000); }
    else if (res.error) { el.innerHTML = '<div style="color:#ef4444">❌ ' + res.error + '</div>'; }
  });

  // --- BYOK: Remove ---
  window.removeByokKey = async function (id) {
    if (!confirm("Remove this BYOK key?")) return;
    const res = await api("DELETE", "/api/byok/" + id);
    if (res.removed) location.reload();
  };

  // --- Utility: HTML escape ---
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }
})();
