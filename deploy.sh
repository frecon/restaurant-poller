#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="europe-north1"
REPO_NAME="restaurant-poller"
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$REPO_NAME"
JOB_NAME="restaurant-poller"
SCHEDULER_NAME="restaurant-poller-schedule"
SA_NAME="restaurant-poller-sa"
SA_EMAIL="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

echo "=== Enabling required APIs ==="
gcloud services enable \
  run.googleapis.com \
  cloudscheduler.googleapis.com \
  firestore.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  --project "$PROJECT_ID"

echo "=== Creating Artifact Registry repository ==="
gcloud artifacts repositories create "$REPO_NAME" \
  --repository-format=docker \
  --location="$REGION" \
  --project "$PROJECT_ID" \
  2>/dev/null || echo "Repository already exists"

echo "=== Building and pushing container image ==="
gcloud builds submit \
  --tag "$IMAGE" \
  --project "$PROJECT_ID" \
  --region "$REGION"

echo "=== Creating Firestore database ==="
gcloud firestore databases create \
  --location="$REGION" \
  --project "$PROJECT_ID" \
  2>/dev/null || echo "Firestore database already exists"

echo "=== Creating secrets in Secret Manager ==="
declare -a SECRETS=(
  "TWILIO_ACCOUNT_SID"
  "TWILIO_AUTH_TOKEN"
  "TWILIO_FROM_NUMBER"
  "NOTIFY_PHONE"
  "SMTP_USER"
  "SMTP_PASS"
  "NOTIFY_EMAIL"
)

for SECRET_NAME in "${SECRETS[@]}"; do
  VALUE="${!SECRET_NAME:-}"
  if [ -z "$VALUE" ]; then
    echo "WARNING: $SECRET_NAME not set in environment, skipping"
    continue
  fi
  gcloud secrets create "$SECRET_NAME" \
    --project "$PROJECT_ID" \
    2>/dev/null || true
  echo -n "$VALUE" | gcloud secrets versions add "$SECRET_NAME" \
    --data-file=- \
    --project "$PROJECT_ID"
done

echo "=== Creating service account ==="
gcloud iam service-accounts create "$SA_NAME" \
  --display-name="Restaurant Poller Service Account" \
  --project "$PROJECT_ID" \
  2>/dev/null || echo "Service account already exists"

# Grant Firestore access
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/datastore.user" \
  --quiet

# Grant Secret Manager access
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet

# Grant Cloud Run invoker for Scheduler
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/run.invoker" \
  --quiet

echo "=== Creating Cloud Run Job ==="
SECRET_ARGS=""
for SECRET_NAME in "${SECRETS[@]}"; do
  SECRET_ARGS="$SECRET_ARGS --set-secrets=$SECRET_NAME=$SECRET_NAME:latest"
done

gcloud run jobs create "$JOB_NAME" \
  --image "$IMAGE" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --service-account "$SA_EMAIL" \
  --memory "512Mi" \
  --cpu "0.5" \
  --max-retries 1 \
  --task-timeout "300s" \
  --set-env-vars "GCP_PROJECT_ID=$PROJECT_ID" \
  $SECRET_ARGS

echo "=== Creating Cloud Scheduler job ==="
gcloud scheduler jobs create http "$SCHEDULER_NAME" \
  --location "$REGION" \
  --schedule "*/5 * * * *" \
  --time-zone "Europe/Stockholm" \
  --uri "https://$REGION-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/$PROJECT_ID/jobs/$JOB_NAME:run" \
  --http-method POST \
  --oauth-service-account-email "$SA_EMAIL" \
  --project "$PROJECT_ID"

echo ""
echo "=== Deployment complete ==="
echo "To trigger a manual run:"
echo "  gcloud run jobs execute $JOB_NAME --region $REGION --project $PROJECT_ID"
echo ""
echo "To view logs:"
echo "  gcloud run jobs executions list --job $JOB_NAME --region $REGION --project $PROJECT_ID"
