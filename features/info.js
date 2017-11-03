function index(req, res, next) {
    res.fjson({
        version: "0.-5.0",
    })
}


module.exports = {
    index: index,
};