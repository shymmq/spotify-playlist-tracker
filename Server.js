/*jslint node: true, nomen: true*/
'use strict';
var express = require("express");
var app = express();
var router = express.Router();
var path = __dirname + '/views/';
var request = require('request');
var url = require('url');
var querystring = require('querystring');
var iconv = require('iconv-lite');
var config = require('./config');
var SpotifyWebApi = require('spotify-web-api-node');
var redirect_uri = 'http://localhost:3000/callback';
var spotifyApi = new SpotifyWebApi({
    clientId: config.client_id,
    clientSecret: config.client_secret,
    redirectUri: redirect_uri
});
spotifyApi.setRefreshToken(config.refresh_token);

app.set('view engine', 'jade');

function refreshAccessToken(callback) {
    spotifyApi.refreshAccessToken()
        .then(function (data) {
            spotifyApi.setAccessToken(data.body.access_token);
            callback();
        }, function (err) {
            console.log('Could not refresh access token', err);
        });
}

router.get("/", function (req, res) {
    refreshAccessToken(function () {
        spotifyApi.getUserPlaylists(config.user_id)
            .then(function (data) {
                console.log('Retrieved playlists', data.body);
                res.render('playlists', data.body);
            }, function (err) {
                console.log('Something went wrong!', err);
            });
    });
});

router.get("/songs", function (req, res) {
    refreshAccessToken(function () {
        spotifyApi.getPlaylistTracks(req.query.userid, req.query.id)
            .then(function (data) {
                res.render('songs', data.body);
                console.log('The playlist contains these tracks', data.body);
            }, function (err) {
                console.log('Something went wrong!', err);
            });
    });
});

router.use(function (req, res, next) {
    console.log("/" + req.method);
    next();
});

router.get("/spotify", function (req, res) {

    var scopes = 'user-read-private user-read-email playlist-read-private playlist-modify-public playlist-modify-private playlist-read-collaborative';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: config.client_id,
            scope: scopes,
            redirect_uri: redirect_uri
        }));
});

router.get("/style.css", function (req, res) {
    res.sendFile(path + "style.css");
});

router.get("/callback", function (req, res) {
    res.sendFile(path + "contact.html");
    console.log(req.query);
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
            code: req.query.code,
            redirect_uri: 'http://localhost:3000/callback',
            grant_type: 'authorization_code'
        },
        headers: {
            'Authorization': 'Basic ' + (new Buffer(config.client_id + ':' + config.client_secret).toString('base64'))
        },
        json: true
    };

    request.post(authOptions, function (error, response, body) {
        console.log(body);
        console.log(error);
        console.log(response);
    });

});

app.use("/", router);

app.use("*", function (req, res) {
    res.sendFile(path + "404.html");
});

app.listen(3000, function () {
    console.log("Live at Port 3000");
});