#!/bin/bash
source .env
gcloud dataflow jobs cancel "$DATAFLOW_JOB_ID" --project="$PROJECT_ID" --region="us-central1" 
echo "Dataflow job with job ID $DATAFLOW_JOB_NAME has been canceled."