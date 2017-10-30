
require('dotenv').config();
const TEMP_ZIP_NAME = "temp.zip";
const TEMP_FOLDER_NAME = "__temp__";
const VALID_FILE_EXTENSIONS = ["html", "css", "js", "png", "jpg", "jpeg", "svg", "bmp"]

var env = process.env;
var http = require("http");
var formidable = require("formidable");
var unzip = require("unzip");
var fs = require("fs");
var path = require("path");
var rimraf = require("rimraf");
var ncp = require("ncp").ncp;
var dateTime = require("node-datetime");

http.createServer(function (req, res) {
    var requestUrlSplit = req.url.split("?");
    var url = requestUrlSplit[0];
    var stringQuery = requestUrlSplit.length == 2 ? requestUrlSplit[1] : "";
    var queryStrings = convertQueryString(stringQuery);
    console.log("-------");
    console.log("URL:", url);
    console.log("Query:", queryStrings);
    if (url == env.UPLOAD_ENDPOINT) {
        processForm(req, res);
    }

}).listen(env.PORT);

function convertQueryString(stringQuery) {
    if (stringQuery == "")
        return {};
    var splits = stringQuery.split("&");
    var result = {};
    for (var i = 0; i < splits.length; i++) {
        var splitAgain = splits[i].split("=");
        result[splitAgain[0]] = splitAgain[1];
    }
    return result || {};
}

function processForm(req, res) {
    var form = new formidable.IncomingForm();
    var temporaryFileName = env.TEMP_FOLDER + "/" + TEMP_ZIP_NAME;
    var temporaryExtractionTarget = env.TEMP_FOLDER + "/" + TEMP_FOLDER_NAME;
    var giantFormFolder = env.GIANT_FORM_FOLDER;
    var backupFolder = env.BACKUP_FOLDER;
    var requestUrlSplit = req.url.split("?");
    var stringQuery = requestUrlSplit.length == 2 ? requestUrlSplit[1] : "";
    var queryStrings = convertQueryString(stringQuery);

    form.parse(req, function (err, fields, files) {
        if (err) {
            console.log(err);
            res.writeHead(504);
            res.end();
            return;
        }
        startProcess();

        function startProcess() {
            var oldPath = files.attachments.path;
            moveToTemporary(oldPath, unzipTheTemporary);
        }

        function moveToTemporary(source) {
            moveFile(source, temporaryFileName, function () {
                fs.unlink(source);
                unzipTheTemporary();
            })
        }

        function unzipTheTemporary() {
            var pipeline = fs.createReadStream(temporaryFileName)
                .pipe(unzip.Extract({ path: temporaryExtractionTarget }));

            pipeline.on("close", function () {

                fs.unlink(temporaryFileName);
                validateFiles();
            })
        }

        function validateFiles() {

            var folders = fs.readdirSync(temporaryExtractionTarget)
            for (var i = 0; i < folders.length; i++) {
                var folderPath = path.join(temporaryExtractionTarget, folders[i]);
                var files = fs.readdirSync(folderPath);
                for (var j = 0; j < files.length; j++) {
                    if (!isValidFile(files[i])) {
                        error("Invalid file type " + files[i]);
                        rimraf(temporaryExtractionTarget);
                        return;
                    }
                }
            }
            if (queryStrings.backup) {
                backupFiles();
            }
            else {
                deployFiles();
            }
        }

        function backupFiles() {
            var backupPath = path.join(backupFolder, dateTime.create().format("Y-m-d_H-M-S"));
            ncp(giantFormFolder, backupPath, function () {
                deployFiles();
            })
        }

        function deployFiles() {
            var folders = fs.readdirSync(temporaryExtractionTarget);
            for (var i = 0; i < folders.length; i++) {
                var folderPath = path.join(temporaryExtractionTarget, folders[i]);
                var files = fs.readdirSync(folderPath);
                for (var j = 0; j < files.length; j++) {
                    var from = path.join(folderPath, files[j]);
                    var to = path.join(giantFormFolder, files[j]);
                    moveFile(from, to);
                }
            }
            rimraf(temporaryExtractionTarget, success);
        }


        function success() {
            res.writeHead(200);
            res.end();
        }

        function error(message) {
            res.writeHead(500);
            res.write(message);
            res.end();
        }
    });
}

function isValidFile(filePath) {
    var ext = getExtension(filePath);
    return VALID_FILE_EXTENSIONS.indexOf(ext) != -1;
}

function getExtension(filename) {
    var ext = path.extname(filename || '').split('.');
    return ext[ext.length - 1];
}

function moveFile(from, to, callback) {
    console.log("Moving", from, to);
    var is = fs.createReadStream(from);
    var os = fs.createWriteStream(to);

    is.pipe(os);
    is.on('end', callback || function () { });
}