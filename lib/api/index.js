/*\
|*| Basis API Module
\*/
var router = require('express').Router({ mergeParams: true });
var session = require('express-session');
var handle = require('../handler');
module.exports = router;
/*\
|*| Use and export the required moules
\*/
router.callbacks = require('./controllers/api');
/*\
|*| Bundle Module Routes
|*|
|*| GET
\*/
router.get('/', handle.api, router.callbacks.apiTest);
/*\
|*| Default Route
\*/
router.get('/*', handle.api, router.callbacks.apiTest);
