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
var restore = require('./restore')
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser')
var methodOverride = require('method-override')
var path = require('path')

app.use(cookieParser())
app.use(bodyParser())
app.use(methodOverride())

app.use(express.static(path.join(__dirname, '/public')))
app.use(express.static(path.join(__dirname, '/node_modules')))

auth.routes(app)
loader.routes(router)
restore.routes(router)

router.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, '/public/index.html'))
})

router.get('/tracks', function(req, res) {
    var trackIds = req.query.tracks
    if (!(trackIds instanceof Array)) {
        trackIds = [trackIds]
    }
    spotify.rootApi.refresh()
        .then(function() {
            return spotify.rootApi.getTracks(trackIds)
        })
        .then(
            function(response) {
                res.json(response.body.tracks)
            },
            function(err) {
                console.log(err)
            })
})
router.get('/search', function(req, res) {
    var query = req.query.query
    var allowedOwners = ['spotify']
    if (req.user) {
        allowedOwners.push(req.user.id)
    }
    console.log('searching for ', query, allowedOwners)
    return MongoClient.connect(config.db_url)
        .then(function(db) {
            return db.collection('playlist-names').find({
                names: {
                    $regex: query,
                    $options: 'i'
                },
                owner: {
                    $in: allowedOwners
                }
            }).limit(5).toArray()
        })
        .then(function(results) {
            res.json(results)
        }, function(err) {
            console.log(err)
        })
})
router.get('/history', function(req, res) {
    var id = req.query.id
    console.log('searching history  for ', id)
    return MongoClient.connect(config.db_url)
        .then(function(db) {
            return db.collection('playlists').find({
                id: id
            }).limit(20).sort({
                date: -1
            }).toArray()
        })
        .then(function(results) {
            res.json(results)
        }, function(err) {
            console.log(err)
        })
})

app.use('/', router)

app.use('*', function(req, res) {
    res.status(404)
    res.sendFile(path.join(__dirname, '/public/404.html'))
})

app.listen(config.port, function() {
    console.log('Live at Port', config.port)
})
