/*jslint node: true, nomen: true*/
'use strict';
var Promise = require('promise');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var config = require('./config');
var spotify = require('./spotify');

function insertPlaylists(playlists) {
    return MongoClient.connect(config.db_url)
        .then(function (db) {
            var collection = db.collection('playlists');

            return collection.find({
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
                if (filtered.length > 0) {
                    return collection.insertMany(filtered).then(function (result) {
                        var loaded = result.insertedCount;
                        console.log("loaded: " + loaded);
                        return loaded;
                    });
                } else {
                    console.log("nothing to load");
                    return 0;
                }
            });
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

function appendTracks(playlist) {
    return spotify.api.getPlaylistTracks(playlist.owner.id, playlist.id)
        .then(getItems)
        .then(function (tracks) {
            playlist.tracks = tracks.map(function (track) {
                return track.track;
            }).filter(function (track) {
                return track !== null;
            }).map(function (track) {
                return track.id;
            });
            return playlist;
        });
}

function loadPart(offset) {
    console.log('starting offset: ' + offset);
    return spotify.refreshAccessToken
        .then(function (spotifyApi) {
            return spotify.api.getUserPlaylists(config.user_id, {
                limit: 50,
                offset: offset
            });
        }).then(getItems)
        .then(function (playlists) {
            console.log('extracted playlists: ' + Object.keys(playlists).length);
            return Promise.all(playlists
                .map(stripPlaylist)
                .map(appendTracks));
        }).then(insertPlaylists)
        .then(function (loaded) {
            console.log('finished offset: ' + offset);
            return loaded;
        });
}

function delay(time) {
    return new Promise(function (fulfill) {
        setTimeout(fulfill, time);
    });
}

module.exports = {};

module.exports.load = function () {
    spotify.refreshAccessToken
        .then(function (spotifyApi) {
            return spotify.api.getUserPlaylists(config.user_id, {
                limit: 1
            });
        }).then(function (response) {
            var total = response.body.total,
                promises = [],
                offsets = [],
                offset,
                delaySeconds;
            console.log(total);
            for (offset = 0, delaySeconds = 0; offset < total; offset += 50, delaySeconds += 10) {
                offsets.push({
                    offset: offset,
                    delaySeconds: delaySeconds
                });
            }
            return Promise.all(offsets.map(function (offsetDelay) {
                return delay(offsetDelay.delaySeconds * 1000).then(function () {
                    return loadPart(offsetDelay.offset);
                });
            }));
        }).then(function (totals) {
            console.log('loading finished');
            console.log('total loaded:' + totals.reduce(function (pv, cv) {
                return pv + cv;
            }, 0));
        });
};