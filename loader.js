/* jslint node: true, nomen: true*/
'use strict'
var Promise = require('promise')
var MongoClient = require('mongodb').MongoClient
var config = require('./config')
var spotify = require('./spotify')

function filterNew (playlists) {
  console.log('filtering')
  return MongoClient.connect(config.db_url)
        .then(function (db) {
          return db.collection('playlists').find({
            $or: playlists.map(function (playlist) {
              return {
                'id': playlist.id,
                'snapshot_id': playlist.snapshot_id
              }
            })
          }, {
            id: 1
          }).map(function (u) {
            return u.id
          }).toArray().then(function (ids) {
            var filtered = playlists.filter(function (playlist) {
              return ids.indexOf(playlist.id) === -1
            })
            console.log('filtered', filtered.length)
            return filtered
          })
        })
}

function transformPlaylist (playlist) {
  return {
    id: playlist.id,
    name: playlist.name,
    snapshot_id: playlist.snapshot_id,
    owner: {
      id: playlist.owner.id
    },
    date: new Date()
  }
}

function appendTracks (playlist, index, total) {
  return spotify.all(spotify.rootApi.getPlaylistTracks, [playlist.owner.id, playlist.id], 100)
        .then(function (tracks) {
          playlist.tracks = tracks.map(function (track) {
            return track.track
          }).filter(function (track) {
            return track !== null
          }).map(function (track) {
            return track.id
          })
          report('tracks')(playlist.tracks)
          console.log('extracted tracks', playlist.tracks.length)
          console.log('extracted ', (index + 1), '/', total)
          return playlist
        })
}

function insertPlaylists (playlists) {
  return MongoClient.connect(config.db_url)
        .then(function (db) {
          if (playlists.length > 0) {
            console.log('inserting', playlists.length)
            return db.collection('playlists').insertMany(playlists).then(function (result) {
              var loaded = result.insertedCount
              console.log('inserted: ' + loaded)
              return loaded
            })
          } else {
            console.log('nothing to load')
            return 0
          }
        })
}

function aggregateNames () {
  var aggregateCollName = 'playlist-names'
  console.log('aggregating names')
  return MongoClient.connect(config.db_url)
        .then(function (db) {
          return db.collection(aggregateCollName).remove().then(function () {
            console.log(aggregateCollName, ' removed')
            return db
          })
        })
        .then(function (db) {
          return db.collection('playlists').aggregate([{
            $group: {
              _id: '$id',
              id: {
                $first: '$id'
              },
              names: {
                $addToSet: '$name'
              }
            }
          }, {
            $out: aggregateCollName
          }]).toArray().then(function () {
            console.log('aggregated')
          })
        })
}

var status

function displayTime (arg) {
  var diff = new Date() - status.start
  console.log(Math.floor(diff / 1000) + 's')
  return arg
}
module.exports = {}

module.exports.load = function () {
  status = {
    finished: false,
    start: new Date(),
    playlists: 0,
    filtered: 0,
    tracks: 0
  }
  return spotify.rootApi.refresh()
        .then(function () {
          return spotify.all(spotify.rootApi.getUserPlaylists, ['spotify'])
        })
        .then(report('playlists'))
        .then(displayTime)
        .then(filterNew)
        .then(report('filtered'))
        .then(displayTime)
        .then(function (playlists) {
          console.log('extracted playlists: ' + Object.keys(playlists).length)
          return Promise.all(playlists
                .map(transformPlaylist)
                .map(function (playlist, index, playlists) {
                  return spotify.queue(function () {
                    return appendTracks(playlist, index, playlists.length)
                  })
                }))
        })
        .then(displayTime)
        .then(insertPlaylists)
        .then(displayTime)
        .then(aggregateNames)
        .then(displayTime)
        .then(function () {
          console.log('finished')
        }, function (err) {
          console.log(err)
          status.error = err
        })
        .then(storeStatus)
}

function storeStatus () {
  status.finished = new Date()
  console.log(status)
  return MongoClient.connect(config.db_url)
        .then(function (db) {
          return db.collection('statuses').insert(status)
        })
}
module.exports.loadStatus = function () {
  if (status) {
    return Promise.resolve(status)
  } else {
    return MongoClient.connect(config.db_url)
            .then(function (db) {
              return db.collection('statuses').find().sort({
                start: -1
              }).next()
            })
  }
}

function report (type) {
  return function (items) {
    status[type] += items.length
    return items
  }
}
