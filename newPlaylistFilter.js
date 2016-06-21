var MongoClient = require('mongodb').MongoClient
var config = require('./config')

module.exports = function(playlists) {
    console.log('filtering')
    return MongoClient.connect(config.db_url)
        .then(function(db) {
            return db.collection('playlists').find({
                $or: playlists.map(function(playlist) {
                    return {
                        'id': playlist.id,
                        'snapshot_id': playlist.snapshot_id
                    }
                })
            }, {
                id: 1
            }).map(function(u) {
                return u.id
            }).toArray().then(function(ids) {
                var filtered = playlists.filter(function(playlist) {
                    return ids.indexOf(playlist.id) === -1
                })
                console.log('filtered', filtered.length)
                return filtered
            })
        })
}
