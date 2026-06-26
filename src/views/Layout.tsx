/** @jsxImportSource hono/jsx */
/*
 * XSS Note: dangerouslySetInnerHTML is used ONLY for:
 * 1. Tailwind config — static JS written by us, zero user input
 * 2. Inline CSS — static stylesheet written by us
 * Both are safe as they contain no dynamic/external content.
 */
import type { FC } from "hono/jsx";

interface LayoutProps {
  title?: string;
  activePage?: string;
  user?: { email: string; tier: string; balance: number } | null;
  children?: any;
}

export const Layout = ({ title = "WebNesti", activePage = "", user, children }: LayoutProps) => {
  const navItems = [
  { id: "dashboard", icon: "📊", label: "Dashboard", href: "/views/dashboard" },
  { id: "models", icon: "🤖", label: "Models", href: "/views/models" },
  { id: "playground", icon: "💬", label: "Playground", href: "/views/playground" },
  { id: "keys", icon: "🔑", label: "API Keys", href: "/views/keys" },
  { id: "usage", icon: "📈", label: "Usage", href: "/views/usage" },
  { id: "billing", icon: "💳", label: "Billing", href: "/views/billing" },
  { id: "budget", icon: "🎯", label: "Budget", href: "/views/budget" },
  { id: "pricing", icon: "💎", label: "Pricing", href: "/views/pricing" },
  { id: "referral", icon: "🎁", label: "Referral", href: "/views/referral" },
  { id: "byok", icon: "🗝️", label: "BYOK", href: "/views/byok" },
  { id: "auth", icon: "🔐", label: "Login", href: "/views/auth" },
  ];

  return (
    <html lang="en" class="dark">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} — WebNesti</title>
        {/* Favicon (inline SVG) */}
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect rx='20' width='100' height='100' fill='%230ea5e9'/><text x='50' y='70' font-size='60' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='bold'>W</text></svg>" />
        {/* OG meta tags */}
        <meta property="og:title" content={`${title} — WebNesti`} />
        <meta property="og:description" content="AI Model API Provider — 100+ models, one endpoint" />
        <meta property="og:type" content="website" />
        <script src="/js/htmx.min.js"></script>
        <script src="/js/alpine.min.js" defer></script>
        <script src="/js/app.js"></script>
        <style dangerouslySetInnerHTML={{ __html: `
*{scrollbar-width:thin;scrollbar-color:#1f2937 transparent}
body{font-family:'Inter',system-ui,sans-serif;background:#030712;color:#e5e7eb;overflow-x:hidden}

/* ===== SIDEBAR ===== */
.sidebar-link{transition:all .2s ease;display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:8px;color:#9ca3af;font-size:14px;font-weight:500;text-decoration:none}
.sidebar-link:hover,.sidebar-link.active{background:rgba(14,165,233,0.1);color:#0ea5e9}
.sidebar-link.active{border-right:3px solid #0ea5e9}

/* ===== CARDS ===== */
.card{background:#0f172a;border:1px solid #1f2937;border-radius:12px;padding:20px;transition:all .2s ease}
.card:hover{border-color:#0ea5e9;box-shadow:0 0 20px rgba(14,165,233,0.08)}

/* ===== BUTTONS ===== */
.btn-primary{background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;border-radius:10px;padding:10px 24px;font-weight:600;border:none;cursor:pointer;transition:all .2s}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 25px rgba(14,165,233,0.3)}
.btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}
.btn-secondary{background:#1f2937;color:#e5e7eb;border:1px solid #374151;border-radius:10px;padding:10px 24px;font-weight:500;transition:all .2s;cursor:pointer}
.btn-secondary:hover{background:#374151}

/* ===== FORM ELEMENTS ===== */
input,select,textarea{background:#0f172a;border:1px solid #1f2937;color:#e5e7eb;border-radius:10px;padding:10px 14px;font-size:14px;outline:none;width:100%;transition:border-color .2s,box-shadow .2s}
input:focus,select:focus,textarea:focus{border-color:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,0.1)}
textarea{resize:vertical;min-height:80px}

/* ===== TABLES ===== */
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:12px 16px;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;border-bottom:1px solid #1f2937}
td{padding:12px 16px;border-bottom:1px solid #1f2937;font-size:14px}
tr:hover td{background:rgba(14,165,233,0.03)}

/* ===== TOAST NOTIFICATIONS ===== */
.toast-container{position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:400px;width:calc(100% - 40px);pointer-events:none}
.toast{pointer-events:all;padding:14px 18px;border-radius:10px;font-size:14px;font-weight:500;display:flex;align-items:flex-start;gap:10px;animation:toast-in .3s ease-out forwards;box-shadow:0 4px 20px rgba(0,0,0,0.3)}
.toast.removing{animation:toast-out .3s ease-in forwards}
.toast-success{background:#065f46;border:1px solid #10b981;color:#6ee7b7}
.toast-error{background:#7f1d1d;border:1px solid #ef4444;color:#fca5a5}
.toast-warning{background:#78350f;border:1px solid #f59e0b;color:#fcd34d}
.toast-info{background:#1e3a5f;border:1px solid #0ea5e9;color:#7dd3fc}
.toast-icon{font-size:18px;flex-shrink:0;line-height:1}
.toast-close{margin-left:auto;cursor:pointer;opacity:.6;font-size:16px;flex-shrink:0}
.toast-close:hover{opacity:1}
@keyframes toast-in{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}
@keyframes toast-out{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(100%)}}

/* ===== LOADING SKELETON ===== */
.skeleton{background:linear-gradient(90deg,#1e293b 25%,#334155 50%,#1e293b 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
.skeleton-text{height:14px;margin-bottom:8px}
.skeleton-title{height:24px;width:60%;margin-bottom:16px}
.skeleton-card{height:120px;margin-bottom:12px}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

/* ===== LOADING SPINNER ===== */
.spinner{width:24px;height:24px;border:3px solid #374151;border-top-color:#0ea5e9;border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* ===== HTMX LOADING INDICATORS ===== */
.htmx-request .btn-primary,.htmx-request .btn-secondary{position:relative;pointer-events:none;opacity:.7}
.htmx-request .btn-primary::after,.htmx-request .btn-secondary::after{content:'';position:absolute;top:50%;left:50%;width:16px;height:16px;margin:-8px 0 0 -8px;border:2px solid transparent;border-top-color:currentColor;border-radius:50%;animation:spin .6s linear infinite}

/* ===== ANIMATIONS ===== */
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.fade-in{animation:fadeIn .3s ease-out forwards}

/* ===== MOBILE: HAMBURGER MENU ===== */
.mobile-header{display:none;position:fixed;top:0;left:0;right:0;height:56px;background:#0a0f1e;border-bottom:1px solid #1f2937;z-index:100;align-items:center;padding:0 16px}
.hamburger{width:32px;height:32px;display:flex;flex-direction:column;justify-content:center;gap:5px;cursor:pointer;background:none;border:none;padding:4px}
.hamburger span{display:block;height:2px;background:#e5e7eb;border-radius:1px;transition:all .3s}
.hamburger.open span:nth-child(1){transform:rotate(45deg) translate(5px,5px)}
.hamburger.open span:nth-child(2){opacity:0}
.hamburger.open span:nth-child(3){transform:rotate(-45deg) translate(5px,-5px)}
.mobile-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:140;opacity:0;pointer-events:none;transition:opacity .3s}
.mobile-overlay.show{opacity:1;pointer-events:all}

/* ===== RESPONSIVE BREAKPOINTS ===== */
@media(max-width:768px){
  .mobile-header{display:flex}
  .sidebar{transform:translateX(-100%);transition:transform .3s ease;z-index:150!important}
  .sidebar.open{transform:translateX(0)}
  #main-content{margin-left:0!important;padding-top:72px!important;padding-left:16px!important;padding-right:16px!important}
  .desktop-user-card{display:none}
  .mobile-grid{grid-template-columns:1fr!important}
  .mobile-stack{flex-direction:column!important}
  .mobile-full{width:100%!important}
  .mobile-hide{display:none}
  table{font-size:12px}
  th,td{padding:8px 10px}
}

/* ===== COPY BUTTON ===== */
.copy-btn{display:inline-flex;align-items:center;gap:4px;background:#1e293b;border:1px solid #374151;color:#9ca3af;padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;transition:all .2s}
.copy-btn:hover{background:#374151;color:#e5e7eb}
.copy-btn.copied{background:#065f46;border-color:#10b981;color:#6ee7b7}

/* ===== CODE BLOCKS ===== */
.code-block{background:#1e293b;border:1px solid #374151;border-radius:8px;padding:12px 16px;font-family:'Fira Code','Consolas',monospace;font-size:13px;overflow-x:auto;white-space:pre;margin:8px 0;line-height:1.5;color:#e2e8f0}
.code-block::before{content:attr(data-lang);display:block;font-size:10px;color:#6b7280;margin-bottom:8px;text-transform:uppercase}
.inline-code{background:#1e293b;border:1px solid #374151;border-radius:4px;padding:1px 6px;font-family:monospace;font-size:0.9em;color:#7dd3fc}

/* ===== X-CLOAK (Alpine) ===== */
[x-cloak]{display:none!important}

/* ===== SCROLLBAR ===== */
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#1f2937;border-radius:3px}
` }} />
      </head>
      <body x-data="{ sidebarOpen: false }">
        {/* Mobile Header */}
        <header class="mobile-header">
          <button class="hamburger" x-bind:class="{ open: sidebarOpen }" x-on:click="sidebarOpen = !sidebarOpen" aria-label="Toggle menu">
            <span></span><span></span><span></span>
          </button>
          <h1 style="font-size:16px;font-weight:800;background:linear-gradient(135deg,#0ea5e9,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-left:12px">
            WebNesti
          </h1>
          {user && (
            <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
              <span style="font-size:13px;color:#0ea5e9;font-weight:600">${user.balance.toFixed(2)}</span>
            </div>
          )}
        </header>

        {/* Mobile Overlay */}
        <div class="mobile-overlay" x-bind:class="{ show: sidebarOpen }" x-on:click="sidebarOpen = false"></div>

        {/* Toast Container */}
        <div id="toast-container" class="toast-container"></div>

        <div style="display:flex;min-height:100vh">
          {/* Sidebar */}
          <aside class="sidebar" style="width:240px;background:#0a0f1e;border-right:1px solid #1f2937;padding:20px 12px;position:fixed;height:100vh;overflow-y:auto;z-index:150"
            x-bind:class="{ open: sidebarOpen }">
            <div style="padding:0 12px 20px;border-bottom:1px solid #1f2937;margin-bottom:16px" class="mobile-hide">
              <h1 style="font-size:20px;font-weight:800;background:linear-gradient(135deg,#0ea5e9,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent">
                WebNesti
              </h1>
              <p style="font-size:11px;color:#6b7280;margin-top:2px">AI Model API Provider</p>
            </div>
            <nav style="display:flex;flex-direction:column;gap:2px">
              {navItems.map(item => (
                <a
                  href={item.href}
                  class={`sidebar-link ${activePage === item.id ? "active" : ""}`}
                  x-on:click="sidebarOpen = false"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              ))}
            </nav>
            {user && (
              <div class="desktop-user-card" style="position:absolute;bottom:20px;left:12px;right:12px;padding:12px;background:#0f172a;border-radius:10px;border:1px solid #1f2937">
                <div style="font-size:12px;color:#9ca3af;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{user.email}</div>
                <div style="font-size:14px;font-weight:600;color:#0ea5e9;margin-top:4px">${user.balance.toFixed(2)}</div>
                <div style="font-size:11px;color:#6b7280;text-transform:uppercase">{user.tier} tier</div>
              </div>
            )}
          </aside>

          {/* Main Content */}
          <main id="main-content" style="flex:1;margin-left:240px;padding:32px;min-height:100vh">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
};

/** Fragment wrapper — for htmx partial responses (no full HTML shell) */
export const Fragment: FC = ({ children }) => {
  return <div class="fade-in">{children}</div>;
};
