/**
 * Fallback only. The real timezone is `app_settings.timezone`
 * (addendum §15.1) — read it via `getAppTimezone()` in
 * `lib/app-settings.ts`. This constant exists purely so a missing or
 * unreadable settings row degrades to something sane instead of
 * throwing.
 */
export const DEFAULT_APP_TIMEZONE = "Europe/Oslo";
