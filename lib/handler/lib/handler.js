/*\
|*| Basis Handler Module
|*|
|*| Provides a nice place for middleware and helpers.
|*|
|*| Requires
\*/
var jlog = require('jlog');
var config = require('config');
var exports = module.exports;
/*\
|*| handle.error
|*|
|*| This function consumes a variety of error data and returns a predictable
|*| error object that can be used by an express json API. It also will manage
|*| logging the error and producing any stack trace info that is helpful.
\*/
exports.error = function (error) {
	var errMsg = '';
	var status = 500;
	var apiError = {};
	/*\
	|*| Handle 'natural' javascript errors
	\*/
	if (typeof error === 'string')
	{
		errMsg = error;
		jlog.error(errMsg);
	}
	else if (error instanceof Error)
	{
		errMsg = error.name+': '+error.message;
		jlog.stack(error);
	}
	/*\
	|*| Rejected promises may have a status and message
	\*/
	else if (typeof error == 'object' && error.hasOwnProperty('msg') && typeof error.msg !== 'undefined')
	{
		errMsg = error.msg;
		if (typeof error.status !== 'undefined')
		{
			status = error.status;
		}
		jlog.error(errMsg);
	}
	/*\
	|*| Some errors are just text
	\*/
	else
	{
		errMsg = 'Unknown error';
		jlog.error(errMsg);
		console.log(error);
	}
	apiError = {
		status: status,
		msg: errMsg
	};
	return apiError;
};
/*\
|*| handle.appErrors
\*/
exports.appErrors = function (err, req, res, next) {
	jlog.error('Application Error');
	jlog.error(err);
	if (req.baseUrl === "/" || req.baseUrl === "") {
		res.status(400).render('<html><head></head><body><h1>Error</h1><p>An error occured processing your request</p></body></html>', {});
	} else {
		res.status(400).json({error:"Bad Request"});
	}
};
/*\
|*| handle.auth
|*|
|*| This function manages user session validation. It is true express middleware
|*| and can be added to any route that accepts valid middleware
\*/
exports.auth = function (req, res, next) {
	if ((typeof req.session != 'undefined') &&
		(typeof req.session.valid != 'undefined') &&
		req.session.valid)
	{
		next();
	}
	else
	{
		jlog.warning('Invalid session, redirecting');
		res.redirect('/users/login');
	}
};
/*\
|*| handle.super
|*|
|*| This function makes sure that the current user is a super user
\*/
exports.super = function (req, res, next) {
	if ((typeof req.session != 'undefined') &&
		(typeof req.session.user != 'undefined') &&
		req.session.user.super === 1)
	{
		next();
	}
	else
	{
		jlog.warning('Unauthorized non-super user access: '+req.method+' '+req.baseUrl);
		res.redirect('/users/login');
	}
};
/*\
|*| handle.admin
|*|
|*| This function makes sure that the current user is an admin
\*/
exports.admin = function (req, res, next) {
	if ((typeof req.session != 'undefined') &&
		(typeof req.session.user != 'undefined') &&
		(req.session.user.super === 1 || req.session.user.admin === 1 ) )
	{
		next();
	}
	else
	{
		jlog.warning('Unauthorized non-admin user access: '+req.method+' '+req.baseUrl);
		res.redirect('/users/login');
	}
};
/*\
|*| handle.api
|*|
|*| This function checks for a valid API key in the headers and handles the API
|*| response for unauthorized requests
\*/
exports.api = function (req, res, next) {
	/*\
	|*| We want to support a couple of headers here for authorization in some
	|*| order of preference.
	|*| 1. Auth
	|*| 2. Authorization
	\*/
	var key = req.get('Auth');
	if (typeof key === 'undefined')
	{
		key = req.get('Authorization');
	}
	if (typeof key === 'undefined')
	{
		jlog.error('API key not found');
		res.status(401).json({api:true,auth:false});
	}
	else
	{
		if(typeof config.apiKeys === 'undefined')
		{
			jlog.error('No API keys configured');
			res.status(401).json({api:true,auth:false});
		}
		else
		{
			if(config.apiKeys.indexOf(key) >= 0)
			{
				/*\
				|*| Good
				\*/
				next();
			}
			else
			{
				/*\
				|*| Bad
				\*/
				jlog.error('Invalid api key: ['+key+']');
				res.status(400).json({api:true,auth:false});
			}
		}
	}
};
