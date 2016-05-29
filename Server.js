/*jslint node: true, nomen: true*/
'use strict';
var express = require("express");
var app = express();
var router = express.Router();
var path = __dirname + '/views/';
var request = require('request');
var url = require('url');
var querystring = require('querystring');
var MongoClient = require('mongodb').MongoClient;
var config = require('./config');
var spotify = require('./spotify');
var loader = require('./loader');

var redirect_uri = 'http://localhost:3000/callback';

app.set('view engine', 'jade');

//loader.load();

router.get("/", function (req, res) {
    spotify.refreshAccessToken
        .then(function () {
            return spotify.api.getUserPlaylists(config.user_id);
        })
        .then(function (data) {
            console.log('Retrieved playlists', data.body);
            res.render('playlists', data.body);
        });
});

router.get("/songs", function (req, res) {
    spotify.refreshAccessToken
        .then(function () {
            return spotify.api.getPlaylistTracks(req.query.userid, req.query.id);
        })
        .then(function (data) {
            res.render('songs', data.body);
            console.log('The playlist contains these tracks', data.body);
        });
});

router.get("/search", function (req, res) {
    var query = req.query.query;
    console.log("searching for ", query);
    return MongoClient.connect(config.db_url)
        .then(function (db) {
            return db.collection("playlist-names").find({
                names: {
                    $regex: query,
                    $options: 'i'
                }
            }).toArray();
        })
        .then(function (results) {
            console.log(results);
            res.setHeader('Content-Type', 'application/json');
            res.send(results);
        }, function (err) {
            console.log(err);
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