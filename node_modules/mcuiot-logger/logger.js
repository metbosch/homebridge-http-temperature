var fs = require('fs');
var readline = require('readline');
const {google} = require('googleapis');
var debug = require('debug')('Logger');

var auth;
var spreadsheetId;

module.exports = {
  logger: logger
};

function logger(sheetID) {
  // Load client secrets from a local file.
  spreadsheetId = sheetID;
  fs.readFile(SECRET_PATH, function processClientSecrets(err, content) {
    if (err) {
      console.log('Error loading client secret file, please follow the instructions in the README!!!' + err);
      return;
    }
    // Authorize a client with the loaded credentials, then call the
    // Drive API.
    authorize(JSON.parse(content), function(authenticated) {
      auth = authenticated;
      debug("Authenticated");
    });
  });
}

// { "Hostname": "NODE-869815", "Model": "BME-GD", "Version": "1.3", "Firmware": "1.5.4",
// "Data": {"Temperature": 22.11, "Humidity": 42.4, "Moisture": 2, "Status": 0,
// "Barometer": 996.018, "Dew": 8.75, "Green": "On", "Red": "Off" }}

logger.prototype.storeBME = function(hostname, status, temperature, humidity, barometer) {
  var data = {
    Temperature: temperature,
    Humidity: humidity,
    Moisture: 0,
    Status: status,
    Barometer: barometer,
    Dew: 0,
    Green: "NA",
    Red: "NA"
  };

  var response = {
    Hostname: hostname,
    Model: "RPI-BME",
    Version: "1.0",
    Firmware: "1.0",
    Data: data
  };

  debug(response);
  logger.prototype.storeData(response);
};

logger.prototype.storeDHT = function(hostname, status, temperature, humidity) {
  var data = {
    Temperature: temperature,
    Humidity: humidity,
    Moisture: 0,
    Status: status,
    Barometer: 0,
    Dew: 0,
    Green: "NA",
    Red: "NA"
  };

  var response = {
    Hostname: hostname,
    Model: "RPI-DHT",
    Version: "1.0",
    Firmware: "1.0",
    Data: data
  };

  debug(response);
  logger.prototype.storeData(response);
};

logger.prototype.storeData = function(response) {
  var sheets = google.sheets('v4');

  var d = new Date();

  var day = (d.getMonth() + 1).toString() + '/' + d.getDate().toString() + '/' + d.getFullYear().toString() +
    ' ' + d.getHours().toString() + ':' + d.getMinutes().toString() + ':' + d.getSeconds().toString();

  const rows = [
    [day, response.Hostname, response.Model, response.Version, response.Firmware,
      response.Data.Temperature, response.Data.Humidity, response.Data.Moisture,
      response.Data.Status, response.Data.Barometer, response.Data.Dew,
      response.Data.Green, response.Data.Red
    ]
  ];
  const request = {
    spreadsheetId: spreadsheetId,
    auth: auth,
    range: 'Sheet1', // TODO: Update placeholder value.
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS', // TODO: Update placeholder value.
    resource: {
      values: rows
    }
  };

  sheets.spreadsheets.values.append(request, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      debug(rows);
      return;
    }
    debug(response);
  });
};

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/sheets.googleapis.com-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
  process.env.USERPROFILE) + '/.homebridge/';
var TOKEN_PATH = TOKEN_DIR + 'sheets.googleapis.com-datalogger.json';
var SECRET_PATH = TOKEN_DIR + 'logger_client_secret.json';

// Load client secrets from a local file.
// fs.readFile('client_secret.json', function processClientSecrets(err, content) {
//    if (err) {
//        console.log('Error loading client secret file: ' + err);
//        return;
//    }
// Authorize a client with the loaded credentials, then call the
// Google Sheets API.
//    authorize(JSON.parse(content), listMajors);
// });

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oAuth2Client, callback);
    } else {
      oAuth2Client.credentials = JSON.parse(token);
      callback(oAuth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oAuth2Client, callback) {
  var authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oAuth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oAuth2Client.credentials = token;
      storeToken(token);
      callback(oAuth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token), function(err) {
    if (err) throw err;
    console.log('Token stored to ' + TOKEN_PATH);
  });
}
