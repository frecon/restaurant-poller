# Åre Nature Studio — Table Availability Poller

Automated monitoring of table availability at [Åre Nature Studio's Matstudio](https://www.arenaturestudio.com/matstudio#bord). Checks all dates through May 3, 2026 for bookable slots (5 guests) and sends SMS + email notifications when a table opens up.

## How it works

The restaurant uses [easyTable](https://book.easytable.com) for online bookings. This poller calls the `times.asp` API directly — no browser automation needed — and parses the HTML response to distinguish between:

- **Bookable slots** → triggers notification
- **Waitlist-only slots** → ignored (configurable)
- **No availability / closed** → ignored

New availability is deduplicated against Firestore so you only get notified once per date.

## Architecture

```
Cloud Scheduler (every 5 min)
  → Cloud Run Job (Node.js container)
    → GET times.asp for each date
    → Filter against Firestore (already-notified dates)
    → Send Twilio SMS + Gmail email
    → Record notified dates in Firestore
```

## Local setup

```bash
cp .env.example .env
# Fill in your credentials (see below)

npm install
```

### Required credentials

| Variable | Source |
|----------|--------|
| `TWILIO_ACCOUNT_SID` | [Twilio Console](https://console.twilio.com) |
| `TWILIO_AUTH_TOKEN` | Twilio Console |
| `TWILIO_FROM_NUMBER` | Twilio phone number (e.g. `+1234567890`) |
| `NOTIFY_PHONE` | Your phone number |
| `SMTP_USER` | Gmail address |
| `SMTP_PASS` | Gmail [App Password](https://myaccount.google.com/apppasswords) (requires 2FA) |
| `NOTIFY_EMAIL` | Email to receive alerts |
| `GCP_PROJECT_ID` | GCP project (only needed for Firestore) |

## Usage

```bash
# Discovery mode — checks 5 dates, logs API responses
DISCOVERY_MODE=true npx tsx src/index.ts

# Full run — checks all dates, sends notifications if new availability found
npx tsx src/index.ts
```

## Deploy to GCP

Prerequisites: `gcloud` CLI installed and authenticated, billing enabled.

```bash
export GCP_PROJECT_ID=your-project-id
# Set all env vars from .env.example in your shell
./deploy.sh
```

This creates:
- **Cloud Run Job** (512 MiB RAM, 0.5 vCPU)
- **Cloud Scheduler** firing every 5 minutes (Europe/Stockholm)
- **Firestore** database for dedup state
- **Secret Manager** entries for all credentials

### Manual trigger

```bash
gcloud run jobs execute restaurant-poller --region europe-north1 --project $GCP_PROJECT_ID
```

## Estimated cost

| Component | Monthly cost |
|-----------|-------------|
| Cloud Run Job (~17s/run, 288 runs/day) | ~$1 |
| Cloud Scheduler | $0.10 |
| Firestore | Free tier |
| Twilio (number + ~10 SMS) | ~$2 |
| Gmail SMTP | Free |
| **Total** | **~$3/month** |
