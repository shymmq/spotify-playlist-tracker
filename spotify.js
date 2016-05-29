/*jslint node: true, nomen: true*/
'use strict';
var Promise = require('promise');
var config = require('./config');
var SpotifyWebApi = require('spotify-web-api-node');

var queue = [];

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


module.exports.api = spotifyApi;