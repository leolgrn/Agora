// npm dependency
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const unzipper = require('unzipper');
const fs = require('file-system');
const JSONStream = require('JSONStream');
const es = require('event-stream');
const progress = require('progress-stream');
const requestProgress = require('request-progress');
const readline = require('readline');

// Global variables
const app = express();
const APIKey = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiNWJkYjMzZDQ4YjRjNDEzN2Q0ZTQ2NmNkIiwidGltZSI6MTU0MTA5MjY3Ny4xMjI0OTd9.Vb-8QJEHuu78Z44glGWLd1AbKSvRtGNlOXcyIHTopts';
const Amendements_XV_url = 'http://data.assemblee-nationale.fr/static/openData/repository/15/loi/amendements_legis/Amendements_XV.json.zip';

// Download zip & unzip it
const dowloadZipAndUnzipIt = (url, zipName, jsonName) => {
  return new Promise((resolve, reject) => {
      console.log('Downloading zip file from assemblée nationale..');
    requestProgress(request(url))
    .on('progress', function (state) {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0, null);
        process.stdout.write(Math.trunc(state.percent*100) + ' %');
    })
    .pipe(fs.createWriteStream('zip/' + zipName))
    .on('error', err => {
      reject(err);
    })
    .on('close', function () {
        console.log("\n");
      console.log(zipName + ' is written ! :)');

      const stat = fs.statSync('zip/' + zipName);
      const str = progress({
          length: stat.size,
          time: 100
      });

      str.on('progress', function(progress) {
          readline.clearLine(process.stdout, 0);
          readline.cursorTo(process.stdout, 0, null);
          process.stdout.write(Math.trunc(progress.percentage) + ' %');
      });
        console.log('Extracting json file..');
      fs.createReadStream('zip/' + zipName)
        .pipe(str)
        .pipe(unzipper.Parse())
        .on('error', err => {
          reject(err);
        })
        .on('entry', function (entry) {
          entry.pipe(fs.createWriteStream('json/' + jsonName))
                .on('error', err => {
                  reject(err);
                })
               .on('close', () => {
                   console.log("\n");
                 console.log(jsonName + ' is written ! :)');
                 resolve();
               });
        });
    });
  })
};

// Parsing of the json by using streams (Hudge json files need streams to be parsed)
const JSONParsing = function () {
    return new Promise((resolve, reject) => {
        const stat = fs.statSync('json/Amendements_XV.json');
        const str = progress({
            length: stat.size,
            time: 100
        });
        str.on('progress', function (progress) {
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0, null);
            process.stdout.write(Math.trunc(progress.percentage) + ' %');
        });
        console.log('Parsing json file..');
        stream = fs.createReadStream('json/Amendements_XV.json', {encoding: 'utf8'});
        stream.pipe(str)
            .pipe(JSONStream.parse('*'))
            .pipe(es.mapSync(function (parsedJSON) {
                if(parsedJSON !== null && parsedJSON !== undefined){
                    resolve(parsedJSON);
                } else {
                    reject("JSON is not defined");
                }
            }));

    });
};

// Get the zip which contain the json
// Write it, unzip it, write the json

/*dowloadZipAndUnzipIt(Amendements_XV_url, 'Amendements_XV.json.zip', 'Amendements_XV.json')
    .then(() => console.log('Zip dowloaded and unzipIt method is done.'))
    .catch((err) => console.log(err));*/

app.get('/amendements/:limit', (req, res) => {
// Parse the JSON stock in json folder
    // limit : req.params.limit
    JSONParsing()
        .then(parsedJSON => {
            let html;
            parsedJSON.texteleg.forEach(txt => {
                if(txt.amendements.amendement instanceof Array) {
                    txt.amendements.amendement.forEach(amendement => {
                        html += amendement.corps.exposeSommaire;
                        html += "<br/><br/>";
                    });
                }

            });
            res.status(200).send(html);
        })
        //.then(parsedJSON => res.status(200).json(parsedJSON.texteleg.amendements))
        .catch((err) => {
            console.log(err);
            res.status(500);
        });
});

app.listen(1000, () => {
  console.log('The agora server listen on port 1000');
});
