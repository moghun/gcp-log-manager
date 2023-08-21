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
const topicName = process.env.TOPIC_NAME;
const script_path = "../scripts";

const pubsub = new PubSub({
  projectId,
  keyFilename,
});

const bigquery = new BigQuery({
  projectId,
  keyFilename,
});

app.use(bodyParser.json());

// Executes a shell script - returns the executing process as child process to be able to sync with the calling process
function executeScript(command) {
  shell.chmod("+x", command);
  var child = require("child_process").exec(command);
  child.stdout.pipe(process.stdout);
  return child;
}

// Cancel the Dataflow job before exiting
function shutdown() {
  console.log("\nReceived kill signal, canceling the Dataflow job...");

  // Execute the shell script to cancel the Dataflow job
  const exitProc = executeScript("./cancelDataflow.sh");
  exitProc.on("exit", function () {
    process.exit();
  });
  process.exit();
}

app.post("/api/postLog", async (req, res) => {
  const data = JSON.stringify(req.body);
  const dataBuffer = Buffer.from(data);

  try {
    const publishPromise = pubsub
      .topic(topicName)
      .publishMessage({ data: dataBuffer });
    const messageIdPromise = publishPromise.then((messageId) => {
      console.log(
        `Message ${messageId} published to Pub/Sub to be added to BQ table by Dataflow`
      );
      return messageId;
    });

    const [messageId, _] = await Promise.all([
      messageIdPromise,
      publishPromise,
    ]);

    res
      .status(200)
      .send(
        "Event logs published to Pub/Sub to be added to BQ table by Dataflow"
      );
  } catch (error) {
    console.error(`Received error while publishing: ${error.message}`);
    res.status(500).send("Error publishing event logs");
  }
});

// Fetch and display analytics data from BigQuery
app.get("/api/getAnalytics", async (req, res) => {});

// Run Express.js server to listen log and analytics requests
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Creating the Dataflow job...`);
  shell.cd(script_path);

  // Execute the shell script to create the Dataflow job
  executeScript("./startDataflow.sh");
});

// Handle kill signals to cancel the Dataflow job before exiting
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);