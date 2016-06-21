var session = require('express-session')
var randomstring = require('randomstring')
var passport = require('passport')
var MongoClient = require('mongodb').MongoClient
var config = require('./config')

var SpotifyStrategy = require('./node_modules/passport-spotify/lib/passport-spotify/index').Strategy

passport.serializeUser(function(user, done) {
    done(null, user.id)
})

passport.deserializeUser(function(id, done) {
    MongoClient.connect(config.db_url)
        .then(function(db) {
            return db.collection('users').findOne({
                _id: id
            })
        }).then(function(user) {
            return done(null, user)
        })
})

passport.use(new SpotifyStrategy({
        clientID: config.client_id,
        clientSecret: config.client_secret,
        callbackURL: config.app_url + '/callback'
    },
    function(accessToken, refreshToken, profile, done) {
        return MongoClient.connect(config.db_url)
            .then(function(db) {
                return db.collection('users').updateOne({
                    _id: profile.id
                }, {
                    _id: profile.id,
                    id: profile.id,
                    displayName: profile.displayName,
                    emails: profile.emails,
                    refreshToken: refreshToken
                }, {
                    upsert: true
                })
            }).then(function() {
                console.log('User logged in', profile.displayName)
                return done(null, profile)
            })
    }))

function routes(router) {
    router.use(session({
        secret: randomstring.generate()
    }))
    router.use(passport.initialize())
    router.use(passport.session())

    router.get('/login',
        passport.authenticate('spotify', {
            scope: ['user-read-email', 'user-read-private', 'playlist-modify-private', 'playlist-read-private']
        }),
        function(req, res) {})

    router.get('/callback',
        passport.authenticate('spotify', {
            failureRedirect: '/'
        }),
        function(req, res) {
            res.redirect('/')
        })

    router.get('/logout', module.exports.isAuthorized, function(req, res) {
        req.logout()
        res.redirect('/')
    })

    router.get('/user', function(req, res) {
        res.send(req.isAuthenticated() ? req.user : false)
    })
}

module.exports = {}
module.exports.routes = routes
module.exports.isAuthorized = function(req, res, next) {
    if (!req.isAuthenticated()) {
        res.send(401)
    } else {
        next()
    }
}
