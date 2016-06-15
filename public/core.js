/*global angular*/
'use strict';
var app = angular.module('spotify-playlist-tracker', ['ui.bootstrap']);

app.config(function ($httpProvider) {
    $httpProvider.interceptors.push(function ($q, $window) {
        return {
            response: function (response) {
                return response;
            },
            responseError: function (response) {
                console.log(response);
                if (response.status === 401) $window.location.href = 'login';
                return $q.reject(response);
            }
        };
    });
});

app.controller('searchController', function ($scope, $http, $location, $anchorScroll) {
    $http.get('/user').then(function (res) {
        if (res.data) {
            $scope.user = res.data
        }
    }, function (err) {
        console.log(err);
    });

    $scope.search = function (query) {
        return $http.get('/search', {
                params: {
                    query: query
                }
            })
            .then(function (res) {
                console.log(res.data);
                return res.data;
            }, function (err) {
                console.log(err);
            });
    }
    $scope.clearSearch = function () {
        $scope.playlistNames = null;
        document.getElementById("search").focus();
    }
    $scope.showHistory = function (playlistId, snapshotId) {
        $location.search('pid', playlistId);
        console.log(playlistId);
        $scope.playlistIdSelected = playlistId;
        $scope.history = [];
        $scope.tracks = [];
        var data = {
            id: playlistId
        }
        $scope.snapshotLoading = true;

        $http.get('/history', {
                params: data
            })
            .then(function (res) {
                $scope.history = res.data;
                $scope.snapshotLoading = false;
                console.log($scope.history);
                if (snapshotId) {
                    var snapshot = $scope.history.find(function (snapshot) {
                        return snapshotId === snapshot.id;
                    });
                }
                if (snapshot) {
                    $scope.showTracks(snapshot);
                } else {
                    $scope.showTracks($scope.history[0]);
                }
            });
    }

    $scope.loadChunk = function () {
        document.getElementById("songs").scrollTop = 0;
        $scope.tracksLoading = true;
        $scope.tracks = [];
        $http.get('/tracks', {
                params: {
                    tracks: $scope.snapshotSelected.tracks.slice($scope.offset, $scope.offset + 50)
                }
            })
            .then(function (res) {
                $scope.tracksLoading = false;
                $scope.tracks = res.data;
                console.log(res.data);
            });
    };
    $scope.showTracks = function (snapshot) {
        console.log(snapshot);
        $location.search('sid', snapshot.id);
        $scope.snapshotSelected = snapshot;
        $scope.offset = 0;

        $scope.loadChunk();
    };
    $scope.nextPage = function () {
        $scope.offset += 50;
        $scope.loadChunk();
    }
    $scope.prevPage = function () {
        $scope.offset -= 50;
        $scope.loadChunk();
    }
    $scope.hasNext = function () {
        return $scope.snapshotSelected && ($scope.offset + 50) < $scope.snapshotSelected.tracks.length;
    }
    $scope.hasPrev = function () {
        return $scope.offset > 0;
    }
    $scope.restore = function () {
        var name = prompt("Playlist name:", $scope.snapshotSelected.name)
        $http.get('/restore', {
            params: {
                id: $scope.snapshotSelected.id,
                name: name
            }
        });
    }
    var params = $location.search();
    if (params.pid) {
        $scope.showHistory(params.pid, params.sid);
    }
});
