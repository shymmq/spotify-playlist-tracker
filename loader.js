/* jslint node: true, nomen: true*/
'use strict'
var MongoClient = require('mongodb').MongoClient
var config = require('./config')
var spotify = require('./spotify')
var status = require('./loadStatus')
var extractor = require('./extractor')

function insertPlaylists(playlists) {
    return MongoClient.connect(config.db_url)
        .then(function(db) {
            if (playlists.length > 0) {
                console.log('inserting', playlists.length)
                return db.collection('playlists').insertMany(playlists)
                    .then(function(result) {
                        var loaded = result.insertedCount
                        console.log('inserted: ' + loaded)
                        return loaded
                    })
            } else {
                console.log('nothing to load')
                return 0
            }
        })
}

function aggregateNames() {
    var aggregateCollName = 'playlist-names'
    console.log('aggregating names')
    return MongoClient.connect(config.db_url)
        .then(function(db) {
            return db.collection(aggregateCollName).remove().then(function() {
                console.log(aggregateCollName, ' removed')
                return db
            })
        })
        .then(function(db) {
            return db.collection('playlists').aggregate([{
                $group: {
                    _id: '$id',
                    id: {
                        $first: '$id'
                    },
                    owner: {
                        $first: '$owner.id'
                    },
                    names: {
                        $addToSet: '$name'
                    }
                }
            }, {
                $out: aggregateCollName
            }]).toArray().then(function() {
                console.log('aggregated')
            })
        })
}

function discoverWeeklyFilter(playlists) {
    return playlists.filter(function(playlist) {
        return playlist.owner.id === 'spotifydiscover'
    })
}

function loadAllUsersPlaylists(rootPlaylists) {
    var allPlaylists = rootPlaylists
    var cursor

    function iterateCursor() {
        return cursor.hasNext().then(function(hasNext) {
            if (hasNext) {
                return cursor.next().then(function(user) {
                    return extractor.loadUserPlaylists(
                        spotify.userApi(user),
                        user.id,
                        user.displayName,
                        discoverWeeklyFilter)
                }).then(function(playlists) {
                    allPlaylists = allPlaylists.concat(playlists)
                    return iterateCursor()
                })
            }
        })
    }

    return MongoClient.connect(config.db_url)
        .then(function(db) {
            cursor = db.collection('users').find()
            return iterateCursor().then(function() {
                return allPlaylists
            })
        })
}

function load() {
    status.start()
    extractor.loadUserPlaylists(spotify.rootApi, 'spotify', 'spotify')
        .then(loadAllUsersPlaylists)
        .then(insertPlaylists)
        .then(aggregateNames)
        .then(status.displayTime)
        .then(function() {
            console.log('finished')
        }, status.reportError)
        .then(status.store)
}
module.exports = {}

module.exports.routes = function(router) {
    router.get('/load', function(req, res) {
        if (req.query.secret !== config.client_secret) {
            res.status(403)
            res.send('Unauthorized')
        } else {
            load()
            res.redirect('/loadstatus')
        }
    })
    router.get('/loadstatus', function(req, res) {
        status.load().then(function(status) {
            if (status.err) {
                res.status(500)
            }
            res.json(status)
        })
    })
}
