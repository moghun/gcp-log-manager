const express = require("express");
const bodyParser = require("body-parser");
const { PubSub } = require("@google-cloud/pubsub");
const { BigQuery } = require("@google-cloud/bigquery");

const app = express();
const port = 3000;
const projectId = "your-project-id";
const pubsub = new PubSub({ projectId });
const bigquery = new BigQuery({ projectId });

app.use(bodyParser.json());

// Get logs from devices with pub/sub sockets and send logs to BigQuery
app.post("/collect-logs", async (req, res) => {});

// Fetch and Display analytics data from BigQuery
app.get("/", async (req, res) => {});

// Run Express.js server to listen log and analytics requests
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
