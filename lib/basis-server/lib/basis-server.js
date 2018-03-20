/*\
|*| Basis Web Server Module
|*| Clustering from here: http://rowanmanning.com/posts/node-cluster-and-express/
\*/
var express = require('express');
var jlog    = require('jlog');
var cluster = require('cluster');
var config  = require('config');
var http    = require('http');
var session = require('express-session');
var sqlSess = require('express-mysql-session')(session);
var handle  = require('../../handler');
/*\
|*| The Exports
\*/
exports = module.exports;
/*\
|*| basis-server.connect
|*|
|*| The `connect` method on this module sets up the initial express middleware
|*| and wires up the static server for serving static assets.
|*| Returns the express app.
\*/
exports.connect = function(initapp) {
	/*\
	|*| The argument should be an initalized express application
	\*/
	var thisApplication = initapp || express();
	var root_dir = require('path').dirname(require.main.filename);
	thisApplication.set('views', root_dir+'/public/app');
	/*\
	|*| Initial Configurations
	\*/
	if (('NODE_SERVE_STATIC' in process.env) &&
		process.env['NODE_SERVE_STATIC'] == 1) {
		var pub_dir = config.server.pub_dir;
		/*\
		|*| Check for proper path variable formatting
		\*/
		if (pub_dir[0] != '/')
			pub_dir = '/'+pub_dir;
		pub_dir = root_dir+pub_dir;
		thisApplication.use(require('less-middleware')(pub_dir ) );
		thisApplication.use(require('serve-static')(pub_dir) );
	}
	/*\
	|*| Use longjohn if we are in development mode
	\*/
	if (process.env['NODE_ENV'] == "development") {
		jlog.debug("Loading longjohn");
		require('longjohn');
	}
	return thisApplication;
};
/*\
|*| basis-server.serve
|*|
|*| Begin the basis http server in single process mode or clustered
\*/
exports.serve = function(expressApp, callback) {
	/*\
	|*| Read the configuration file
	\*/
	var address = config.server.address;
	var port = config.server.port;
	/*\
	|*| The return
	\*/
	var app;
	/*\
	|*| Sanity check the incoming args
	\*/
	if (typeof callback !== 'undefined' && expressApp) {
		app = expressApp;
	} else if (typeof callback === 'undefined') {
		/*\
		|*| This code is kindof a wreck, lets put some troubleshooting code
		|*| here and just throw an error to see if this is even useful
		\*/
		jlog.error('Callback undefined');
		throw 'Invalid application state';
	} else {
		jlog.error('Callback defined and expressApp false');
		throw 'Invalid application state';
	}
	/*\
	|*| Clustering
	|*| Check if this is the first member of this cluster
	\*/
	var isClusterMaster = false;
	if (cluster.isMaster && (process.env.NODE_CLUSTERED == 1) ) {
		isClusterMaster = true;
	}
	/*\
	|*| Determine if this process should be an http process (child)
	|*| or if this is the parent process
	\*/
	var is_http_process = true;
	if (isClusterMaster ||
		(typeof process.env.NODE_ISNOT_HTTP_SERVER_THREAD !== 'undefined' &&
	    process.env.NODE_ISNOT_HTTP_SERVER_THREAD != 'true' ) ) {
		is_http_process = false;
	}
	/*\
	|*| Start the cluster if clustering is true and this is the parent
	\*/
	if (isClusterMaster) {
		jlog.debug("Parent Process, begining clustering");
		exports.startCluster(cluster);
	}
	/*\
	|*| If this is a child process, then start an additional http worker
	\*/
	if (is_http_process) {
		jlog.debug("Child Process, initalize as http server");
		/*\
		|*| http here is an instance of node server
		\*/
		http = http.createServer(app);
		http.listen(port, address);
		/*\
		|*| Handle EADDRINUSE errors here
		\*/
		http.on('error', function (err) {
			var error = handle.error(err);
			if (err.code == 'EADDRINUSE') {
				jlog.error('Address in use, worker exiting');
			} else {
				jlog.error('Unexpected error, worker exiting');
			}
			cluster.worker.kill();
		});
		/*\
		|*| Handle ECONNRESET client errors
		\*/
		http.on('clientError', function (err, socket) {
			var error = handle.error(err);
			if (err.code == 'ECONNRESET') {
				jlog.error('Client connection reset, closing connection');
				socket.destroy();
			} else {
				jlog.error('Unexpected error, worker exiting');
				socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
			}
		});
	}
	/*\
	|*| No Clustering
	\*/
	if (!isClusterMaster && cluster.isMaster) {
		jlog.debug("Single process http server mode");
		jlog.event("Basis server instance listening on "+address+":"+port);
	}
	/*\
	|*| Set the application defaults
	\*/
	exports.setAppDefaults(app);
	/*\
	|*| Expose the original http object, for socket.io support or other needs.
	\*/
	app.http = http;
	/*\
	|*| Initalize the routing
	\*/
	callback(app);
};
/*\
|*| Setting up sensible default configurations
|*| @param initapp optional. You can pass-in the app that should be configured.
\*/
exports.setAppDefaults = function(initapp) {
	var thisApp = initapp || express();
	var root_dir = require('path').dirname(require.main.filename);
	var bodyParser = require('body-parser');
	/*\
	|*| Parse application/x-www-form-urlencoded
	\*/
	thisApp.use(bodyParser.urlencoded({extended: true}) );
	/*\
	|*| Parse application/anything+json
	\*/
	thisApp.use(bodyParser.json({ type: 'application/*+json' }) );
	/*\
	|*| Parse application/json
	\*/
	thisApp.use(bodyParser.json({ type: 'application/json' }) );
	/*\
	|*| Parse text/plain
	\*/
	thisApp.use(bodyParser.text({ type: 'text/plain'}) );
	/*\
	|*| Parse anything else
	\*/
	thisApp.use(bodyParser.raw() );
	/*\
	|*| Session Management
	\*/
	var sessionStore = new sqlSess(config.session);
	thisApp.use(session({
		key: 'invoice',
		secret: config.session.secret,
		store: sessionStore,
		resave: true,
		saveUninitialized: false,
		cookie: {
			path: "/"
		}
	}) );
}
/*\
|*| basis-server.startCluster
|*|
|*| This method transforms the application into a clustered http server
\*/
exports.startCluster = function(master)
{
	/*\
	|*| Some pre-cluster checks
	\*/
	if (master.isMaster) {
		jlog.debug('Master process starting clustering');
	} else {
		jlog.error('Non master initiated clustering, exiting');
		process.exit(1);
	}
	/*\
	|*| Create a child process for each available CPU
	\*/
	var numCPUs = require('os').cpus().length;
	for (var i = 0; i < numCPUs; i++) {
		cluster.fork();
	}
	/*\
	|*| Wire event handlers and manage stalled process forks with the timeout
	|*| watch dog setTimeout handler
	\*/
	var timeouts = [];
	/*\
	|*| Start the watch dog on `fork` and set the wd to 2 secs
	\*/
	cluster.on('fork', function forkingWorker(worker) {
		jlog.debug('Forking worker #'+worker.id);
		timeouts[worker.id] = setTimeout(function workerTimingOut() {
			jlog.error(['Worker #'+worker.id+' taking too long to start']);
		}, 2000);
	});
	/*\
	|*| Clear the watch dog when a child process is listening
	\*/
	cluster.on('listening', function onClusterListening(worker, address) {
		jlog.debug('Worker #'+worker.id+' listening: '+address.address+':'+address.port);
		clearTimeout(timeouts[worker.id]);
	});
	/*\
	|*| Log the new http worker
	\*/
	cluster.on('online', function onClusterOnline(worker) {
		jlog.debug('Worker #'+worker.id+' is online');
	});
	/*\
	|*| Clear the watch dog on exit just in case the worker has not come on line
	\*/
	cluster.on('exit', function onClusterExit(worker, code, signal) {
		var wid = worker.id;
		jlog.notice('Worker #'+worker.id+' exit code '+code);
		clearTimeout(timeouts[worker.id]);
		/*\
		|*| If a worker exited after disconnect do not respawn.
		|*| NOTE: Node V6+ changed the way we tell if a process voluntarily
		|*| exited. For now, to maintain a broder support for node versions lets
		|*| check for the `worker.exitedAfterDisconnect` vs `worker.suicide`
		|*| functionality
		\*/
		if (worker.hasOwnProperty('exitedAfterDisconnect') ) {
			if (worker.exitedAfterDisconnect !== true) {
				jlog.warning('Worker #'+wid+' did not exit gracefully, restarting');
				cluster.fork();
			}
		} else {
			//jlog.debug('Worker #'+wid+' Suicide: '+worker.suicide);
			if (worker.suicide !== true) {
				jlog.warning('Worker #'+wid+' did not exit gracefully, restarting');
				cluster.fork();
			}
		}
		if (worker.isDead() ) {
			jlog.event('Worker: '+wid+' is dead');
		} else {
			jlog.event('Killing worker: '+wid);
			worker.kill();
		}
		/*\
		|*| Check the worker count to see if all have disconnected
		\*/
		var workerCount = 0;
		for (var property in cluster.workers) {
			if (cluster.workers.hasOwnProperty(property) ) {
				workerCount++;
			}
		}
		if (workerCount === 0) {
			jlog.event('All workers disconnected, exiting');
			process.exit(0);
		} else {
			jlog.debug('Active workers: '+workerCount);
		}
	});
	/*\
	|*| Log a worker disconnect
	\*/
	cluster.on('disconnect', function onClusterDisconnect(worker) {
		jlog.event('Worker #'+worker.id+' has disconnected');
	});
	/*\
	|*| If we are in development mode use the following to stop the server
	\*/
	if (process.env.NODE_HOT_RELOAD == 1) {
		var signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
		signals.forEach(function forEachQuitSignal(signal, index, array){
			process.on(signal, function onQuitSignals(){
				if (typeof cluster.workers !== 'undefined') {
					for (var property in cluster.workers) {
						if (cluster.workers.hasOwnProperty(property) ) {
							jlog.debug('Killing worker: '+cluster.workers[property].id);
							cluster.workers[property].kill();
						}
					}
				} else {
					jlog.warning('Unable to find cluster workers');
				}
			});
		});
	}
};
