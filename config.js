/*jslint node: true, nomen: true*/
'use strict';

var config = {};
config.client_id = process.env.SPOTIFY_CLIENT_ID;
config.client_secret = process.env.SPOTIFY_CLIENT_SECRET; // Your secret
config.refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;
config.db_url = process.env.DB_URL;
config.port = process.env.PORT || 3000;
config.app_url = process.env.APP_URL || 'http://localhost:' + config.port;
module.exports = config;
