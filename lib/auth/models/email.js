/*\
|*| Basis Auth Model
\*/
var Q = require('q');
var jlog = require('jlog');
var nodemailer = require('nodemailer');
var handle = require('../../handler');
var config = require('config');
/*\
|*| The node emailer class
\*/
function Email() {}
/*\
|*| Create and send a password reset email
\*/
Email.prototype.resetEmail = function (data) {
	return Q.Promise(function (resolve, reject, notify) {
		/*\
		|*| Create the transport
		\*/
		var text, html = '';
		var options = config.email;
		var resetUrl = 'http://'+data.resetLink+'/'+data.token;
		var transporter = nodemailer.createTransport(options);
		/*\
		|*| Message Text
		\*/
		text += 'System Message\n\n';
		text += 'An administrator has requested a password reset for your account. Please contact your System Administrator if you have any questions or concerns.\n\n';
		text += 'To reset your password, please visit the following link in the next 7 days:\n\n';
		text += resetUrl;
		text += '\n\n'
		text += 'Please do not respond to this email as the email address is unmonitored.';
		text += '\n\nEnd of message.';
		/*\
		|*| Message HTML
		\*/
		html += '<body style="max-width:100%;overflow:hidden;margin:10px 0 10px 0;padding:0;font-family:"Arial", Arial, san-serif;">';
		html += '<div style="display: block;margin: 0 auto;width:92%;padding:10px;color:#FFFFFF;background-color:#4b93cb;">';
		html += '<h1>System Message</h1>';
		html += '</div><div style="display: block;margin: 0 auto;width:92%;padding:10px;color:#565656;background-color:#ececec;">';
		html += '<p><span style="color:#ec4642;"><strong>Message: </strong></span>An administrator has requested a password reset for your account. Please contact your System Administrator if you have any questions or concerns.</p>';
		html += '<p>To reset your password, please visit the following link in the next 7 days: </p>';
		html += '<p><a href="resetUrl">'+resetUrl+'</a></p>';
		html += '<p>Please do not respond to this email as the email address is unmonitored.</p>';
		html += '<p>End of message.</p></div>';
		html += '<div style="display: block;margin: 0 auto;width:92%;padding:10px;color:#ececec;background-color:#565656;">';
		html += '</div></body>';
		var mailOptions = {
			from: '"Administrator" <Administrator@example.com>',
			to: data.email,
			subject: 'Password Reset Requested',
			text: text,
			html: html
		};
		transporter.sendMail(mailOptions, function(error, info){
			if (error)
				return reject(error);
			jlog.notice(info);
			return resolve(data);
		});
	});
};
module.exports = new Email();
