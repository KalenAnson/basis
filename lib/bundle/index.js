/*\
|*| Basis Bundle Module
\*/
var router = require('express').Router({ mergeParams: true });
var session = require('express-session');
var handle = require('../handler');
module.exports = router;
/*\
|*| Use and export the required moules
\*/
router.callbacks = require('./controllers/bundle');
/*\
|*| Bundle Module Routes
|*|
|*| GET
\*/
router.get('/', router.callbacks.app);
/*\
|*| Default Route
\*/
router.get('/*', router.callbacks.app);
