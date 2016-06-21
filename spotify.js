/* jslint node: true, nomen: true*/
'use strict'
var Promise = require('promise')
var config = require('./config')
var SpotifyWebApi = require('spotify-web-api-node')

module.exports = {}

function newApi(refreshToken) {
    var api = new SpotifyWebApi({
        clientId: config.client_id,
        clientSecret: config.client_secret,
        redirectUri: config.app_url + '/callback',
        refreshToken: refreshToken
    })
    api.refresh = function() {
        return new Promise(function(resolve, reject) {
            api.refreshAccessToken().then(function(data) {
                api.setAccessToken(data.body.access_token)
                resolve()
            }, function(err) {
                console.log('Could not refresh access token', err)
                reject()
            })
        })
    }

    function loadPart(fn, args, page, loaded) {
        return api[fn].apply(api, args).then(function(response) {
            loaded = loaded.concat(response.body.items)
            if (response.body.next !== null) {
                page.offset += page.limit
                console.log('page ', page.offset, '/', response.body.total)
                return loadPart(fn, args, page, loaded)
            } else {
                return loaded
            }
        })
    }

    api.all = function(fn, args, limit) {
        var page = {
            offset: 0,
            limit: limit || 50
        }
        args.push(page)
        return loadPart(fn, args, page, []).then(function(loaded) {
            return loaded
        })
    }
    api.filter = function(fn, args, predicate, limit) {
        return api.all(fn, args, limit).then(function(found) {
            return found.filter(predicate)
        })
    }
    return api
};

module.exports.newApi = newApi
module.exports.userApi = function(user) {
    return newApi(user.refreshToken)
}
module.exports.rootApi = newApi(config.refresh_token)
