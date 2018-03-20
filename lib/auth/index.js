/*\
|*| Basis Auth Module
\*/
var router = require('express').Router({ mergeParams: true });
var handle = require('../handler');
module.exports = router;
/*\
|*| Use and export the required moules
\*/
router.callbacks = require('./controllers/auth');
router.models = require('./models');
/*\
|*| User Module Routes
|*| Mounted under '/api/users/'
|*|
|*| GET
\*/
router.get('/', router.callbacks.users);
router.get('/user', router.callbacks.getUser);
router.get('/logout', router.callbacks.logout);
/*\
|*| POST
\*/
router.post('/validate', router.callbacks.validate);
router.post('/user/:uid', router.callbacks.updateUser);
router.post('/pw', router.callbacks.updatePassword);
router.post('/', router.callbacks.createUser);
/*\
|*| Default route
\*/
router.get('/*', router.callbacks.users);
