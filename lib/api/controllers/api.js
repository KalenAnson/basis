/*\
|*| Basis API Module Controller
\*/
var exports = module.exports;
var jlog = require('jlog');
/*\
|*| Main Route: used for API testing
\*/
exports.apiTest = function (req, res) {
	jlog.event('GET: /api');
	return res.json({api: true, auth: true});
};
