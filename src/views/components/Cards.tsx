/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: string;
  trend?: string;
  color?: string;
}

export const StatsCard: FC<StatsCardProps> = ({ label, value, icon, trend, color = "#0ea5e9" }) => (
  <div class="card" style="display:flex;align-items:center;gap:16px">
    <div style={`width:48px;height:48px;border-radius:12px;background:${color}20;display:flex;align-items:center;justify-content:center;font-size:22px`}>
      {icon}
    </div>
    <div>
      <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em">{label}</div>
      <div style="font-size:24px;font-weight:700;color:#e5e7eb;margin-top:2px">{value}</div>
      {trend && <div style="font-size:11px;color:#10b981;margin-top:2px">{trend}</div>}
    </div>
  </div>
);

interface BadgeProps {
  text: string;
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
}

export const Badge: FC<BadgeProps> = ({ text, variant = "neutral" }) => {
  const colors = {
    success: { bg: "#10b98120", text: "#10b981" },
    warning: { bg: "#f59e0b20", text: "#f59e0b" },
    danger: { bg: "#ef444420", text: "#ef4444" },
    info: { bg: "#0ea5e920", text: "#0ea5e9" },
    neutral: { bg: "#6b728020", text: "#6b7280" },
  };
  const c = colors[variant];
  return (
    <span style={`display:inline-flex;align-items:center;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;background:${c.bg};color:${c.text}`}>
      {text}
    </span>
  );
};
