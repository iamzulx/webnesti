/**
 * WebNesti Dashboard — Client-side JavaScript
 *
 * XSS Note: innerHTML is used only for:
 * 1. Toast notifications — content generated from this script or escaped via escapeHtml()
 * 2. Skeleton/loading states — static HTML templates
 * 3. Playground user messages — escaped via escapeHtml() before DOM insertion
 * 4. API response display — error messages come from our own API (trusted)
 * No untrusted server-rendered HTML is ever injected via innerHTML.
 */

(function () {
  const API_BASE = ""; // relative, same origin

  // ============================================================
  // TOAST NOTIFICATION SYSTEM
  // Replaces all alert() calls with proper UI notifications
  // ============================================================
  const TOAST_DURATION = 4000;
  let toastId = 0;

  window.showToast = function (message, type = "info", duration = TOAST_DURATION) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const id = ++toastId;
    const icons = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.id = `toast-${id}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span style="flex:1">${escapeHtml(message)}</span><span class="toast-close" onclick="window.dismissToast(${id})">✕</span>`;
    container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => window.dismissToast(id), duration);
    }
  };

  window.dismissToast = function (id) {
    const el = document.getElementById(`toast-${id}`);
    if (!el) return;
    el.classList.add("removing");
    el.addEventListener("animationend", () => el.remove());
    setTimeout(() => el.remove(), 350); // fallback
  };

  // Override alert() to use toasts (for legacy code)
  const _origAlert = window.alert;
  window.alert = function (msg) {
    // Use toast only if container exists (we're on a dashboard page)
    if (document.getElementById("toast-container")) {
      window.showToast(msg, "info");
    } else {
      _origAlert(msg);
    }
  };

  // ============================================================
  // UTILITY: Fetch wrapper with toast on errors
  // ============================================================
  async function api(method, path, body) {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(path, opts);
    try {
      const data = await res.json();
      if (!res.ok && data.error) {
        window.showToast(data.error.message || data.error, "error");
      }
      return data;
    } catch {
      window.showToast("Server error — please try again", "error");
      return { error: "Server error" };
    }
  }

  // ============================================================
  // COPY TO CLIPBOARD — with visual feedback
  // ============================================================
  window.copyToClipboard = async function (text, btnEl) {
    try {
      await navigator.clipboard.writeText(text);
      if (btnEl) {
        const orig = btnEl.innerHTML;
        btnEl.innerHTML = "✅ Copied";
        btnEl.classList.add("copied");
        setTimeout(() => { btnEl.innerHTML = orig; btnEl.classList.remove("copied"); }, 2000);
      }
      window.showToast("Copied to clipboard", "success", 2000);
    } catch {
      window.showToast("Failed to copy", "error");
    }
  };

  // ============================================================
  // AUTH: Login
  // ============================================================
  window.doLogin = async function () {
    const form = document.getElementById("login-form");
    const email = form.querySelector('[name="email"]').value;
    const password = form.querySelector('[name="password"]').value;
    if (!email || !password) { window.showToast("Please fill in all fields", "warning"); return; }
    const res = await api("POST", "/api/auth/login", { email, password });
    if (!res.error) {
      window.showToast("Login successful!", "success");
      setTimeout(() => { window.location.href = "/views/dashboard"; }, 800);
    }
  };

  // ============================================================
  // AUTH: Register
  // ============================================================
  window.doRegister = async function () {
    const form = document.getElementById("register-form");
    const email = form.querySelector('[name="email"]').value;
    const password = form.querySelector('[name="password"]').value;
    const name = form.querySelector('[name="name"]')?.value || "";
    if (!email || !password) { window.showToast("Please fill in all fields", "warning"); return; }
    if (password.length < 8) { window.showToast("Password must be at least 8 characters", "warning"); return; }
    const res = await api("POST", "/api/auth/register", { email, password, name });
    if (!res.error && res.api_key) {
      // Show API key in a toast-friendly modal-like toast
      window.showToast("Account created! API key: " + res.api_key + " — save it now!", "success", 8000);
      setTimeout(() => { window.location.href = "/views/dashboard"; }, 3000);
    }
  };

  // ============================================================
  // API Keys: Create
  // ============================================================
  window.createKey = async function () {
    const nameEl = document.querySelector('[x-model="name"]');
    const rateEl = document.querySelector('[x-model="rate"]');
    const dailyEl = document.querySelector('[x-model="daily"]');
    const name = nameEl?.value || "default";
    const rate = parseInt(rateEl?.value) || 60;
    const daily = parseInt(dailyEl?.value) || 10000;
    const btn = document.querySelector('[x-on\\:click="createKey()"]');
    if (btn) { btn.disabled = true; btn.textContent = "Creating..."; }

    const res = await api("POST", "/api/keys", { name, rate_limit: rate, daily_limit: daily });
    const el = document.getElementById("new-key-result");

    if (res.key) {
      el.innerHTML = '<div class="card" style="background:#065f46;border-color:#10b981"><h4 style="color:#6ee7b7;margin-bottom:8px">✅ Key Created!</h4><div style="display:flex;align-items:center;gap:8px"><pre style="flex:1;background:#1e293b;padding:12px;border-radius:8px;font-size:13px;word-break:break-all;color:#e5e7eb">' + escapeHtml(res.key) + '</pre><button class="copy-btn" onclick="window.copyToClipboard(\'' + res.key + '\', this)">📋 Copy</button></div><p style="font-size:12px;color:#6b7280;margin-top:8px">Save this key — it will not be shown again.</p></div>';
      window.showToast("API key created successfully!", "success");
      // Auto-reload to show new key in table after 3s
      setTimeout(() => location.reload(), 3000);
    } else if (res.error) {
      el.innerHTML = '<div class="card" style="background:#7f1d1d;border-color:#ef4444"><p style="color:#fca5a5">' + escapeHtml(typeof res.error === "string" ? res.error : JSON.stringify(res.error)) + '</p></div>';
    }
    if (btn) { btn.disabled = false; btn.textContent = "Create API Key"; }
  };

  // ============================================================
  // API Keys: Revoke
  // ============================================================
  window.revokeKey = async function (id) {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    const res = await api("DELETE", "/api/keys/" + id);
    if (!res.error && res.deleted) {
      window.showToast("API key revoked", "success");
      setTimeout(() => location.reload(), 500);
    }
  };

  // ============================================================
  // Billing: Top Up via Midtrans
  // ============================================================
  document.getElementById("topup-btn")?.addEventListener("click", async () => {
    const amount = parseInt(document.getElementById("topup-amount").value);
    if (!amount || amount < 1000) { window.showToast("Minimum top-up: Rp1.000", "warning"); return; }
    const btn = document.getElementById("topup-btn");
    btn.disabled = true; btn.textContent = "Processing...";
    const res = await api("POST", "/api/midtrans/create", { amount });
    const el = document.getElementById("topup-result");
    if (res.snap_redirect_url) {
      el.innerHTML = '<a href="' + res.snap_redirect_url + '" target="_blank" class="btn-primary" style="display:inline-block;text-decoration:none;margin-top:8px">Complete Payment →</a>';
      window.showToast("Payment link created!", "success");
    } else if (res.error) {
      el.innerHTML = '<p style="color:#ef4444;margin-top:8px">' + escapeHtml(res.error.message || JSON.stringify(res.error)) + '</p>';
    }
    btn.disabled = false; btn.textContent = "Pay with Midtrans";
  });

  // ============================================================
  // Budget: Save
  // ============================================================
  document.getElementById("budget-save")?.addEventListener("click", async () => {
    const monthlyBudget = parseFloat(document.getElementById("budget-monthly").value);
    if (isNaN(monthlyBudget) || monthlyBudget < 0) { window.showToast("Enter a valid amount or leave empty to remove", "warning"); return; }
    const btn = document.getElementById("budget-save");
    btn.disabled = true; btn.textContent = "Saving...";
    const res = await api("PUT", "/api/budget", { monthly_budget: monthlyBudget || null });
    if (!res.error && res.updated) {
      window.showToast("Budget updated!", "success");
      setTimeout(() => location.reload(), 500);
    }
    btn.disabled = false; btn.textContent = "Save";
  });

  // ============================================================
  // Pricing: Upgrade
  // ============================================================
  window.upgradeTo = async function (tier) {
    if (!confirm("Upgrade to " + tier + " tier? This will deduct from your balance.")) return;
    const res = await api("POST", "/api/pricing/upgrade", { tier });
    if (!res.error && res.upgraded) {
      window.showToast("Upgraded to " + tier + " tier!", "success");
      setTimeout(() => location.reload(), 500);
    }
  };

  // ============================================================
  // Pricing: Cost Calculator
  // ============================================================
  async function calculate() {
    const modelEl = document.getElementById("calc-model");
    const inputEl = document.getElementById("calc-input");
    const outputEl = document.getElementById("calc-output");
    if (!modelEl || !inputEl || !outputEl) return;
    const model = modelEl.value || "openai/gpt-5.5";
    const input = parseInt(inputEl.value) || 1000;
    const output = parseInt(outputEl.value) || 500;
    const res = await api("GET", "/api/calculate?model=" + encodeURIComponent(model) + "&input_tokens=" + input + "&output_tokens=" + output);
    const el = document.getElementById("calc-result");
    if (res.model && res.cost) {
      el.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px"><div><div style="font-size:11px;color:#9ca3af">Base Cost</div><div style="font-size:18px;font-weight:700;color:#0ea5e9">$' + (res.cost.base_usd || 0).toFixed(6) + '</div></div><div><div style="font-size:11px;color:#9ca3af">Markup (' + res.cost.markup_percent + '%)</div><div style="font-size:18px;font-weight:700;color:#f59e0b">$' + (res.cost.markup_usd || 0).toFixed(6) + '</div></div><div><div style="font-size:11px;color:#9ca3af">Total</div><div style="font-size:18px;font-weight:700;color:#10b981">$' + (res.cost.total_usd || 0).toFixed(6) + '</div></div></div>';
    }
  }
  ["calc-model", "calc-input", "calc-output"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", calculate);
  });

  // ============================================================
  // Referral: Apply
  // ============================================================
  document.getElementById("referral-apply-btn")?.addEventListener("click", async () => {
    const code = document.getElementById("referral-apply-code")?.value;
    if (!code) { window.showToast("Enter a referral code", "warning"); return; }
    const res = await api("POST", "/api/referral/apply", { code });
    const el = document.getElementById("referral-apply-result");
    if (!res.error && res.applied) {
      el.innerHTML = '<div style="color:#10b981;font-size:14px">✅ ' + escapeHtml(res.message) + '</div>';
      window.showToast("Referral applied!", "success");
    } else if (res.error) {
      el.innerHTML = '<div style="color:#ef4444;font-size:14px">❌ ' + escapeHtml(res.error) + '</div>';
    }
  });

  // ============================================================
  // Referral: Copy Link
  // ============================================================
  window.copyReferralLink = function () {
    const el = document.querySelector('[style*="word-break"]');
    if (el) window.copyToClipboard(el.textContent?.trim());
  };

  // ============================================================
  // KEYBOARD SHORTCUTS
  // ============================================================
  document.addEventListener("keydown", (e) => {
    // Escape closes mobile sidebar (Alpine x-data on body)
    if (e.key === "Escape") {
      const body = document.querySelector("body[x-data]");
      if (body && body.__x && body.__x.$data.sidebarOpen) {
        body.__x.$data.sidebarOpen = false;
      }
    }
  });

  // ============================================================
  // PLAYGROUND — Streaming Chat with SSE
  // ============================================================
  (function initPlayground() {
    const sendBtn = document.getElementById("pg-send");
    const input = document.getElementById("pg-input");
    const messagesEl = document.getElementById("pg-messages");
    const modelSelect = document.getElementById("pg-model");
    const systemEl = document.getElementById("pg-system");

    if (!sendBtn || !input || !messagesEl || !modelSelect) return;

    let history = [];
    let streaming = false;

    // Restore conversation from localStorage
    try {
      const saved = localStorage.getItem("pg_conversation");
      if (saved) {
        const msgs = JSON.parse(saved);
        history = msgs;
        msgs.forEach(m => appendMessage(m.role, m.content, false));
      }
    } catch {}

    function appendMessage(role, content, animate = true) {
      // Clear "empty" placeholder
      if (messagesEl.querySelector('[style*="text-align:center"]')) {
        messagesEl.innerHTML = "";
      }
      const div = document.createElement("div");
      const isUser = role === "user";
      div.style.cssText = `margin-bottom:16px;padding:12px 16px;border-radius:12px;max-width:85%;${isUser ? "margin-left:auto;background:#0ea5e920;border:1px solid #0ea5e940" : "background:#1e293b;border:1px solid #374151"}${animate ? ";animation:fadeIn .3s ease-out" : ""}`;
      div.innerHTML = `<div style="font-size:11px;font-weight:600;margin-bottom:4px;${isUser ? "color:#0ea5e9" : "color:#8b5cf6"}">${escapeHtml(role)}</div><div class="msg-content" style="font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(content)}</div>`;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return div;
    }

    function appendStreamMessage(role) {
      if (messagesEl.querySelector('[style*="text-align:center"]')) {
        messagesEl.innerHTML = "";
      }
      const div = document.createElement("div");
      div.style.cssText = "margin-bottom:16px;padding:12px 16px;border-radius:12px;max-width:85%;background:#1e293b;border:1px solid #374151";
      div.innerHTML = `<div style="font-size:11px;font-weight:600;margin-bottom:4px;color:#8b5cf6">${role}</div><div class="msg-content" style="font-size:14px;line-height:1.6;white-space:pre-wrap"></div>`;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return div.querySelector(".msg-content");
    }

    async function sendMessage() {
      const text = input.value.trim();
      if (!text || streaming) return;

      streaming = true;
      sendBtn.disabled = true;
      sendBtn.textContent = "⏳";

      // Add user message
      appendMessage("user", text);
      history.push({ role: "user", content: text });
      input.value = "";

      // Build messages array
      const sysMsg = systemEl?.value?.trim();
      const msgList = sysMsg ? [{ role: "system", content: sysMsg }] : [];
      msgList.push(...history);

      try {
        const res = await fetch("/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: modelSelect.value, messages: msgList, max_tokens: 4096, stream: true }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          streaming = false;
          sendBtn.disabled = false;
          sendBtn.textContent = "Send";
          window.showToast(errData.error?.message || "Request failed", "error");
          return;
        }

        // Streaming response via SSE
        const contentEl = appendStreamMessage("assistant");
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        let buffer = "";

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const chunk = JSON.parse(data);
              const delta = chunk.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
                contentEl.textContent = fullContent;
                messagesEl.scrollTop = messagesEl.scrollHeight;
              }
            } catch {}
          }
        }

        // Streaming done
        history.push({ role: "assistant", content: fullContent });

        // Keep last 20 messages for context (memory management)
        if (history.length > 20) history = history.slice(-20);

        // Save to localStorage
        try { localStorage.setItem("pg_conversation", JSON.stringify(history)); } catch {}

        // Add cost info if available (from webnesti metadata — not in stream, show N/A)
        const costDiv = document.createElement("div");
        costDiv.style.cssText = "font-size:11px;color:#6b7280;margin-top:6px";
        costDiv.textContent = "Streamed response";
        contentEl.parentNode.appendChild(costDiv);

      } catch (err) {
        window.showToast("Network error: " + err.message, "error");
      }

      streaming = false;
      sendBtn.disabled = false;
      sendBtn.textContent = "Send";
    }

    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
  })();

  // ============================================================
  // BYOK: Register
  // ============================================================
  document.getElementById("byok-register-btn")?.addEventListener("click", async () => {
    const provider = document.getElementById("byok-provider")?.value;
    const key = document.getElementById("byok-key")?.value;
    if (!provider || !key) { window.showToast("Select provider and enter key", "warning"); return; }
    const res = await api("POST", "/api/byok", { provider, api_key: key });
    const el = document.getElementById("byok-register-result");
    if (!res.error && res.registered) {
      window.showToast("BYOK key registered!", "success");
      setTimeout(() => location.reload(), 1000);
    } else if (res.error) {
      el.innerHTML = '<div style="color:#ef4444">❌ ' + escapeHtml(res.error) + '</div>';
    }
  });

  // ============================================================
  // BYOK: Remove
  // ============================================================
  window.removeByokKey = async function (id) {
    if (!confirm("Remove this BYOK key?")) return;
    const res = await api("DELETE", "/api/byok/" + id);
    if (!res.error && (res.removed || res.deleted)) {
      window.showToast("BYOK key removed", "success");
      setTimeout(() => location.reload(), 500);
    }
  };

  // ============================================================
  // UTILITY: HTML escape
  // ============================================================
  function escapeHtml(text) {
    if (text == null) return "";
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(String(text)));
    return div.innerHTML;
  }
})();
