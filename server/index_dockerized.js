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
app.post("/api/postLog", async (req, res) => {
  const data = JSON.stringify(req.body);
  const dataBuffer = Buffer.from(data);

  try {
    const publishPromise = pubsub
      .topic(topicName)
      .publishMessage({ data: dataBuffer });
    const messageIdPromise = publishPromise.then((messageId) => {
      console.log(
        `Message ${messageId} published to Pub/Sub to be added to BQ table by Dataflow at ` +
          new Date().toISOString()
      );
      return messageId;
    });

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

    console.log("Analytics query is made at " + new Date().toISOString());
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

    // Combine all data into a single daily stats object
    for (let i = 0; i < dailyActiveUsers.length; i++) {
      const record = {
        date: dailyActiveUsers[i] != null ? dailyActiveUsers[i].date.value : 0,
        average_session_duration:
          avgTimeCalculated[i] != null ? avgTimeCalculated[i].avg_session : 0,
        active_user_count:
          dailyActiveUsers[i] != null ? dailyActiveUsers[i].distinct_users : 0,
        new_user_count:
          dailyNewUsers[i] != null ? dailyNewUsers[i].daily_new_users : 0,
      };
      dailyStats.push(record);
    }

    console.log("Analytics query is completed at " + new Date().toISOString());
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
});
