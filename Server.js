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
var redirect_uri = 'http://localhost:3000/callback'; // Your redirect uri
var config = require('./config');
app.set('view engine', 'jade');

function getToken(callback) {
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            'Authorization': 'Basic ' + (new Buffer(config.client_id + ':' + config.client_secret).toString('base64'))
        },
        form: {
            grant_type: 'refresh_token',
            refresh_token: config.refresh_token
        },
        json: true

    };

    request.post(authOptions, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token;
            console.log(access_token);
            callback(access_token);

        }
    });
}

router.use(function (req, res, next) {
    console.log("/" + req.method);
    next();
});

router.get("/", function (req, res) {
    getToken(function (access_token) {
        var authOptions = {
            url: 'https://api.spotify.com/v1/me/playlists',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            json: true
        };
        request.get(authOptions, function (error, response, body) {
            console.log(body);
            res.render('playlists', body);
        });
    });
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

router.get("/songs", function (req, res) {
    var requestURL = 'https://api.spotify.com/v1/users/' + req.query.userid + '/playlists/' + req.query.id + '/tracks';
    console.log(requestURL);
    getToken(function (access_token) {
        var authOptions = {
            url: requestURL,
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            json: true
        };
        request.get(authOptions, function (error, response, body) {
            res.render('songs', body);
        });
    });
});

router.get("/style.css", function (req, res) {
    res.sendFile(path + "style.css");
});

router.get("/callback2", function (req, res) {
    res.sendFile(path + "contact.html");
    console.log(req.query);
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