var app = angular.module('spotify-playlist-tracker', ['ngRoute', 'ngMaterial', 'ngMessages', 'ngAnimate']);
app.config(function ($routeProvider) {
    $routeProvider
        .when('/search', {
            templateUrl: 'search.html',
            controller: 'searchController'
        })
        .when('/', {
            templateUrl: 'playlists.html',
            controller: 'playlistsController'
        })

    .when('/songs/:id', {
        templateUrl: 'songs.html',
        controller: 'songsController'
    })

    .when('/history/:id', {
            templateUrl: 'history.html',
            controller: 'historyController'
        })
        //the signup displa
        // .when('/register', {
        // 	templateUrl: 'register.html',
        // 	controller: 'authController'
});
app.controller('playlistsController', function ($scope, $http) {
    // $scope.items=[{name:"ABC",id:"4321"},{name: "def",id:"66678"}];
    $http.get('/playlists')
        .then(function (res) {
            $scope.items = res.data.items;
        });
});
app.controller('songsController', function ($scope, $http, $routeParams) {
    $scope.id = $routeParams.id;
    console.log("Starting songsController");
    var data = {
        userid: 'spotify',
        id: $routeParams.id
    }
    $http.get('/songs', {
            params: data
        })
        .then(function (res) {
            var items = res.data.items;


            $scope.data = items;

        });

});
app.controller('searchController', function ($scope, $http) {
    $scope.search = function (query) {
        //        console.log($scope.search_query);

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

});
app.controller('historyController', function ($scope, $http, $routeParams) {
    var id = $routeParams.id;
    console.log("Starting historyController");
    var data = {
        id: id
    }
    $http.get('/history', {
            params: data
        })
        .then(function (res) {
            $scope.data = res.data;

        });
});
