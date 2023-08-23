# GCP Log Manager

GCP Log Manager is a tool designed to collect app logs from devices and provide analytics about daily user statistics. This program simplifies the process of managing logs using various Google Cloud Platform (GCP) services.

## System Overview

1. The GCP Log Manager collects app logs from devices and provides analytics about daily user statistics.
2. The workflow involves event logs sent to the /api/postLog endpoint, which are published to Google Cloud Pub/Sub.
3. A Dataflow job then populates a Google BigQuery table, and the /api/getAnalytics API call queries BigQuery to retrieve daily user statistics.

This solution streamlines log management, facilitates data analysis, and empowers users to make informed decisions based on log data.

## Installation and Setup

### .env Setup

Place create .env files on both server and scripts directory by following the .env.sample format with GCP account specific values.

### GCP Service Account Credentials

Place your _GCP service account credentials JSON file_ inside the project directory (./gcp-log-manager).
Name the JSON file gcp-service-account.json.

## Running the Application

### Dockerized Version

To run the GCP Log Manager as a Docker container, follow these steps:

1. Make the start script executable:

```sh
chmod +x ./start.sh
```

2. Run the start script to build the Docker image, start the application container, and manage the Dataflow job:

```sh
./start.sh
```

4. Prompt `exit` to close the application and remove the container/image

### Non-Dockerized Version

To run the GCP Log Manager without Docker, follow these steps:

1. Make the start script and related scripts executable:

```sh
chmod +x ./scripts/startDataflow.sh ./scripts/cancelDataflow.sh
```

2. Install the required dependencies by running the following command:

```sh
npm install
```

3. Start the application using Node.js:

```sh
node ./server/index.js
```

4. You can stop the application with `Command + C (CTRL + C)` command.

## API Endpoints

1.      `POST localhost:8080/api/postLog`

This endpoint is used to send logs to the GCP Log Manager. The expected input format is as follows:

```json
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
```

This endpoint returns a success message as a response.

2. `GET localhost:8080/api/getAnalytics`

This endpoint provides aggregated daily user statistics. It returns data in a specific format as follows:

```json
{
   "total_users": 916,
   "daily_stats": [
         {
            "date": "2022-01-16",
            "average_session_duration": 304,
            "active_user_count": 267,
            "new_user_count": 10
        },
        ...
      ]
}
```

## Using Helm for Deployment

1. Build and push the docker image of this project to an image repository.
2. Change the values of the "image" variables on ./helm/deployement.yaml and ./helm/templates/values.yaml
3. Adjust deployment and service settings.
4. Deploy the service with:

```sh
helm install gcp-log-manager .
```

## Dependencies

The GCP Log Manager uses the following packages:

- @google-cloud/bigquery: "^7.2.0"
- @google-cloud/dataflow: "^3.0.0"
- @google-cloud/pubsub: "^4.0.1"
- body-parser: "^1.20.2"
- dotenv: "^16.3.1"
- express: "^4.18.2"
- shelljs: "^0.8.5"
