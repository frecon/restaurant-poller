export const GUEST_COUNT = 5;
export const END_DATE = "2026-05-03";
export const PARENT_URL = "https://www.arenaturestudio.com/matstudio#bord";
export const BOOKING_BASE_URL = "https://book.easytable.com/book/";

export const discoveryMode = process.env.DISCOVERY_MODE === "true";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

// Lazily loaded — only accessed when notifications/Firestore are needed
let _config: {
  twilio: { accountSid: string; authToken: string; fromNumber: string };
  smtp: { user: string; pass: string };
  notifyPhone: string;
  notifyEmail: string;
  gcpProjectId: string;
  discoveryMode: boolean;
} | null = null;

export function getConfig() {
  if (!_config) {
    _config = {
      twilio: {
        accountSid: requireEnv("TWILIO_ACCOUNT_SID"),
        authToken: requireEnv("TWILIO_AUTH_TOKEN"),
        fromNumber: requireEnv("TWILIO_FROM_NUMBER"),
      },
      smtp: {
        user: requireEnv("SMTP_USER"),
        pass: requireEnv("SMTP_PASS"),
      },
      notifyPhone: requireEnv("NOTIFY_PHONE"),
      notifyEmail: requireEnv("NOTIFY_EMAIL"),
      gcpProjectId: optionalEnv("GCP_PROJECT_ID", ""),
      discoveryMode,
    };
  }
  return _config;
}

// Re-export as `config` but with a getter so discovery mode works without all env vars
export const config = new Proxy({} as ReturnType<typeof getConfig>, {
  get(_target, prop: string) {
    if (prop === "discoveryMode") return discoveryMode;
    return getConfig()[prop as keyof ReturnType<typeof getConfig>];
  },
});
