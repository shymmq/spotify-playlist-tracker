/*global angular*/
'use strict';
var app = angular.module('spotify-playlist-tracker', ['ui.bootstrap']);
//app.config(function ($routeProvider) {
//    $routeProvider
//        .when('/', {
//            templateUrl: 'search.html',
//            controller: 'searchController'
//        })
//});
app.controller('searchController', function ($scope, $http) {
    $scope.search = function (query) {
        return $http.get('/search', {
                params: {
                    query: query
                }
            })
            .then(function (res) {
                console.log(res.data);
                return res.data;
            });
    }
    $scope.getTimes = function (n) {
        var res = [];
        for (var i = 0; i < n; i++) {
            res.push(i);
        }
        return res
    };
    $scope.showHistory = function (playlistNames) {
      console.log("showHistory");
      console.log(playlistNames);
        $scope.history = [];
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
            .then(function (res) {
                $scope.history = res.data;
                $scope.snapshotLoading = false;
                console.log($scope.history);
            });
    }
    $scope.showTracks = function (snapshot) {
        console.log(snapshot);
        $scope.tracksLoading = true;
        $scope.tracks = [];
        var offset = 0;

        function loadChunk() {
            $http.get('/tracks', {
                    params: {
                        tracks: snapshot.tracks.slice(offset, offset + 50)
                    }
                })
                .then(function (res) {
                    console.log(res.data);
                    $scope.tracksLoading = false;
                    $scope.tracks = $scope.tracks.concat(res.data);
                    if ($scope.tracks.length < snapshot.tracks.length) {
                        offset += 50;
                        return loadChunk();
                    }


                });
        }
        loadChunk();
    }


});
