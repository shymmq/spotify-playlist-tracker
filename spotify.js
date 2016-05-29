/*jslint node: true, nomen: true*/
'use strict';
var Promise = require('promise');
var config = require('./config');
var SpotifyWebApi = require('spotify-web-api-node');
var Queue = require('promise-queue');
var queue = new Queue(1, Infinity);

var spotifyApi = new SpotifyWebApi({
    clientId: config.client_id,
    clientSecret: config.client_secret
});

spotifyApi.setRefreshToken(config.refresh_token);

module.exports = {};

module.exports.refreshAccessToken = new Promise(function (resolve, reject) {
    spotifyApi.refreshAccessToken()
        .then(function (data) {
            spotifyApi.setAccessToken(data.body.access_token);
            resolve();
        }, function (err) {
            console.log('Could not refresh access token', err);
            reject();
        });
});

module.exports.queue = function (promiseGenerator) {
    return queue.add(function () {
        return promiseGenerator().then(function (result) {
            return result;
        }, function (error) {
            console.log('error', error);
        });
    });
};

function loadPart(fn, args, page, loaded) {
    return fn.apply(spotifyApi, args).then(function (response) {
        loaded = loaded.concat(response.body.items);
        if (response.body.next !== null) {
            page.offset += page.limit;
            console.log('page ', page.offset, '/', response.body.total);
            return loadPart(fn, args, page, loaded);
        } else {
            return loaded;
        }
    });
}

module.exports.all = function (fn, args, limit) {
    var page = {
        offset: 0,
        limit: limit || 50
    };
    args.push(page);
    return loadPart(fn, args, page, [])
        .then(function (loaded) {
            return loaded;
        });
};

module.exports.api = spotifyApi;