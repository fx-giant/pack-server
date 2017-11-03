function extendRequest(req, res, next) {

}

function extendResponse(req, res, next) {

    res.fjson = function (data) {
        endActions(req, res, next);
        res.status(200);
        sendJSONResponse(res, data);
    };

    res.ferror = function (data) {
        endActions(req, res, next);
        res.status(500);
        error = {
            status: 'error',
            message: data
        }
        sendJSONResponse(res, error);
    }
}

function sendJSONResponse(res, data) {
    var response;
    if (getEnvBeautifyResponse())
        response = JSON.stringify(data, null, 4);
    else
        response = JSON.stringify(data);

    res.end(response);
}

function endActions(req, res, next) {

}

function getEnvBeautifyResponse() {
    var value = process.env.BEAUTIFY_RESPONSE || "false";
    return value.toLowerCase() == "true";
}

module.exports = function (req, res, next) {
    extendRequest(req, res, next);
    extendResponse(req, res, next);
    return next();
}