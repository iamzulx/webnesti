/** @jsxImportSource hono/jsx */
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
    { id: "docs", icon: "📖", label: "API Docs", href: "/v1/openapi.json" },
  ];

  return (
    <html lang="en" class="dark">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} — WebNesti</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
        <script src="/js/htmx.min.js"></script>
        <script src="/js/alpine.min.js" defer></script>
        <script dangerouslySetInnerHTML={{ __html: `
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        accent: { 50:'#f0f9ff',100:'#e0f2fe',200:'#bae6fd',300:'#7dd3fc',400:'#38bdf8',500:'#0ea5e9',600:'#0284c7',700:'#0369a1',800:'#075985',900:'#0c4a6e',950:'#082f49' }
      }
    }
  }
}
` }} />
        <style dangerouslySetInnerHTML={{ __html: `
*{scrollbar-width:thin;scrollbar-color:#1f2937 transparent}
body{font-family:'Inter',system-ui,sans-serif;background:#030712;color:#e5e7eb;overflow-x:hidden}
.sidebar-link{transition:all .2s ease;display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:8px;color:#9ca3af;font-size:14px;font-weight:500;text-decoration:none}
.sidebar-link:hover,.sidebar-link.active{background:rgba(14,165,233,0.1);color:#0ea5e9}
.sidebar-link.active{border-right:3px solid #0ea5e9}
.card{background:#0f172a;border:1px solid #1f2937;border-radius:12px;padding:20px;transition:all .2s ease}
.card:hover{border-color:#0ea5e9;box-shadow:0 0 20px rgba(14,165,233,0.08)}
.btn-primary{background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;border-radius:10px;padding:10px 24px;font-weight:600;border:none;cursor:pointer;transition:all .2s}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 25px rgba(14,165,233,0.3)}
input,select{background:#0f172a;border:1px solid #1f2937;color:#e5e7eb;border-radius:10px;padding:10px 14px;font-size:14px;outline:none;width:100%}
input:focus,select:focus{border-color:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,0.1)}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:12px 16px;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;border-bottom:1px solid #1f2937}
td{padding:12px 16px;border-bottom:1px solid #1f2937;font-size:14px}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.fade-in{animation:fadeIn .3s ease-out forwards}
` }} />
      </head>
      <body>
        <div style="display:flex;min-height:100vh">
          {/* Sidebar */}
          <aside style="width:240px;background:#0a0f1e;border-right:1px solid #1f2937;padding:20px 12px;position:fixed;height:100vh;overflow-y:auto">
            <div style="padding:0 12px 20px;border-bottom:1px solid #1f2937;margin-bottom:16px">
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
                  hx-get={item.href.startsWith("/views/") ? item.href : undefined}
                  hx-target="#main-content"
                  hx-push-url={item.href.startsWith("/views/") ? "true" : undefined}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              ))}
            </nav>
            {user && (
              <div style="position:absolute;bottom:20px;left:12px;right:12px;padding:12px;background:#0f172a;border-radius:10px;border:1px solid #1f2937">
                <div style="font-size:12px;color:#9ca3af">{user.email}</div>
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
