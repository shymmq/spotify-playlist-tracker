var app = angular.module('spotify-playlist-tracker', ['ngRoute']);

app.config(function($routeProvider){
	$routeProvider
		.when('/search',{
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

		//the signup displa
		// .when('/register', {
		// 	templateUrl: 'register.html',
		// 	controller: 'authController'
});
app.controller('playlistsController', function($scope,$http){
	// $scope.items=[{name:"ABC",id:"4321"},{name: "def",id:"66678"}];
	$http.get('/playlists')
       .then(function(res){
          $scope.items = res.data.items;                
        });
});
app.controller('songsController', function($scope,$http,$routeParams){
	$scope.id=$routeParams.id;
	console.log("Starting songsController");
	var data = {userid: 'spotify',id: $routeParams.id}
	$http.get('/songs',{params:data})
       .then(function(res){
          	var items = res.data.items;   

			
			$scope.data=items;

    });
	
});
app.controller('searchController', function($scope,$http){
	$scope.search=function(){
		console.log($scope.search_query);
		$http.get('/search',{params: {query: $scope.search_query}})
		.then(function(res){
			$scope.results=res.data;
			console.log(res.data);
		})
	}

});