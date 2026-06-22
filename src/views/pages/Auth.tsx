/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx";

interface AuthPageProps {
  message?: string;
  error?: string;
  mode?: "login" | "register";
}

export const AuthPage: FC<AuthPageProps> = ({ message, error, mode = "login" }) => (
  <div x-data="{ mode: 'login' }" style="max-width:420px;margin:0 auto;padding:60px 20px">
    <div style="text-align:center;margin-bottom:32px">
      <h1 style="font-size:28px;font-weight:800;background:linear-gradient(135deg,#0ea5e9,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px">
        WebNesti
      </h1>
      <p style="color:#9ca3af;font-size:14px">AI Model API Provider</p>
    </div>

    <div class="card">
      {/* Toggle Login / Register */}
      <div style="display:flex;margin-bottom:24px;background:#1e293b;border-radius:10px;padding:4px">
        <button
          class="btn-primary"
          style={`flex:1;padding:8px;font-size:14px;background:${mode === "login" ? "linear-gradient(135deg,#0ea5e9,#0284c7)" : "transparent"};border-radius:8px`}
          x-on:click="mode = 'login'"
        >Login</button>
        <button
          class="btn-primary"
          style={`flex:1;padding:8px;font-size:14px;background:${mode === "register" ? "linear-gradient(135deg,#0ea5e9,#0284c7)" : "transparent"};border-radius:8px`}
          x-on:click="mode = 'register'"
        >Register</button>
      </div>

      {/* Login Form */}
      <div x-show="mode === 'login'" x-transition>
        <form id="login-form">
          <div style="margin-bottom:16px">
            <label style="font-size:12px;color:#9ca3af;margin-bottom:6px;display:block">Email</label>
            <input name="email" type="email" placeholder="you@example.com" required x-model="email" />
          </div>
          <div style="margin-bottom:20px">
            <label style="font-size:12px;color:#9ca3af;margin-bottom:6px;display:block">Password</label>
            <input name="password" type="password" placeholder="••••••••" required x-model="password" />
          </div>
          <button class="btn-primary" style="width:100%;padding:12px" type="button"
            x-on:click="doLogin()">Sign In</button>
        </form>
      </div>

      {/* Register Form */}
      <div x-show="mode === 'register'" x-transition>
        <form id="register-form">
          <div style="margin-bottom:16px">
            <label style="font-size:12px;color:#9ca3af;margin-bottom:6px;display:block">Name (optional)</label>
            <input name="name" type="text" placeholder="Your name" />
          </div>
          <div style="margin-bottom:16px">
            <label style="font-size:12px;color:#9ca3af;margin-bottom:6px;display:block">Email</label>
            <input name="email" type="email" placeholder="you@example.com" required />
          </div>
          <div style="margin-bottom:20px">
            <label style="font-size:12px;color:#9ca3af;margin-bottom:6px;display:block">Password</label>
            <input name="password" type="password" placeholder="Min. 8 characters" required minlength="8" />
          </div>
          <button class="btn-primary" style="width:100%;padding:12px" type="button"
            x-on:click="doRegister()">Create Account</button>
        </form>
      </div>

      {error && (
        <div style="margin-top:16px;padding:12px;background:#ef444420;border:1px solid #ef4444;border-radius:8px;color:#fca5a5;font-size:13px">
          {error}
        </div>
      )}
      {message && (
        <div style="margin-top:16px;padding:12px;background:#10b98120;border:1px solid #10b981;border-radius:8px;color:#6ee7b7;font-size:13px">
          {message}
        </div>
      )}
    </div>
  </div>
);
