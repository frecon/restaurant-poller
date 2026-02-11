# Åre Nature Studio — Table Availability Poller

Automated monitoring of table availability at [Åre Nature Studio's Matstudio](https://www.arenaturestudio.com/matstudio#bord). Checks all dates through May 3, 2026 for bookable slots (5 guests) and sends SMS + email notifications when a table opens up.

## How it works

The restaurant uses [easyTable](https://book.easytable.com) for online bookings. This poller calls the `times.asp` API directly — no browser automation needed — and parses the HTML response to distinguish between:

- **Bookable slots** → triggers notification
- **Waitlist-only slots** → ignored
- **No availability / closed** → ignored

New availability is deduplicated via `notified-dates.json` (committed to the repo by the workflow) so you only get notified once per date.

## Deployment (GitHub Actions)

The poller runs as a scheduled GitHub Actions workflow every 5 minutes. Free for public repos.

### 1. Add secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|--------|-------|
| `TWILIO_ACCOUNT_SID` | From [Twilio Console](https://console.twilio.com) |
| `TWILIO_AUTH_TOKEN` | From Twilio Console |
| `TWILIO_FROM_NUMBER` | Your Twilio phone number (e.g. `+1234567890`) |
| `NOTIFY_PHONE` | Your phone number (e.g. `+46701234567`) |
| `SMTP_USER` | Gmail address |
| `SMTP_PASS` | Gmail [App Password](https://myaccount.google.com/apppasswords) (requires 2FA) |
| `NOTIFY_EMAIL` | Email to receive alerts |

### 2. Enable the workflow

The workflow runs automatically on the cron schedule. You can also trigger it manually from the **Actions** tab → **Poll availability** → **Run workflow**.

## Local usage

```bash
cp .env.example .env
# Fill in your credentials

npm install

# Discovery mode — checks 5 dates, logs API responses
DISCOVERY_MODE=true npx tsx src/index.ts

# Full run — checks all dates, sends notifications if new availability found
npx tsx src/index.ts
```

## Cost

$0. GitHub Actions is free for public repositories. Twilio costs ~$2/month (phone number + SMS).
