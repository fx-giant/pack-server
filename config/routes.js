var router = require("../utils/router");
var get = router.get;
var del = router.delete;
var put = router.put;
var post = router.post;
var route = router.route;
var env = process.env;

get("/", "info.index");
post(env.UPLOAD_ENDPOINT, "upload.post");
get(env.UPLOAD_ENDPOINT, "upload.get");
module.exports = router.routes;