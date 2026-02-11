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

// Lazily loaded — only accessed when sending notifications
let _config: {
  twilio: { accountSid: string; authToken: string; fromNumber: string };
  smtp: { user: string; pass: string };
  notifyPhone: string;
  notifyEmail: string;
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
    };
  }
  return _config;
}

// Proxy so discovery mode works without notification env vars
export const config = new Proxy({} as ReturnType<typeof getConfig>, {
  get(_target, prop: string) {
    return getConfig()[prop as keyof ReturnType<typeof getConfig>];
  },
});
