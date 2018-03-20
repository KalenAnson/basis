/*\
|*| Basis Router Module
|*|
|*| Requires
\*/
require('app-module-path').addPath(__dirname + '/lib');
var config  = require('config');
var hbs = require('hbs');
var engine = require('consolidate');
var moment = require('moment');
var exports = module.exports;
/*\
|*| router.setup
|*|
|*| Sets some basic application defualts and then calls the router.wire method
|*| which is responsible for further mode specific routing
\*/
exports.setup = function (runningApp, callback) {
	/*\
	|*| Disable the powered-by header
	\*/
	runningApp.disable('x-powered-by');
	/*\
	|*| View engine
	\*/
	runningApp.set('view engine', 'handlebars');
	runningApp.set('view engine', 'html');
	runningApp.engine('html', require('hbs').__express);
	//runningApp.engine('handlebars', require('hbs').__express);
	/*\
	|*| Setup our handlebars configuration
	\*/
	exports.bars();
	/*\
	|*| Wire up the application routes as described in the main
	|*| config.modules section
	\*/
	exports.wire(runningApp);
	/*\
	|*| Call the route
	\*/
	if (typeof callback === 'function') {
		/*\
		|*| Fire the callback and pass in the context
		\*/
		callback(runningApp);
	}
};
/*\
|*| router.wire
|*|
|*| Enable or exclude additional application routes based on
|*| the current configuration
\*/
exports.wire = function (runningApp) {
	/*\
	|*| Authentication
	\*/
	if (config.modules.auth) {
		runningApp.use('/api/users', require('auth'));
	}
	/*\
	|*| @TODO Add loaders for new routes here
	\*/
	/*\
	|*| Basis Default route
	\*/
	runningApp.use('/', require(config.modules.default));
};
/*\
|*| Handlebars Config
\*/
exports.bars = function () {
	/*\
	|*| Handlebars Partials
	\*/
	/*\
	|*| Handlebars Helpers
	|*|
	|*| Increment Function Helper
	\*/
	hbs.registerHelper('json', function (value) {
	    return JSON.stringify(value, null, 4);
	});
	/*\
	|*| Robust If
	\*/
	hbs.registerHelper('ifCond', function (v1, operator, v2, options) {

	    switch (operator) {
	        case '==':
	            return (v1 == v2) ? options.fn(this) : options.inverse(this);
	        case '===':
	            return (v1 === v2) ? options.fn(this) : options.inverse(this);
	        case '<':
	            return (v1 < v2) ? options.fn(this) : options.inverse(this);
	        case '<=':
	            return (v1 <= v2) ? options.fn(this) : options.inverse(this);
	        case '>':
	            return (v1 > v2) ? options.fn(this) : options.inverse(this);
	        case '>=':
	            return (v1 >= v2) ? options.fn(this) : options.inverse(this);
	        case '&&':
	            return (v1 && v2) ? options.fn(this) : options.inverse(this);
	        case '||':
	            return (v1 || v2) ? options.fn(this) : options.inverse(this);
			case '<>':
	            return (v1 != v2) ? options.fn(this) : options.inverse(this);
	        default:
	            return options.inverse(this);
	    }
	});
	/*\
	|*| Count Helper
	\*/
	hbs.registerHelper('count', function (obj) {
		return obj.length;
	});
	/*\
	|*| Count Helper
	\*/
	hbs.registerHelper('plus', function (obj) {
		return obj.length + 1;
	});
	/*\
	|*| Lookup helper
	\*/
	hbs.registerHelper('refName', function (data, id) {
		var thisName = '';
		data.forEach(function (el, index, array) {
			if (el.id === id)
			{
				thisName = el.name+'.';
			}
		});
		return thisName;
	});
	/*\
	|*| Time helper
	\*/
	hbs.registerHelper('time', function (ts) {
		return moment.unix(ts).format('MMMM DD YYYY, h:mm:ss a');
	});
	/*\
	|*| UC First Helper
	\*/
	hbs.registerHelper('ucfirst', function (str) {
		return str && str[0].toUpperCase() + str.slice(1);
	});
	/*\
	|*| Logging Helper
	\*/
	hbs.registerHelper('json', function (obj) {
		return JSON.stringify(obj, null, 4);
	});
	/*\
	|*| Array helper
	\*/
	hbs.registerHelper('ifIn', function (ele, list, options) {
		if (list.indexOf(ele) > -1)
		{
			return options.fn(this);
		}
 		return options.inverse(this);
	});
};
