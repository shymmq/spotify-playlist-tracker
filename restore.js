var MongoClient = require('mongodb').MongoClient
var config = require('./config')
var spotify = require('./spotify')
var auth = require('./auth')

function addSongs(api, user, playlistId, tracks) {
    console.log('adding', tracks.length, 'tracks')
    var offset = 0

    function addChunk() {
        var chunk = tracks.slice(offset, offset + 50)
            .map(function(trackId) {
                return 'spotify:track:' + trackId
            })
        return api.addTracksToPlaylist(user.id, playlistId, chunk)
            .then(function() {
                offset += 50
                if (offset < tracks.length) {
                    return addChunk()
                }
            })
    };
    return addChunk()
}

function restore(id, user, name) {
    console.log('restoring', id, 'as', name, 'for', user.displayName)
    var api = spotify.userApi(user)
    return MongoClient.connect(config.db_url)
        .then(function(db) {
            return db.collection('playlists').findOne({
                id: id
            })
        }).then(function(snapshot) {
            return api.refresh()
                .then(function() {
                    return api.createPlaylist(user.id, name, {
                        'public': false
                    })
                }).then(function(newPlaylist) {
                    console.log('added playlist', newPlaylist.body.id)
                    return addSongs(api, user, newPlaylist.body.id, snapshot.tracks)
                })
        })
}
module.exports.routes = function(router) {
    router.get('/restore', auth.isAuthorized, function(req, res) {
        var id = req.query.id
        var name = req.query.name
        return restore(id, req.user, name).then(function() {
            console.log('Restored')
            res.send(true)
        }, function(err) {
            console.log('Something went wrong!', err)
            res.send(false)
        })
    })
}
