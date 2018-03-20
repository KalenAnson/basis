/*\
|*| Basis Bundle Module Controller
\*/
var exports = module.exports;
var jlog = require('jlog');
/*\
|*| Main Route: return HTML with bundled file
\*/
exports.app = function (req, res) {
	jlog.event('GET: /app');
	var template = 'index2.html';
	/*\
	|*| If the user is logged in, return the main bundle
	\*/
	if (req.session.user) {
		template = 'index.html';
	}
	res.set('Content-Type', 'text/html');
	return res.render(template, {});
};
