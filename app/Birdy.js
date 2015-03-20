'use strict';

var d = require('dejavu'),
	utils = require('mout'),
	fs = require('fs'),
	router = require('./router');

var Birdy = d.Class.declare({
	$name: 'Birdy',

	_router: null,
	_servicesDir: __dirname + '/services/',
	_services: [],

	initialize: function(app) {
		this._bootServices();

		this._router = new router(app, this._services);
	},

	_bootServices: function() {
		var services = fs.readdirSync(this._servicesDir),
			service,
			serviceName;

		for (service in services) {
			serviceName = services[service].split('.', 1)[0];

			if(!serviceName) continue;

			// Load the service
			this._loadService(serviceName.toLowerCase(), this._servicesDir + serviceName)
		}
	},

	_loadService: function(name, path) {
		var Service = require(path);

		this._services[name.replace('service', '')] = new Service();
	}
});

module.exports = Birdy;
