/*global angular*/
'use strict'
var app = angular.module('spotify-playlist-tracker', ['ui.bootstrap', 'ngCookies', 'angularSpinner'])

app.factory('stateService', function($cookies, $window, $location) {
    var service = {}
    var params = $location.search()
    service.pid = params.pid || $cookies.get('pid')
    service.sid = params.sid || $cookies.get('sid')

    $cookies.remove('pid')
    $cookies.remove('sid')

    service.redirect = function(location) {
        $cookies.put('pid', service.pid)
        $cookies.put('sid', service.sid)
        $window.location.href = location
    }
    service.setSnapshotId = function(id) {
        service.sid = id
        $location.search('sid', id)
    }
    service.setPlaylistId = function(id) {
        service.pid = id
        $location.search('pid', id)
    }
    return service
})

app.config(function($httpProvider) {
    $httpProvider.interceptors.push(function($q, $window, stateService) {
        return {
            response: function(response) {
                return response
            },
            responseError: function(response) {
                console.log(response)
                if (response.status === 401) stateService.redirect('login')
                return $q.reject(response)
            }
        }
    })
})

app.controller('searchController', function($scope, $http, $anchorScroll, stateService) {
    $scope.login = function() {
        stateService.redirect('login')
    }

    $scope.logout = function() {
        stateService.redirect('logout')
    }

    $scope.search = function(query) {
        return $http.get('/search', {
                params: {
                    query: query
                }
            })
            .then(function(res) {
                console.log(res.data)
                return res.data
            }, function(err) {
                console.log(err)
            })
    }

    $scope.search = function(query) {
        return $http.get('/search', {
                params: {
                    query: query
                }
            })
            .then(function(res) {
                console.log(res.data)
                return res.data
            }, function(err) {
                console.log(err)
            })
    }
    $scope.clearSearch = function() {
        $scope.playlistNames = null
        document.getElementById('search').focus()
    }
    $scope.showHistory = function(playlistId) {
        stateService.setPlaylistId(playlistId)
        $scope.history = []
        $scope.tracks = []
        var data = {
            id: playlistId
        }
        $scope.snapshotLoading = true

        $http.get('/history', {
                params: data
            })
            .then(function(res) {
                $scope.history = res.data
                $scope.snapshotLoading = false
                console.log(stateService.sid, $scope.history)
                if (stateService.sid) {
                    var snapshot = $scope.history.find(function(snapshot) {
                        return stateService.sid === snapshot.snapshot_id
                    })
                }
                if (snapshot) {
                    $scope.showTracks(snapshot)
                } else {
                    $scope.showTracks($scope.history[0])
                }
            })
    }

    $scope.loadChunk = function() {
        document.getElementById('songs').scrollTop = 0
        $scope.tracksLoading = true
        $scope.tracks = []
        $http.get('/tracks', {
                params: {
                    tracks: $scope.snapshotSelected.tracks.slice($scope.offset, $scope.offset + 50)
                }
            })
            .then(function(res) {
                $scope.tracksLoading = false
                $scope.tracks = res.data
                console.log(res.data)
            })
    }
    $scope.showTracks = function(snapshot) {
        console.log(snapshot)
        stateService.setSnapshotId(snapshot.snapshot_id)
        $scope.snapshotSelected = snapshot
        $scope.offset = 0

        $scope.loadChunk()
    }
    $scope.nextPage = function() {
        $scope.offset += 50
        $scope.loadChunk()
    }
    $scope.prevPage = function() {
        $scope.offset -= 50
        $scope.loadChunk()
    }
    $scope.hasNext = function() {
        return $scope.snapshotSelected && ($scope.offset + 50) < $scope.snapshotSelected.tracks.length
    }
    $scope.hasPrev = function() {
        return $scope.offset > 0
    }

    $scope.restore = function() {
        if (!$scope.user) {
            stateService.redirect('login')
        } else {
            var name = prompt('Playlist name:', $scope.snapshotSelected.name)
            $http.get('/restore', {
                params: {
                    id: $scope.snapshotSelected.id,
                    name: name
                }
            })
        }
    }

    $http.get('/user').then(function(res) {
        if (res.data) {
            $scope.user = res.data
        }
    }, function(err) {
        console.log(err)
    })

    if (stateService.pid) {
        $scope.showHistory(stateService.pid)
    }
})
