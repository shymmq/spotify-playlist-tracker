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

function getItems(response) {
    return response.body.items;
}

function stripPlaylist(playlist) {
    var stripped = {};
    stripped.id = playlist.id;
    stripped.name = playlist.name;
    stripped.snapshot_id = playlist.snapshot_id;
    stripped.owner = {
        id: playlist.owner.id
    };
    return stripped;
}

function appendTracks(playlist, index, total) {
    return spotify.all(spotify.api.getPlaylistTracks, [playlist.owner.id, playlist.id], 100)
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

var start;

function displayTime(arg) {
    var diff = new Date() - start;
    console.log(Math.floor(diff / 1000) + 's');
    return arg;
}
module.exports = {};

module.exports.load = function () {
    start = new Date();
    spotify.refreshAccessToken
        .then(function () {
            console.log('token refreshed');
            return spotify.all(spotify.api.getUserPlaylists, [config.user_id]);
        })
        .then(displayTime)
        .then(filterNew)
        .then(displayTime)
        .then(function (playlists) {
            console.log('extracted playlists: ' + Object.keys(playlists).length);
            return Promise.all(playlists
                .map(stripPlaylist)
                .map(function (playlist, index, playlists) {
                    return spotify.queue(function () {
                        return appendTracks(playlist, index, playlists.length);
                    });
                }));
        })
        .then(displayTime)
        .then(insertPlaylists)
        .then(displayTime)
        .then(function () {
            console.log('finished');
        }, function (err) {
            console.log(err);
        });
};