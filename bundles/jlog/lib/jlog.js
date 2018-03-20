/*\
|*| jlog
|*| JSON Console Logging Class
\*/
/*\
|*| Requires
\*/
var config = require('config');
var moment = require('moment');
var exports = module.exports;
exports.log = function (msg, level, color)
{
	/*\
	|*| Check log configuration level
	\*/
	if (config.logging.level < level)
		return;
	/*\
	|*| Build the log object
	\*/
	var log = {
		time: '',
		date: '',
		level: '',
		message: ''
	};
	/*\
	|*| Default to colored logs
	\*/
	if (typeof color == 'undefined') {
		color = 1;
	}
	var prefix = '';
	var suffix = '\033[0m';
	log.time = Date.now();
	log.date = moment(log.time).format('YYYY/MM/DD HH:mm:ss');
	switch (level) {
		case 1:
			prefix = '\033[1;37m';
			log.level = 'EVENT';
			break;
		case 2:
			prefix = '\033[1;31m';
			log.level = 'ERROR';
			break;
		case 3:
			prefix = '\033[1;33m';
			log.level = 'WARNING';
			break;
		case 4:
			prefix = '\033[1;34m';
			log.level = 'NOTICE';
			break;
		case 5:
			prefix = '\033[0;36m';
			log.level = 'DEBUG';
			break;
		default:
			prefix = '\033[1;37m';
			log.level = 'EVENT';
	}
	log.message = msg;
	var out = JSON.stringify(log);
	if (color) {
		out = prefix+out+suffix;
	}
	console.log(out);
};
/*\
|*| Convenience Debug Method
\*/
exports.debug = function (msg)
{
	exports.log(msg, 5, true);
};
/*\
|*| Convenience Notice Method
\*/
exports.notice = function (msg)
{
	exports.log(msg, 4, true);
};
/*\
|*| Convenience Warning Method
\*/
exports.warning = function (msg)
{
	exports.log(msg, 3, true);
};
/*\
|*| Convenience Error Method
\*/
exports.error = function (msg)
{
	exports.log(msg, 2, true);
};
/*\
|*| Convenience Event Method
\*/
exports.event = function (msg)
{
	exports.log(msg, 1, true);
};
/*\
|*| Natural JS Logging
\*/
exports.stack = function (error)
{
	/*\
	|*| Check log configuration level
	\*/
	if (config.logging.level < 2)
		return;
	/*\
	|*| If this is not a real Error object then bail
	\*/
	if ( !(error instanceof Error) )
		return;
	/*\
	|*| Create the Log Object
	\*/
	var log = {
		time: '',
		date: '',
		level: '',
		message: ''
	};
	var stack = error.stack;
	var prefix = '\033[1;31m';
	var suffix = '\033[0m';
	var eol = '\033[K';
	log.time = Date.now();
	log.date = moment(log.time).format('YYYY/MM/DD HH:mm:ss');
	log.message = error.name+': '+error.message;
	var out = prefix+JSON.stringify(log)+suffix;
	console.log(out);
	var stack = '\033[1;41m'+stack+eol+suffix;
	console.log(stack);
};
