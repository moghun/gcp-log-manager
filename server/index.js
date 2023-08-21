const dotenv = require("dotenv");
const shell = require("shelljs");
dotenv.config({ path: "./.env" });

const express = require("express");
const bodyParser = require("body-parser");
const { PubSub } = require("@google-cloud/pubsub");
const { BigQuery } = require("@google-cloud/bigquery");
const { time } = require("console");

const app = express();
const port = process.env.PORT || 3000;
const projectId = process.env.PROJECT_ID;
const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const topicName = process.env.TOPIC_NAME;
const datasetName = process.env.BIGQUERY_TABLE_NAME;
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
app.get("/api/getAnalytics", async (req, res) => {
  try {
    //Get total users from BigQuery
    const totalUsersQuery = `
        SELECT COUNT(DISTINCT user_id) AS total_users
        FROM ${datasetName};
        `;

    // Get daily active users from BigQuery
    const queryDailyActiveUsers = `
      SELECT
        DATE(event_time) AS date,
        COUNT(DISTINCT user_id) AS distinct_users
      FROM ${datasetName}
      GROUP BY date
      ORDER BY date DESC;
      `;

    // Get daily new users from BigQuery
    const queryDailyNewUsers = `
      SELECT
        DATE(event_time) AS date,
        COUNT(DISTINCT user_id) AS daily_new_users
      FROM ${datasetName}
      WHERE event_name = 'sign_up'
      GROUP BY date
      ORDER BY date DESC;
      `;

    // Get a list of "session_start" - "session_end" couples for a unique user and session time from BigQuery
    // Then calculate the average session time for each day on the server side
    const queryAvgTime = `
      WITH SessionData AS (
        SELECT
          DATE(event_time) AS date,
          user_id,
          type,
          session_id,
          event_time AS session_time
        FROM
          ${datasetName}
        WHERE
          type IN ('session_start', 'session_end')
      )
      SELECT
        date,
        ARRAY_AGG(STRUCT(session_duration_seconds)) AS user_sessions
      FROM (
        SELECT
          date,
          TIMESTAMP_DIFF(MAX(CASE WHEN type = 'session_end' THEN session_time END), MIN(CASE WHEN type = 'session_start' THEN session_time END), SECOND) AS session_duration_seconds
        FROM SessionData
        GROUP BY date, user_id, session_id
      )
      GROUP BY
        date
      ORDER BY
        date DESC;
    `;

    // Execute queries
    const [totalUsers] = await bigquery.query(totalUsersQuery);
    const [dailyActiveUsers] = await bigquery.query(queryDailyActiveUsers);
    const [dailyNewUsers] = await bigquery.query(queryDailyNewUsers);
    const [avgTime] = await bigquery.query(queryAvgTime);

    // Calculate average session time for each day
    const avgTimeCalculated = avgTime.map((row) => {
      const daily_avg =
        row.user_sessions.reduce((acc, session) => {
          return acc + session.session_duration_seconds;
        }, 0) / row.user_sessions.length;
      return {
        date: row.date,
        avg_session: Math.floor(daily_avg),
      };
    });

    const dailyStats = [];
    // Combine all data into a single object to be returned as response
    const activtyRecords = {
      total_users: totalUsers[0] != null ? totalUsers[0].total_users : 0,
      daily_stats: dailyStats,
    };

    res.status(200).json(activtyRecords);
  } catch (error) {
    console.error(`Error fetching analytics data: ${error}`);
    res.status(500).send("Error fetching analytics data");
  }
});

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
