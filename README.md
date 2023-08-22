GCP Log Manager

GCP Log Manager is a tool designed to collect app logs from devices and provide analytics about daily user statistics. This program simplifies the process of managing logs using various Google Cloud Platform (GCP) services.

System Overview

The GCP Log Manager collects app logs from devices and provides analytics about daily user statistics. The workflow involves event logs sent to the /api/postLog endpoint, which are published to Google Cloud Pub/Sub. A Dataflow job then populates a Google BigQuery table, and the /api/getAnalytics API call queries BigQuery to retrieve daily user statistics.

This solution streamlines log management, facilitates data analysis, and empowers users to make informed decisions based on log data.

Installation and Setup

GCP Service Account Credentials

Place your GCP service account credentials JSON file inside the project directory (./gcp-log-manager).
Name the JSON file gcp-service-account.json.

Running the Application

Dockerized Version

To run the GCP Log Manager as a Docker container, follow these steps:

1. Open your terminal and navigate to the project directory:
   cd path/to/gcp-log-manager

2. Make the start script executable:
   chmod +x ./start.sh

3. Run the start script to build the Docker image, start the application container, and manage the Dataflow job:
   ./start.sh

4. Follow the prompts to manage the GCP Log Manager application. When prompted, input 'exit' to stop the application, which will also cancel the Dataflow job and remove the container and image.

Non-Dockerized Version

To run the GCP Log Manager without Docker, follow these steps:

1. Open your terminal and navigate to the project directory:
   cd path/to/gcp-log-manager

2. Make the start script and related scripts executable:
   chmod +x ./scripts/startDataflow.sh ./scripts/cancelDataflow.sh

3. Run the startDataflow script in the background to start the Dataflow job:
   ./scripts/startDataflow.sh &

4. Install the required dependencies by running the following command:
   npm install

5. Start the application using Node.js:
   node ./server/index.js

6. Open another terminal window/tab and navigate to the project directory.

7. Run the cancelDataflow script to cancel the Dataflow job and remove the container:
   ./scripts/cancelDataflow.sh

API Endpoints

1. POST /api/postLog

This endpoint is used to send logs to the GCP Log Manager. The expected input format is as follows:

{
"type": "$type",
 "session_id": "$session_id",
"event_name": "$event_name",
 "event_time": $event_time,
 "page": "$page",
"country": "$country",
 "region": "$region",
"city": "$city",
 "user_id": "$user_id"
}

This endpoint returns a success message as a response.

2. GET /api/getAnalytics

This endpoint provides aggregated daily user statistics. It returns data in a specific format.

Dependencies

The GCP Log Manager uses the following packages:

- @google-cloud/bigquery: "^7.2.0"
- @google-cloud/dataflow: "^3.0.0"
- @google-cloud/pubsub: "^4.0.1"
- body-parser: "^1.20.2"
- dotenv: "^16.3.1"
- express: "^4.18.2"
- shelljs: "^0.8.5"
