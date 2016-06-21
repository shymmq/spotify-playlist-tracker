var MongoClient = require('mongodb').MongoClient
var config = require('./config')

var status
module.exports = {}
module.exports.start = function() {
    status = {
        finished: false,
        start: new Date(),
        playlists: 0,
        filtered: 0,
        tracks: 0
    }
}

module.exports.displayTime = function(arg) {
    var diff = new Date() - status.start
    console.log(Math.floor(diff / 1000) + 's')
    return arg
}

module.exports.store = function() {
    status.finished = new Date()
    console.log(status)
    return MongoClient.connect(config.db_url)
        .then(function(db) {
            return db.collection('statuses').insert(status)
        })
}
module.exports.load = function() {
    if (status) {
        return Promise.resolve(status)
    } else {
        return MongoClient.connect(config.db_url)
            .then(function(db) {
                return db.collection('statuses').find().sort({
                    start: -1
                }).next()
            })
    }
}

module.exports.report = function(type) {
    return function(items) {
        status[type] += items.length
        return items
    }
}
module.exports.reportError = function(err) {
    console.log(err)
    status.error = err
}
