/*global angular*/
'use strict';
var app = angular.module('spotify-playlist-tracker', ['ui.bootstrap']);

app.controller('searchController', function($scope, $http, $location, $anchorScroll) {
    $scope.search = function(query) {
        return $http.get('/search', {
                params: {
                    query: query
                }
            })
            .then(function(res) {
                console.log(res.data);
                return res.data;
            });
    }
    $scope.clearSearch = function() {
      $scope.playlistNames = null;
    }
    $scope.showHistory = function(playlistNames) {
        console.log("showHistory");
        console.log(playlistNames);

        $scope.history = [];
        $scope.tracks = [];
        if (!playlistNames) {
            return;
        }
        var data = {
            id: playlistNames.id
        }
        $scope.snapshotLoading = true;

        $http.get('/history', {
                params: data
            })
            .then(function(res) {
                $scope.history = res.data;
                $scope.snapshotLoading = false;
                console.log($scope.history);
                $scope.showTracks($scope.history[0]);
            });
    }
    $scope.loadChunk = function() {
      document.getElementById("songs").scrollTop = 0;
        $scope.tracksLoading = true;
        $scope.tracks = [];
        $http.get('/tracks', {
                params: {
                    tracks: $scope.snapshotSelected.tracks.slice($scope.offset, $scope.offset + 50)
                }
            })
            .then(function(res) {
                $scope.tracksLoading = false;
                $scope.tracks = res.data;
                console.log(res.data);
            });
    };
    $scope.showTracks = function(snapshot) {
        console.log(snapshot);
        $scope.snapshotSelected = snapshot;
        $scope.offset = 0;

        $scope.loadChunk();
    };
    $scope.nextPage = function() {
        $scope.offset += 50;
        $scope.loadChunk();
    }
    $scope.prevPage = function() {
        $scope.offset -= 50;
        $scope.loadChunk();
    }
    $scope.hasNext = function() {
        return $scope.snapshotSelected && ($scope.offset + 50) < $scope.snapshotSelected.tracks.length;
    }
    $scope.hasPrev = function() {
        return $scope.offset > 0;
    }
});
