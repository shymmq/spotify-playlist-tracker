/* jslint node: true, nomen: true*/
'use strict'
var express = require('express')
var app = express()
var router = express.Router()
var MongoClient = require('mongodb').MongoClient
var config = require('./config')
var spotify = require('./spotify')
var loader = require('./loader')
var auth = require('./auth')
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser')
var methodOverride = require('method-override')
var path = require('path')

app.use(cookieParser())
app.use(bodyParser())
app.use(methodOverride())

app.use(express.static(path.join(__dirname, '/public'))) // serve static assets
app.use(express.static(path.join(__dirname, '/node_modules'))) // serve static assets

auth.routes(app)
router.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, '/public/index.html'))
})
router.get('/load', function (req, res) {
  if (req.query.secret !== config.client_secret) {
    res.status(666)
    res.send('Unauthorized')
  } else {
    loader.load()
    res.redirect('/loadstatus')
  }
})
router.get('/loadstatus', function (req, res) {
  loader.loadStatus().then(function (status) {
    if (status.err) {
      res.status(500)
    }
    res.json(status)
  })
})
router.get('/tracks', function (req, res) {
  var trackIds = req.query.tracks
  if (!(trackIds instanceof Array)) {
    trackIds = [trackIds]
  }
  spotify.rootApi.refresh()
        .then(function () {
          return spotify.rootApi.getTracks(trackIds)
        })
        .then(
            function (response) {
              res.json(response.body.tracks)
            },
            function (err) {
              console.log(err)
            })
})
router.get('/search', function (req, res) {
  var query = req.query.query
  console.log('searching for ', query)
  return MongoClient.connect(config.db_url)
        .then(function (db) {
          return db.collection('playlist-names').find({
            names: {
              $regex: query,
              $options: 'i'
            }
          }).limit(5).toArray()
        })
        .then(function (results) {
          res.json(results)
        }, function (err) {
          console.log(err)
        })
})
router.get('/history', function (req, res) {
  var id = req.query.id
  console.log('searching history  for ', id)
  return MongoClient.connect(config.db_url)
        .then(function (db) {
          return db.collection('playlists').find({
            id: id
          }).limit(20).sort({
            date: -1
          }).toArray()
        })
        .then(function (results) {
          res.json(results)
        }, function (err) {
          console.log(err)
        })
})

app.get('/restore', auth.isAuthorized, function (req, res) {
  var id = req.query.id
  var api = spotify.newApi()
  var name = req.query.name
  api.setRefreshToken(req.user.refreshToken)
  MongoClient.connect(config.db_url)
        .then(function (db) {
          return db.collection('playlists').findOne({
            id: id
          })
        }).then(function (snapshot) {
          return api.refresh()
                .then(function () {
                  return api.createPlaylist(req.user.id, name, {
                    'public': false
                  })
                }).then(function (newPlaylist) {
                  console.log('added playlist', newPlaylist.body.id)
                  var offset = 0

                  function addChunk () {
                    var chunk = snapshot.tracks.slice(offset, offset + 50)
                            .map(function (trackId) {
                              return 'spotify:track:' + trackId
                            })
                    console.log('adding chunk', offset)
                    return api.addTracksToPlaylist(req.user.id, newPlaylist.body.id, chunk)
                            .then(function () {
                              console.log('added chunk', offset)
                              offset += 50
                              if (offset < snapshot.tracks.length) {
                                return addChunk()
                              } else {
                                res.send(0)
                              }
                            }, function (err) {
                              console.log('Something went wrong!', err)
                            })
                  };
                  return addChunk()
                })
        }, function (err) {
          console.log('Something went wrong!', err)
        })
})

app.use('/', router)

app.use('*', function (req, res) {
  res.status(404)
  res.sendFile(path.join(__dirname, '/public/404.html'))
})

app.listen(config.port, function () {
  console.log('Live at Port', config.port)
})
