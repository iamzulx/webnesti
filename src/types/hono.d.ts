// Hono Context augmentation: type the variables set by authMiddleware so that
// c.get("user") / c.get("apiKey") are typed instead of `unknown`. dbGet returns
// `any`, so these are intentionally loose — the goal is to stop the 70 TS18046
// errors, not to model the full DB row shape here.
import "hono";

declare module "hono" {
  interface ContextVariableMap {
    user: any;
    apiKey: any;
  }
}
