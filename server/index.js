const dotenv = require("dotenv");
const shell = require("shelljs");
dotenv.config({ path: "./.env" });

const express = require("express");
const bodyParser = require("body-parser");
const { PubSub } = require("@google-cloud/pubsub");
const { BigQuery } = require("@google-cloud/bigquery");

const app = express();
const port = process.env.PORT || 3000;
const projectId = process.env.PROJECT_ID;
const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const script_path = "../scripts";

const pubsub = new PubSub({
  projectId,
  keyFilename,
});

const bigquery = new BigQuery({
  projectId,
  keyFilename,
});

function executeCommand(command) {
  shell.chmod("+x", command);
  var child = require("child_process").exec(command);
  child.stdout.pipe(process.stdout);
  return child;
}

app.use(bodyParser.json());

// Get logs from a device as a request and pubslish it to the through the pub/sub to the specified topic
app.post("/postLog", async (req, res) => {});

// Fetch and display analytics data from BigQuery
app.get("/getAnalytics", async (req, res) => {});

// Run Express.js server to listen log and analytics requests
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Creating the Dataflow job...`);
  shell.cd(script_path);
  executeCommand("./startDataflow.sh");
});

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

function shutdown() {
  console.log("\nReceived kill signal, canceling the Dataflow job...");
  const exitProc = executeCommand("./cancelDataflow.sh");
  exitProc.on("exit", function () {
    process.exit();
  });
  process.exit();
}
