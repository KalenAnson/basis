/*\
|*| Basis API & Bundle Server
|*|
|*| Set up the node application modlue paths
|*| https://gist.github.com/branneman/8048520
\*/
require('app-module-path').addPath(__dirname + '/lib');
/*\
|*| Requires
\*/
var server = require('basis-server');
var router = require('router');
var express = require('express')();
/*\
|*| Set the HTML Server Options
\*/
var basis = server.connect(express);
/*\
|*| Cluster and wire up the router
\*/
server.serve(basis, router.setup);
