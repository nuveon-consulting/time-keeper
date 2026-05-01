/** Env var set in mcp.json so the stdio MCP process uses the same storage dir as the extension. */
export const TIME_KEEPER_GLOBAL_STORAGE_ENV = "TIME_KEEPER_GLOBAL_STORAGE";

/**
 * Optional integer minutes ≥1. When set, MCP closes segments using the same interval snapping as
 * Settings → Nuveon Time Keeper → Alignment interval (`timeKeeper.alignmentIntervalMinutes`).
 */
export const TIME_KEEPER_ALIGNMENT_INTERVAL_MINUTES_ENV = "TIME_KEEPER_ALIGNMENT_INTERVAL_MINUTES";
