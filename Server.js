/*jslint node: true, nomen: true*/
'use strict';
var express = require("express");
var app = express();
var router = express.Router();
var Promise = require('promise');
var MongoClient = require('mongodb').MongoClient;
var config = require('./config');
var spotify = require('./spotify');
var loader = require('./loader');

//loader.load();
app.use(express.static(__dirname + '/public')); //serve static assets
app.use(express.static(__dirname + '/node_modules')); //serve static assets
router.get("/", function (req, res) {
    // res.render("search");
    res.sendFile(__dirname + '/public/index.html');
});
router.get("/load", function (res, req) {
    loader.load();
})
router.get("/tracks", function (req, res) {
    spotify.refreshAccessToken
        .then(function () {
            return spotify.api.getTracks(req.query.tracks);
        })
        .then(function (response) {
                res.json(response.body.tracks);
            },
            function (err) {
                console.log(err);
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
            }).limit(20).toArray();
        })
        .then(function (results) {
            console.log(results);
            res.json(results);
        }, function (err) {
            console.log(err);
        });
});
router.get("/history", function (req, res) {
    var id = req.query.id;
    console.log("searching hisodastry  for ", id);
    return MongoClient.connect(config.db_url)
        .then(function (db) {
            return db.collection("playlists").find({
                id: id
            }).limit(20).sort({
                date: -1
            }).toArray();
        })
        .then(function (results) {
            console.log(results);
            res.json(results);
        }, function (err) {
            console.log(err);
        });
});

router.use(function (req, res, next) {
    console.log("/" + req.method);
    next();
});

app.use("/", router);

app.use("*", function (req, res) {
    res.status(404);
    res.sendFile(__dirname + "/public/404.html");
});

app.listen(3000, function () {
    console.log("Live at Port 3000");
});
