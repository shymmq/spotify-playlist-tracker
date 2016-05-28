/*jslint node: true, nomen: true*/
'use strict';
var Promise = require('promise');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var config = require('./config');
var spotify = require('./spotify');
var heartbeats = require('heartbeats');

var heart = heartbeats.createHeart(1000);

function insertPlaylists(playlists) {
    MongoClient.connect(config.db_url, function (err, db) {
        assert.equal(null, err);
        db.collection('playlists').insertMany(playlists, function (err, r) {
            assert.equal(null, err);
            console.log("inserted: " + r.insertedCount);
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
    console.log('loading offset: ' + offset);
    return spotify.refreshAccessToken
        .then(function (spotifyApi) {
            return spotify.api.getUserPlaylists('spotify', {
                limit: 50,
                offset: offset
            });
        }).then(getItems)
        .then(function (playlists) {
            //console.log('playlists: ' + Object.keys(playlists).length)
            return Promise.all(playlists
                .map(stripPlaylist)
                .map(appendTracks));
        }).then(insertPlaylists)
        .then(function () {
            console.log('loaded offset: ' + offset);
        });
}

module.exports = {};

module.exports.load = function () {
    spotify.refreshAccessToken
        .then(function (spotifyApi) {
            return spotify.api.getUserPlaylists('spotify', {
                limit: 1
            });
        }).then(function (response) {
            var total = response.body.total,
                offset = 0;
            console.log(total);

            heart.createEvent(10, {
                repeat: Math.ceil(total / 50)
            }, function () {
                loadPart(offset);
                offset += 50;
            });
        });
};