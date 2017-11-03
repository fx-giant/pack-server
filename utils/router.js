var express = require('express');
var routes = express.Router();
const baseRequireFolder = "../features/";

function get(path, callback) {
    route("get", path, callback);
}

function post(path, callback) {
    route("post", path, callback);
}

function put(path, callback) {
    route("put", path, callback);
}

function del(path, callback) {
    route("delete", path, callback);
}

function route(method, path, callback) {
    callbackFunction = getCallbackFunction(callback);
    routes[method](path, callbackFunction);
}

function getCallbackFunction(callback) {
    var callbackFunction = null;
    if (typeof (callback) == "function") {
        callbackfunction = callback;
    } else
    if (typeof (callback) == "string") {
        var callbackSplit = callback.split(".");
        var actionName = callbackSplit[callbackSplit.length - 1];
        callbackSplit.splice(callbackSplit.length - 1, 1);
        var controllerNamespace = callbackSplit;
        var controllerName = getControllerName(controllerNamespace);
        var controller = require(baseRequireFolder + controllerName);
        callbackFunction = controller[actionName];
    }
    callbackFunction = callbackFunction || defaultCallbackFunction;
    return callbackFunction;
}

function getControllerName(namespaceArray) {
    result = "";
    for (var i = 0; i < namespaceArray.length; i++) {
        if (i)
            result += "/";
        result += namespaceArray[i];
    }
    return result;
}

function defaultCallbackFunction(req, res, next, context) {
    res.fjson({
        "error": "function not found"
    });
};

module.exports = {
    route: route,
    get: get,
    post: post,
    delete: del,
    put: put,
    routes: routes
};