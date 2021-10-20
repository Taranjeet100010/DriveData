'use strict';

const express = require('express');
// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

// App
const app = express();
const { google } = require('googleapis');

const fs = require('fs');
const readline = require('readline');
const path = require('path');
// const { drive } = require('googleapis/build/src/apis/drive');
const { uploadImageAwsThroughUrl } = require('./aws');

const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/drive.appdata",
  "https://www.googleapis.com/auth/drive.metadata",
  "https://www.googleapis.com/auth/drive.photos.readonly",
];

const TOKEN_PATH = './token.json';

fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Drive API.
  authorize(JSON.parse(content), listFiles);
});

function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile('token.json', (err, token) => {
    if (err) {
      return getAccessToken(oAuth2Client, callback);
    }
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}


async function listFiles(auth) {
  try {
    const drive = google.drive({ version: 'v3', auth });

    const fileRes = await drive.files.list({
      pageSize: 10,
      fields: 'nextPageToken, files(id, name)',
    });

    let allFiles = fileRes.data.files;
    if (allFiles.length) {
      for (let i = 0; i < allFiles.length; i++) {
        let publicUrl = await generatePublicUrl(allFiles[i].id, auth);

        let type = allFiles[i].name.toString().split(".")[1];

        if (publicUrl && publicUrl.webViewLink) {
          let imageUrl = await uploadImageAwsThroughUrl(publicUrl.webViewLink, type)
          console.log("Image URL : ", imageUrl);
        }
      }
    }
  }
  catch (error) {
    console.log("Error  : ", error)
  }
}

async function generatePublicUrl(fileid, auth) {
  try {
    const drive = google.drive({ version: 'v3', auth });
    let fileId = fileid;

    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    })

    let result = await drive.files.get({
      fileId: fileId,
      fields: 'webViewLink,webContentLink'
    })

    // if (!result) {
    //   result = await drive.files.export({
    //     fileId: fileId,
    //     mimeType: 'application/pdf',
    //     fields: 'webViewLink,webContentLink'
    //   })
    // }

    return result.data;
  }
  catch (error) {
    console.log("Error  : ", error);
  }
}

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);