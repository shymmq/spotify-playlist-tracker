/*jslint node: true, nomen: true*/
'use strict';

var config = {};
config.client_id = process.env.SPOTIFY_CLIENT_ID;
config.client_secret = process.env.SPOTIFY_CLIENT_SECRET; // Your secret
config.refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;
config.db_url = process.env.DB_URL;
module.exports = config;
