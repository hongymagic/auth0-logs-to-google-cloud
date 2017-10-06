const _ = require('lodash');
const uuid = require('node-uuid');
const request = require('request');

let config = {
  endpoint: 'https://content-logging.googleapis.com/v2/entries:write?alt=json&key=',
};

function sendLogs(logs, callback) {
  if (logs.length === 0) {
    callback();
  }

  try {
    request({
      method: 'POST',
      url: config.endpoint + config.key,
      headers: { 'Content-Type': 'application/json' },
      body: logs.concat('\n')
    }, (error, response) => {
      const isError = !!error || response.statusCode < 200 || response.statusCode >= 400;

      if (isError) {
        return callback(error || response.error || response.body);
      }

      return callback();
    });
  } catch (e) {
    return callback(e);
  }
}

function GoogleCloudLogging (key) {
  if (!key) {
    throw new Error('GCLOUD_API_KEY is required for Google Cloud');
  }

  config = _.merge(
    config,
    {
      key: key,
      session: `auth0-logs-to-google-cloud-${uuid.v4()}`
    },
  );
}

GoogleCloudLogging.prototype.send = function(logs, callback) {
  if (!logs || !logs.length) {
    return callback();
  }

  const timestamp = new Date().toUTCString();
  const client = { url: config.clientUrl };
  const message = [];

  logs.forEach((log) => {
    const data = {
      sessionId: config.session,
      timestamp: timestamp
    };

    message.push(JSON.stringify(_.extend(data, client, log)));
    message.push('\n');
  });

  return sendLogs(message, callback);
};

module.exports = GoogleCloudLogging;
