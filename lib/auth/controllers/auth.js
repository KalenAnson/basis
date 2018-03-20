/*\
|*| Basis Auth Module Controller
\*/
var jlog = require('jlog');
var auth = require('../models/auth');
var handle = require('../../handler');
var send = require('../models/email');
var config  = require('config');
var exports = module.exports;
/*\
|*| Get current user's information
\*/
exports.getUser = function(req, res) {
	jlog.event('GET: /user');
	var uid = req.session.user.id;
	auth.connectToDB(config.db)
	.then(function (msg) {
		jlog.debug(msg);
		return auth.getUser(uid);
	})
	.then(function(data) {
		var user = {
			user: data
		};
		return res.json(user);
	})
	.fail(function (err) {
		var error = handle.error(err);
		auth.disconnectFromDB();
		return res.status(503).json({err:"See logs"});
	})
};
/*\
|*| Logout current user from session
\*/
exports.logout = function (req, res) {
    jlog.event('GET: /logout');
    req.session.destroy();
    jlog.notice('Session ended');
	res.json({msg:'Logged out successfully'})
};
/*\
|*| User authentication for login events
\*/
exports.validate = function (req, res) {
    jlog.event('POST: /users/validate');
	var username, password;
	username = req.body.username;
	password = req.body.password;
	var creds = {
		username: username,
		password: password
	};
	/*\
	|*| Connect to db
	\*/
	auth.connectToDB(config.db)
	.then(function (msg) {
		jlog.debug(msg);
		return auth.authorize(creds);
	})
    /*\
    |*| Create the session
    \*/
    .then(function (data) {
        /*\
        |*| Check authoriziation
        \*/
        if(data.auth)
        {
            /*\
            |*| Save the user info in the session data
            \*/
            req.session.valid = true;
            req.session.user = data;
            req.session.save(function (err) {
                if (err)
                    throw new Error('Unable to save session data');
            });
			jlog.event(req.session);
            /*\
            |*| Now that the user is authenticated send to the following
            |*| route with a valid session started
            \*/
			return res.json({'user': 'validated'});
        }
        else
        {
            /*\
            |*| Unset any old session data
            \*/
            req.session.destroy();
			return res.json({'err': data.error});
        }
    })
    /*\
    |*| Handle Failure
    \*/
    .fail(function (err) {
		var error = handle.error(err);
        auth.disconnectFromDB();
        return res.status(err.status).json('Validate Error');
	});
};
/*\
|*| Get users
\*/
exports.users = function (req, res)
{
    jlog.event('GET: /users');
	var dbConfigFile = config.db;
    var user = req.session.user;
    /*\
    |*| Load the DB Config File
    \*/
    auth.loadDBConfig(dbConfigFile)
    .then(function (data) {
        return auth.connectToDB(data.db);
    })
    /*\
    |*| Get the access controlled list of users
    \*/
    .then(function (msg) {
        jlog.debug(msg);
        return auth.getUsers(user);
    })
    .then(function (data) {
		var userData = undefined;
        if (user.super || user.admin) {
            userData = {
				users: data.users
			};
        } else {
			userData = {
				users: data.users[0]
			};
        }
        return res.json(userData);
    })
    /*\
    |*| Handle Failure
    \*/
    .fail(function (err) {
        auth.disconnectFromDB();
        res.status(400).json({err:'API Error'});
    });
};
/*\
|*| API METHODS
|*|
|*| API Methods do not render templates, they should return JSON on success or
|*| on errors.
|*|
|*| Password update API
\*/
exports.updatePassword = function (req, res)
{
    jlog.event('POST: /users/pw');
	var uid, opw, npw;
    uid = parseInt(req.body.uid,10);
	opw = req.body.opw;
	npw = req.body.npw;
    /*\
    |*| Only allow a user to change their own passwords
    \*/
    if ((typeof uid === 'undefined' || uid <= 0) ||
        (uid !== req.session.user.id))
    {
		var error = {
			type: 'API Error',
			msg: 'Unauthorized'
		};
		return res.status(401).json(error);
    }
    var pwData = {
        uid: uid,
        opw: opw,
        npw: npw
    };
    auth.connectToDB(config.db)
    /*\
    |*| Get the access controlled list of users
    \*/
    .then(function (msg) {
        jlog.debug(msg);
        return auth.updatePassword(pwData);
    })
    /*\
    |*| Return the status
    \*/
    .then(function (data) {
        jlog.notice(data);
        res.status(data.status).send(JSON.stringify(data.msg));
    })
    /*\
    |*| Handle Failure
    \*/
    .fail(function (err) {
        var apiRes = handle.error(err);
		auth.disconnectFromDB();
		res.status(apiRes.status).json('API Error');
    });
};
/*\
|*| New user API
\*/
exports.createUser = function (req, res)
{
    jlog.event('POST: /users/new');
	var un, first, last, email, pw;
	un = req.body.un;
	pw = req.body.pw;
	first = req.body.first;
	last = req.body.last;
	email = req.body.email;
    var userData = {
        un: un,
        pw: pw,
        first: first,
        last: last,
        email: email
    };

	auth.connectToDB(config.db)
    /*\
    |*| Get the access controlled list of users
    \*/
    .then(function (msg) {
        jlog.debug(msg);
        return auth.createUser(userData);
    })
    /*\
    |*| Return the status
    \*/
    .then(function (data) {
        jlog.notice(data);
        var user = {
            uid: data.id,
            username: data.username,
            isSuper: data.is_super,
            isAdmin: data.is_admin,
            email: data.email
        };
        res.status(201).send(JSON.stringify(user));
    })
    /*\
    |*| Handle Failure
    \*/
    .fail(function (err) {
        var apiRes = handle.error(err);
		auth.disconnectFromDB();
		res.status(apiRes.status).json(apiRes.msg);
    });
};
/*\
|*| Update user API
\*/
exports.updateUser = function (req, res)
{
    var uid = parseInt(req.params.uid,10);
	console.log('UPDATE USER')
    jlog.event('POST: /users/'+uid);
	var dbConfigFile = config.db;
    var un, first, last, email;
    un = req.body.username;
    first = req.body.first;
    last = req.body.last;
    email = req.body.email;
    var userData = {
        uid: uid,
        un: un,
        email: email,
        first: first,
        last: last,
    };
	/*\
	|*| Connect to DB then
	\*/
	auth.connectToDB(config.db)
	.then(function (msg) {
		jlog.debug(msg);
		return auth.updateUser(userData);
	})
	/*\
	|*| Return new data back to client
	\*/
    .then(function (data) {
        jlog.notice(data);
        res.status(202).json(data);
    })
    /*\
    |*| Handle Failure
    \*/
    .catch(function (err) {
        var apiRes = handle.error(err);
		auth.disconnectFromDB();
		res.status(apiRes.status).json(apiRes.msg);
    });
};
