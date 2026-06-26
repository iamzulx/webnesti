/**
 * WebNesti Dashboard — Client-side JavaScript
 *
 * XSS Note: innerHTML is used only for:
 * 1. Toast notifications — content generated from this script or escaped via escapeHtml()
 * 2. Skeleton/loading states — static HTML templates
 * 3. Playground user messages — escaped via escapeHtml() / renderContent()
 * 4. API response display — error messages come from our own API (trusted)
 * No untrusted server-rendered HTML is ever injected via innerHTML.
 */

(function () {
  const API_BASE = ""; // relative, same origin

  // ============================================================
  // TOAST NOTIFICATION SYSTEM
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
    setTimeout(() => el.remove(), 350);
  };

  const _origAlert = window.alert;
  window.alert = function (msg) {
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
    try {
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
    } catch (err) {
      window.showToast("Connection failed — check your network", "error");
      return { error: "Connection failed" };
    }
  }

  // ============================================================
  // COPY TO CLIPBOARD
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

  window.copyReferralLink = function () {
    const el = document.querySelector('[style*="word-break"]');
    if (el) window.copyToClipboard(el.textContent?.trim());
  };

  // ============================================================
  // KEYBOARD SHORTCUTS
  // ============================================================
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const body = document.querySelector("body[x-data]");
      if (body && body.__x && body.__x.$data.sidebarOpen) {
        body.__x.$data.sidebarOpen = false;
      }
      // Close model modal
      const modal = document.getElementById("model-modal");
      if (modal && modal.style.display === "flex") modal.style.display = "none";
    }
  });

  // ============================================================
  // UTILITY: HTML escape
  // ============================================================
  function escapeHtml(text) {
    if (text == null) return "";
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(String(text)));
    return div.innerHTML;
  }

  // ============================================================
  // UTILITY: Render content with code blocks and markdown
  // ============================================================
  function renderContent(text) {
    let html = escapeHtml(text);
    const parts = html.split(/(```[\s\S]*?```)/g);
    return parts.map(function (part) {
      if (part.startsWith("```")) {
        var m = part.match(/^```(\w*)\n?([\s\S]*?)```$/);
        return '<pre class="code-block">' + (m ? m[2].trim() : part) + '</pre>';
      }
      return part
        .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");
    }).join("");
  }

  // ============================================================
  // PLAYGROUND — Streaming Chat with SSE
  // ============================================================
  (function initPlayground() {
    const sendBtn = document.getElementById("pg-send");
    const stopBtn = document.getElementById("pg-stop");
    const input = document.getElementById("pg-input");
    const messagesEl = document.getElementById("pg-messages");
    const modelSelect = document.getElementById("pg-model");
    const systemEl = document.getElementById("pg-system");
    const statusEl = document.getElementById("pg-status");

    if (!sendBtn || !input || !messagesEl || !modelSelect) return;

    let history = [];
    let streaming = false;
    let pgAbortController = null;

    // Restore conversation from localStorage
    try {
      const saved = localStorage.getItem("pg_conversation");
      if (saved) {
        const msgs = JSON.parse(saved);
        history = msgs;
        msgs.forEach(m => appendMessage(m.role, m.content, false));
      }
    } catch {}

    // Restore model selection
    const savedModel = localStorage.getItem("pg_model");
    if (savedModel && modelSelect.querySelector('option[value="' + savedModel + '"]')) {
      modelSelect.value = savedModel;
    }
    modelSelect.addEventListener("change", function () {
      localStorage.setItem("pg_model", modelSelect.value);
    });

    function appendMessage(role, content, animate) {
      if (messagesEl.querySelector('[style*="text-align:center"]')) {
        messagesEl.innerHTML = "";
      }
      const div = document.createElement("div");
      const isUser = role === "user";
      div.style.cssText = "margin-bottom:16px;padding:12px 16px;border-radius:12px;max-width:85%;" +
        (isUser ? "margin-left:auto;background:#0ea5e920;border:1px solid #0ea5e940" : "background:#1e293b;border:1px solid #374151") +
        (animate ? ";animation:fadeIn .3s ease-out" : "");
      div.innerHTML = '<div style="font-size:11px;font-weight:600;margin-bottom:6px;' +
        (isUser ? 'color:#0ea5e9' : 'color:#8b5cf6') + '">' + escapeHtml(role) +
        '</div><div class="msg-content" style="font-size:14px;line-height:1.6">' +
        (isUser ? escapeHtml(content) : renderContent(content)) + '</div>';
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return div;
    }

    function appendStreamMessage(role) {
      if (messagesEl.querySelector('[style*="text-align:center"]')) {
        messagesEl.innerHTML = "";
      }
      const div = document.createElement("div");
      div.style.cssText = "margin-bottom:16px;padding:12px 16px;border-radius:12px;max-width:85%;background:#1e293b;border:1px solid #374151;animation:fadeIn .3s ease-out";
      div.innerHTML = '<div style="font-size:11px;font-weight:600;margin-bottom:6px;color:#8b5cf6">' + role +
        '</div><div class="msg-content" style="font-size:14px;line-height:1.6"></div>';
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return div.querySelector(".msg-content");
    }

    async function sendMessage() {
      const text = input.value.trim();
      if (!text || streaming) return;

      streaming = true;
      sendBtn.style.display = "none";
      if (stopBtn) stopBtn.style.display = "";
      if (statusEl) statusEl.textContent = "⏳ Sending...";

      appendMessage("user", text, true);
      history.push({ role: "user", content: text });
      input.value = "";

      const sysMsg = systemEl?.value?.trim();
      const msgList = sysMsg ? [{ role: "system", content: sysMsg }] : [];
      msgList.push(...history);

      const temp = parseFloat(document.getElementById("pg-temp")?.value || "1");
      const maxTok = parseInt(document.getElementById("pg-max-tokens")?.value || "4096");

      pgAbortController = new AbortController();
      const contentEl = appendStreamMessage("assistant");
      contentEl.innerHTML = '<span style="color:#6b7280"><span class="spinner" style="display:inline-block;width:14px;height:14px;border-width:2px;vertical-align:middle;margin-right:8px"></span>Thinking...</span>';

      let fullContent = "";

      try {
        const res = await fetch("/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelSelect.value,
            messages: msgList,
            max_tokens: maxTok,
            temperature: temp,
            stream: true,
          }),
          signal: pgAbortController.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(function () { return {}; });
          window.showToast(errData.error?.message || "Request failed (" + res.status + ")", "error");
          contentEl.parentNode.remove();
          return;
        }

        if (statusEl) statusEl.textContent = "⚡ Streaming...";
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
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
                contentEl.innerHTML = renderContent(fullContent);
                messagesEl.scrollTop = messagesEl.scrollHeight;
              }
            } catch {}
          }
        }

        if (fullContent) {
          history.push({ role: "assistant", content: fullContent });
          if (history.length > 20) history = history.slice(-20);
          try { localStorage.setItem("pg_conversation", JSON.stringify(history)); } catch {}

          const costDiv = document.createElement("div");
          costDiv.style.cssText = "font-size:11px;color:#6b7280;margin-top:6px";
          costDiv.textContent = "Streamed response";
          contentEl.parentNode.appendChild(costDiv);
        } else {
          contentEl.parentNode.remove();
        }

      } catch (err) {
        if (err.name === "AbortError") {
          if (fullContent) {
            contentEl.innerHTML = renderContent(fullContent) + '<div style="color:#f59e0b;font-size:12px;margin-top:8px;font-style:italic">⏹ Generation stopped</div>';
            history.push({ role: "assistant", content: fullContent });
            try { localStorage.setItem("pg_conversation", JSON.stringify(history)); } catch {}
          } else {
            contentEl.parentNode.remove();
          }
          window.showToast("Generation stopped", "info", 2000);
        } else {
          contentEl.parentNode.remove();
          window.showToast("Connection error: " + err.message, "error");
        }
      }

      streaming = false;
      pgAbortController = null;
      sendBtn.style.display = "";
      if (stopBtn) stopBtn.style.display = "none";
      if (statusEl) statusEl.textContent = "";
      input.focus();
    }

    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    // Stop generation
    stopBtn?.addEventListener("click", function () { pgAbortController?.abort(); });

    // Clear chat
    document.getElementById("pg-clear")?.addEventListener("click", function () {
      if (streaming) pgAbortController?.abort();
      history = [];
      localStorage.removeItem("pg_conversation");
      messagesEl.innerHTML = '<div style="text-align:center;padding:80px 0;color:#6b7280"><div style="font-size:48px;margin-bottom:12px">💬</div><p style="font-size:15px">Send a message to start</p><p style="font-size:12px;margin-top:6px">Use ```code blocks``` and **bold** in responses</p></div>';
      window.showToast("Chat cleared", "info", 2000);
    });

    // Save conversation as JSON
    document.getElementById("pg-save")?.addEventListener("click", function () {
      if (!history.length) { window.showToast("No messages to save", "warning"); return; }
      var blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "conversation-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
      URL.revokeObjectURL(a.href);
      window.showToast("Conversation downloaded", "success");
    });
  })();

  // ============================================================
  // RANGE INPUT VALUE DISPLAYS
  // ============================================================
  ["pg-temp", "pg-max-tokens"].forEach(function (id) {
    var el = document.getElementById(id);
    var valEl = document.getElementById(id + "-val");
    if (el && valEl) {
      el.addEventListener("input", function () {
        valEl.textContent = id === "pg-temp" ? parseFloat(el.value).toFixed(1) : el.value;
      });
    }
  });

  // ============================================================
  // MODEL DETAIL MODAL (Models page)
  // ============================================================
  window.showModelModal = function (d) {
    var modal = document.getElementById("model-modal");
    if (!modal) return;
    var ctxK = d.ctx > 0 ? (d.ctx / 1000).toFixed(0) + "K" : "—";
    var features = [];
    if (+d.stream) features.push("Streaming");
    if (+d.vision) features.push("Vision");
    if (+d.tools) features.push("Tools");
    document.getElementById("model-modal-content").innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">' +
      '<div><h3 style="font-size:18px;font-weight:700;color:#e5e7eb">' + escapeHtml(d.name) + '</h3>' +
      '<div style="font-size:13px;color:#6b7280;font-family:monospace;margin-top:4px">' + escapeHtml(d.id) + '</div></div>' +
      '<button onclick="document.getElementById(\'model-modal\').style.display=\'none\'" ' +
      'style="background:#1e293b;border:1px solid #374151;color:#9ca3af;cursor:pointer;font-size:16px;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center">✕</button></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      '<div class="card" style="padding:12px"><div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em">Provider</div><div style="font-size:15px;font-weight:600;margin-top:4px">' + escapeHtml(d.provider) + '</div></div>' +
      '<div class="card" style="padding:12px"><div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em">Context Window</div><div style="font-size:15px;font-weight:600;margin-top:4px">' + ctxK + '</div></div>' +
      '<div class="card" style="padding:12px"><div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em">Input Price</div><div style="font-size:15px;font-weight:600;margin-top:4px;color:#10b981">$' + (parseFloat(d.pi) * 1e6).toFixed(2) + ' <span style="font-size:11px;color:#6b7280">/1M</span></div></div>' +
      '<div class="card" style="padding:12px"><div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em">Output Price</div><div style="font-size:15px;font-weight:600;margin-top:4px;color:#f59e0b">$' + (parseFloat(d.po) * 1e6).toFixed(2) + ' <span style="font-size:11px;color:#6b7280">/1M</span></div></div></div>' +
      (features.length ? '<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">' +
        features.map(function (f) {
          var fc = f === "Streaming" ? "#10b981" : f === "Vision" ? "#f59e0b" : "#0ea5e9";
          return '<span style="display:inline-flex;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:600;background:' + fc + '20;color:' + fc + '">' + f + '</span>';
        }).join('') + '</div>' : '') +
      '<div style="margin-top:16px;padding-top:12px;border-top:1px solid #1f2937">' +
      '<button class="btn-primary" style="font-size:13px;padding:8px 16px" onclick="document.getElementById(\'pg-model\') && (window.location.href=\'/views/playground\');document.getElementById(\'model-modal\').style.display=\'none\'">Try in Playground →</button></div>';
    modal.style.display = "flex";
  };

  document.getElementById("model-modal")?.addEventListener("click", function (e) {
    if (e.target === this) this.style.display = "none";
  });

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

  window.removeByokKey = async function (id) {
    if (!confirm("Remove this BYOK key?")) return;
    const res = await api("DELETE", "/api/byok/" + id);
    if (!res.error && (res.removed || res.deleted)) {
      window.showToast("BYOK key removed", "success");
      setTimeout(() => location.reload(), 500);
    }
  };
})();
