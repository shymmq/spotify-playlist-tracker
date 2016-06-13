/*jslint node: true, nomen: true*/
'use strict';
var Promise = require('promise');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var config = require('./config');
var spotify = require('./spotify');

function filterNew(playlists) {
    console.log('filtering');
    return MongoClient.connect(config.db_url)
        .then(function (db) {
            return db.collection('playlists').find({
                $or: playlists.map(function (playlist) {
                    return {
                        'id': playlist.id,
                        'snapshot_id': playlist.snapshot_id
                    };
                })
            }, {
                id: 1
            }).map(function (u) {
                return u.id;
            }).toArray().then(function (ids) {
                var filtered = playlists.filter(function (playlist) {
                    return ids.indexOf(playlist.id) === -1;
                });
                console.log('filtered', filtered.length);
                return filtered;
            });
        });
}

function transformPlaylist(playlist) {
    var transformed = {};
    transformed.id = playlist.id;
    transformed.name = playlist.name;
    transformed.snapshot_id = playlist.snapshot_id;
    transformed.owner = {
        id: playlist.owner.id
    };
    transformed.date = new Date();
    return transformed;
}

function appendTracks(playlist, index, total) {
    return spotify.all(spotify.rootApi.getPlaylistTracks, [playlist.owner.id, playlist.id], 100)
        .then(function (tracks) {
            playlist.tracks = tracks.map(function (track) {
                return track.track;
            }).filter(function (track) {
                return track !== null;
            }).map(function (track) {
                return track.id;
            });
            console.log("extracted tracks", playlist.tracks.length);
            console.log('extracted ', (index + 1), '/', total);
            return playlist;
        });
}

function insertPlaylists(playlists) {
    return MongoClient.connect(config.db_url)
        .then(function (db) {
            if (playlists.length > 0) {
                console.log('inserting', playlists.length);
                return db.collection('playlists').insertMany(playlists).then(function (result) {
                    var loaded = result.insertedCount;
                    console.log("inserted: " + loaded);
                    return loaded;
                });
            } else {
                console.log("nothing to load");
                return 0;
            }

        });
}

function aggregateNames() {
    var aggregateCollName = "playlist-names";
    console.log('aggregating names');
    return MongoClient.connect(config.db_url)
        .then(function (db) {
            return db.collection(aggregateCollName).remove().then(function () {
                console.log(aggregateCollName, " removed");
                return db;
            });
        })
        .then(function (db) {
            return db.collection('playlists').aggregate([{
                $group: {
                    _id: "$id",
                    id: {$first:"$id"},
                    names: {
                        $addToSet: "$name"
                    }
                }
            }, {
                $out: aggregateCollName
            }]).toArray().then(function () {
                console.log("aggregated");
            });
        });
}

var start;

function displayTime(arg) {
    var diff = new Date() - start;
    console.log(Math.floor(diff / 1000) + 's');
    return arg;
}
module.exports = {};

module.exports.load = function () {
    start = new Date();
    spotify.rootApi.refreshAccessToken()
        .then(function () {
            console.log('token refreshed');
            return spotify.all(spotify.rootApi.getUserPlaylists, [config.user_id]);
        })
        .then(displayTime)
        .then(filterNew)
        .then(displayTime)
        .then(function (playlists) {
            console.log('extracted playlists: ' + Object.keys(playlists).length);
            return Promise.all(playlists
                .map(transformPlaylist)
                .map(function (playlist, index, playlists) {
                    return spotify.queue(function () {
                        return appendTracks(playlist, index, playlists.length);
                    });
                }));
        })
        .then(displayTime)
        .then(insertPlaylists)
        .then(displayTime)
        .then(aggregateNames)
        .then(displayTime)
        .then(function () {
            console.log('finished');
        }, function (err) {
            console.log(err);
        });
};
