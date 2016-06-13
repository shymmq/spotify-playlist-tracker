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

var bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    methodOverride = require('method-override'),
    session = require('express-session'),
    passport = require('passport'),
    SpotifyStrategy = require('./node_modules/passport-spotify/lib/passport-spotify/index').Strategy;
var userTokens = [];
//loader.load();
passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new SpotifyStrategy({
        clientID: config.client_id,
        clientSecret: config.client_secret,
        callbackURL: 'http://localhost:3000/callback'
    },
    function(accessToken, refreshToken, profile, done) {
        console.log(refreshToken, profile.id);
        process.nextTick(function() {
            userTokens[profile.id] = refreshToken;
            return done(null, profile);
        });
    }));
app.use(cookieParser());
app.use(bodyParser());
app.use(methodOverride());
app.use(session({
    secret: 'ASdasdfasASDasddwtdfgdfg'
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(__dirname + '/public')); //serve static assets
app.use(express.static(__dirname + '/node_modules')); //serve static assets

router.get("/", function(req, res) {
    // res.render("search");
    res.sendFile(__dirname + '/public/index.html');
});
router.get("/load", function(res, req) {
    loader.load();
})
router.get("/tracks", function(req, res) {
    var trackIds = req.query.tracks;
    if (!(trackIds instanceof Array)) {
        trackIds = [trackIds];
    }
    spotify.rootApi.refresh()
        .then(function() {
            return spotify.rootApi.getTracks(trackIds);
        })
        .then(function(response) {
                res.json(response.body.tracks);
            },
            function(err) {
                console.log(err);
            });
});
router.get("/search", function(req, res) {
    console.log(req.user);
    var query = req.query.query;
    console.log("searching for ", query);
    return MongoClient.connect(config.db_url)
        .then(function(db) {
            return db.collection("playlist-names").find({
                names: {
                    $regex: query,
                    $options: 'i'
                }
            }).limit(5).toArray();
        })
        .then(function(results) {
            //console.log(results);
            res.json(results);
        }, function(err) {
            console.log(err);
        });
});
router.get("/history", function(req, res) {
    var id = req.query.id;
    console.log("searching hisodastry  for ", id);
    return MongoClient.connect(config.db_url)
        .then(function(db) {
            return db.collection("playlists").find({
                id: id
            }).limit(20).sort({
                date: -1
            }).toArray();
        })
        .then(function(results) {
            console.log(results);
            res.json(results);
        }, function(err) {
            console.log(err);
        });
});

var auth = function(req, res, next) {
    if (!req.isAuthenticated()) {
        res.send(401)
    } else {
        next()
    }
};

app.get('/login',
    passport.authenticate('spotify', {
        scope: ['user-read-email', 'user-read-private', 'playlist-modify-private', 'playlist-modify-public']
    }),
    function(req, res) {});

app.get('/callback',
    passport.authenticate('spotify', {
        failureRedirect: '/'
    }),
    function(req, res) {
        res.redirect('/');
    });

app.get('/logout', auth, function(req, res) {
    req.logout();
    res.redirect('/');
});

app.get('/user', function(req, res) {
    res.send(req.isAuthenticated() ? req.user : false);
});

app.get('/restore', auth, function(req, res) {
    var id = req.query.id;
    var api = spotify.newApi();
    var token = userTokens[req.user.id];
    api.setRefreshToken(token);
    MongoClient.connect(config.db_url)
        .then(function(db) {
            return db.collection("playlists").findOne({
                id: id
            });
        }).then(function(snapshot) {
            return api.refresh()
                .then(function() {
                    return api.createPlaylist(req.user.id, snapshot.name, {
                        'public': false
                    });
                }).then(function(newPlaylist) {
                  console.log("added playlist", newPlaylist.body.id);
                  var offset = 0;
                  return function addChunk() {
                    var chunk = snapshot.tracks.slice(offset, offset+50)
                      .map(function(trackId) {
                        return 'spotify:track:' + trackId;
                      });
                      console.log("adding chunk", offset);
                    return api.addTracksToPlaylist(req.user.id, newPlaylist.body.id, chunk)
                      .then(function() {
                          console.log("added chunk", offset);
                          offset += 50;
                          if(offset < snapshot.tracks.length){
                            return addChunk();
                          } else {
                            res.send(0);
                          }
                      }, function(err) {
                          console.log('Something went wrong!', err);
                      })
                  }();
                });
        }, function(err) {
            console.log('Something went wrong!', err);
        })


});

router.use(function(req, res, next) {
    console.log("/" + req.method);
    next();
});

app.use("/", router);

app.use("*", function(req, res) {
    res.status(404);
    res.sendFile(__dirname + "/public/404.html");
});

app.listen(3000, function() {
    console.log("Live at Port 3000");
});
