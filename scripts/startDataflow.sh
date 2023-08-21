#!/bin/bash
source .env
gcloud auth activate-service-account --key-file="$CREDENTIALS_FILE" --project="$PROJECT_ID"

JOB_NAME="PubSub2BQ-$(date +%Y%m%d%H%M%S)"
TEMPLATE_PATH="gs://dataflow-templates/latest/PubSub_to_BigQuery"
TEMP_CREDENTIALS_FILE=$CREDENTIALS_FILE
TEMP_PUBSUB_TOPIC=$PUBSUB_TOPIC
TEMP_BIGQUERY_TABLE=$BIGQUERY_TABLE

JOB_ID=$(gcloud dataflow jobs run "$JOB_NAME" \
  --gcs-location="$TEMPLATE_PATH" \
  --region="us-central1" \
  --parameters="inputTopic=$PUBSUB_TOPIC,outputTableSpec=$BIGQUERY_TABLE" \
  --format="value(id)")
echo "Dataflow job started with job ID: $JOB_NAME"

echo "PROJECT_ID=\"$PROJECT_ID\"" > .env
echo "CREDENTIALS_FILE=\"$TEMP_CREDENTIALS_FILE\"" >> .env
echo "PUBSUB_TOPIC=\"$TEMP_PUBSUB_TOPIC\"" >> .env
echo "BIGQUERY_TABLE=\"$TEMP_BIGQUERY_TABLE\"" >> .env
echo "DATAFLOW_JOB_NAME=\"$JOB_NAME\"" >> .env
echo "DATAFLOW_JOB_ID=\"$JOB_ID\"" >> .env