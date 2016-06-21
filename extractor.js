var Promise = require('promise')
var newPlaylistFilter = require('./newPlaylistFilter')
var status = require('./loadStatus')
var Queue = require('promise-queue')
var queue = new Queue(1, Infinity)
Queue.configure(Promise)

module.exports.loadUserPlaylists = function(api, userId, userName, filter) {
    filter = filter || function(playlists) {
        return playlists
    }

    function transform(playlists) {
        return playlists.map(function(playlist) {
            return {
                id: playlist.id,
                name: playlist.name,
                snapshot_id: playlist.snapshot_id,
                owner: {
                    id: userId
                },
                tracks: playlist.tracks,
                date: new Date()
            }
        })
    }

    function appendTracks(playlists) {
        function appendToSingle(playlist, index, total) {
            return api.all('getPlaylistTracks', [playlist.owner.id, playlist.id], 100)
                .then(function(tracks) {
                    playlist.tracks = tracks.map(function(track) {
                        return track.track
                    }).filter(function(track) {
                        return track !== null
                    }).map(function(track) {
                        return track.id
                    })
                    status.report('tracks')(playlist.tracks)
                    console.log('extracted tracks', playlist.tracks.length)
                    console.log('extracted ', (index + 1), '/', total)
                    return playlist
                })
        }
        console.log('extracted playlists: ' + Object.keys(playlists).length)
        return Promise.all(playlists
            .map(function(playlist, index, playlists) {
                return queue.add(function() {
                    return appendToSingle(playlist, index, playlists.length)
                })
            }))
    }

    return api.refresh().then(function() {
            console.log('Extracting playlists for', userName, userId)
            return api.all('getUserPlaylists', [userId])
        })
        .then(filter)
        .then(status.report('playlists'))
        .then(newPlaylistFilter)
        .then(status.report('filtered'))
        .then(appendTracks)
        .then(transform)
}
