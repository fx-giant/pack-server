var unzip = require("unzip");
var fs = require("fs");
var path = require("path");
var rimraf = require("rimraf");
var ncp = require("ncp").ncp;
var dateTime = require("node-datetime");
var env = process.env;
var fstream = require("fstream");
var zstream = require("zstream");
var admZip = require("adm-zip");


function get(req, res, next) {
    fjson({
        status: "ok"
    })
}

function post(req, res, next) {
    var files = req.files;
    var queryStrings = req.query;

    const TEMP_ZIP_NAME = "temp.zip";
    const TEMP_FOLDER_NAME = "__temp__/";
    const VALID_FILE_EXTENSIONS = ["html", "css", "js", "png", "jpg", "jpeg", "svg", "bmp"]

    var temporaryFileName = env.TEMP_FOLDER + "/" + TEMP_ZIP_NAME;
    var temporaryExtractionTarget = env.TEMP_FOLDER + "/" + TEMP_FOLDER_NAME;
    var giantFormFolder = env.GIANT_FORM_FOLDER;
    var backupFolder = env.BACKUP_FOLDER;

    startProcess();

    function startProcess() {
        console.log("Starting process");
        var file = files.attachments;
        moveToTemporary(file, unzipTheTemporary);
    }

    function moveToTemporary(source) {
        console.log("Moving file to temporary folder");
        console.log(temporaryFileName);
        source.mv(temporaryFileName, function () {
            console.log("Removing old file");
            unzipTheTemporary();
        });
    }

    function unzipTheTemporary() {
        var zip = new admZip(temporaryFileName);
        zip.extractAllTo(temporaryExtractionTarget, true);
        validateFiles()
    }

    function validateFiles() {
        console.log("Validating file");
        var folders = fs.readdirSync(temporaryExtractionTarget)
        for (var i = 0; i < folders.length; i++) {
            var folderPath = path.join(temporaryExtractionTarget, folders[i]);
            var files = fs.readdirSync(folderPath);
            for (var j = 0; j < files.length; j++) {
                if (!isValidFile(files[i])) {
                    var message = ("Invalid file type " + files[i]);
                    console.log(message);
                    rimraf(temporaryExtractionTarget);
                    res.ferror({
                        "status": "failed",
                        "message": message
                    })
                }
            }
        }
        if (queryStrings.backup) {
            console.log("Backup request detected");
            backupFiles();
        } else {
            console.log("No backup request");
            deployFiles();
        }
    }

    function backupFiles() {
        console.log("Backup old files");
        var backupPath = path.join(backupFolder, dateTime.create().format("Y-m-d_H-M-S"));
        ncp(giantFormFolder, backupPath, function () {
            deployFiles();
        })
    }

    function deployFiles() {
        console.log("Deploying to end folder");
        var folders = fs.readdirSync(temporaryExtractionTarget);
        var counter = 0;
        for (var i = 0; i < folders.length; i++) {
            var folderPath = path.join(temporaryExtractionTarget, folders[i]);
            var files = fs.readdirSync(folderPath);
            for (var j = 0; j < files.length; j++) {
                counter++;
            }
        }
        console.log("File number", counter);
        for (var i = 0; i < folders.length; i++) {
            var folderPath = path.join(temporaryExtractionTarget, folders[i]);
            var files = fs.readdirSync(folderPath);
            for (var j = 0; j < files.length; j++) {
                var from = path.join(folderPath, files[j]);
                var to = path.join(giantFormFolder, files[j]);
                moveFile(from, to, function () {
                    counter -= 1;
                    if (counter == 0) {
                        console.log("Removing temporary files");
                        rimraf(temporaryExtractionTarget, function () {
                            res.fjson({
                                status: "success"
                            })
                        });
                    }
                });
            }
        }

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
        is.on('end', callback || function () {});
    }

}




module.exports = {
    get: get,
    post: post
}