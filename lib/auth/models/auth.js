/*\
|*| Basis Auth Model
\*/
var Q = require('q');
var mysql = require('mysql');
var jlog = require('jlog');
var bcrypt = require('bcrypt');
var handle = require('../../handler');
var db = undefined;
var configCache = undefined;
/*\
|*| The Main Config Class
\*/
function Auth() {}
/*\
|*| Connect to data source
\*/
Auth.prototype.connectToDB = function (info) {
	var deferred = Q.defer();
	if (typeof db === 'undefined') {
		db = mysql.createConnection({
			host: info.host,
			port: info.port,
			user: info.user,
			password: info.pw,
			database: info.db
		});
		Q.ninvoke(db, 'connect')
		.then(function () {
			deferred.resolve('Connected to ['+info.host+']');
		})
		.fail(function (err) {
			var error = handle.error(err);
			db = undefined;
			deferred.reject('Unable to connect to database');
		});
	}
	else if (typeof db.connect === 'function')
	{
		deferred.resolve('Already Connected to ['+info.host+']');
	}
	else
	{
		deferred.reject('Strange Errors');
	}
	return deferred.promise;
};
/*\
|*| Disconnect to data source
\*/
Auth.prototype.disconnectFromDB = function () {
    jlog.notice('Disconnecting from DB');
	db = undefined;
	configCache = undefined;
};
/*\
|*| Authorization attempt
\*/
Auth.prototype.authorize = function (creds) {
	return Q.Promise(function (resolve, reject, notify) {
        var query, variables, format, record;
        const saltRounds = 10;
        var errMsg = 'Invalid username or password';
        var un = creds.username;
		var pw = creds.password;
		var user;
		/*\
		|*| Sanity check the username
		\*/
		if (typeof un === 'undefined' || un === '')
		{
			jlog.error('Invalid username');
			return reject({status: 500,msg: errMsg});
		}
		/*\
		|*| Get the user's record
		\*/
		format  = "SELECT";
		format += " u.`id` AS 'id',";
		format += " u.`username` AS 'username',";
		format += " u.`password` AS 'password',";
		format += " u.`is_super` AS 'is_super',";
		format += " u.`is_admin` AS 'is_admin'";
		format += " FROM `users` AS u";
		format += " WHERE `username` = ?";
		variables = [un];
		query = db.format(format, variables);
		Q.ninvoke(db, 'query', query)
		.then(function (row) {
			if (row[0].length === 1)
			{
				/*\
				|*| Record obtained
				\*/
				record = row[0][0];
				user = {
					id: record.id,
					name: record.username,
					super: record.is_super,
					admin: record.is_admin,
					auth: false // Set this to true if the pw matches
				};
				/*\
				|*| Compare the passwords
				\*/
				return Q.ninvoke(bcrypt, 'compare', pw, record.password);
			}
			else
			{
				jlog.warning('Unable to find user ['+un+']')
				throw new Error(errMsg);
			}
		})
		/*\
		|*| Check the old password validation and then generate the salt
		\*/
		.then(function (validated) {
			if (validated === false)
			{
				jlog.notice('Invalid password');
				return resolve({auth:false,error:errMsg});
			}
			else
			{
				user.auth = true;
				return resolve(user);
			}
		})
    	.fail(function (err) {
			var error = handle.error(err);
            jlog.error(error);
			/*\
			|*| Resolve all errors here with at dummy message
			\*/
			return resolve({auth:false, error:errMsg});
    	});
    });
};
/*\
|*| Get locate user's email and generate email token if found
\*/
// Auth.prototype.locate = function (data) {
//     return Q.Promise(function (resolve, reject, notify) {
// 		var errMsg = 'Email not found';
// 	    var query, variables, format;
// 		var token, expires, email, uid;
// 	    /*\
// 	    |*| Only let the user see their access level or lower
// 	    \*/
// 	    if (typeof data === 'undefined' || data === '')
// 	    {
// 	        return reject('Invalid email');
// 	    }
// 	    else
// 	    {
// 			email = data;
// 	        format = 'SELECT * FROM  `users` WHERE `email` = ?';
// 	        variables = [email];
// 	        query = db.format(format, variables);
// 	    }
// 		Q.ninvoke(db, 'query', query)
// 		.then(function (row) {
// 			if (row[0].length === 1)
// 			{
// 				/*\
// 				|*| Record obtained
// 				\*/
// 				uid = row[0][0].id;
// 				/*\
// 				|*| Create a new token
// 				\*/
// 				token = Math.random().toString(36).substr(2);
// 				/*\
// 				|*| Token expires in seven days
// 				\*/
// 				expires = Math.round(new Date().getTime()/1000) + 604800;
// 				format = 'UPDATE `users` SET `token` = ?,`token_expires` = ? WHERE `id` = ?';
// 		        variables = [token,expires,uid];
// 		        query = db.format(format, variables);
// 				return Q.ninvoke(db, 'query', query);
// 			}
// 			else
// 			{
// 				jlog.notice('Unable to find user email')
// 				throw new Error(errMsg);
// 			}
// 		})
// 		.then(function (result) {
// 			var rows = result[0].affectedRows;
// 			if (rows === 1)
// 			{
// 				jlog.event('Reset token saved')
// 				return resolve({uid: uid,email: email,token, token});
// 			}
// 			else
// 			{
// 				jlog.error('Unable to create reset token');
// 				throw new Error(errMsg);
// 			}
// 		})
// 		.fail(function (err) {
// 			var error = handle.error(err);
//             jlog.error(error);
// 			return reject(error);
// 		});
//     });
// };
/*\
|*| Validate a password reset token
\*/
// Auth.prototype.checkToken = function (token) {
// 	return Q.Promise(function (resolve, reject, notify) {
// 		var errMsg = 'Token expired or not found';
// 	    var query, variables, format, result;
// 		var now = Math.round(new Date().getTime()/1000);
// 	    /*\
// 	    |*| Only let the user see their access level or lower
// 	    \*/
// 	    if (typeof token === 'undefined' || token === '')
// 	    {
// 	        return reject('Invalid token');
// 	    }
// 	    else
// 	    {
// 	        format = 'SELECT * FROM  `users` WHERE `token` = ?';
// 	        variables = [token];
// 	        query = db.format(format, variables);
// 	    }
// 		Q.ninvoke(db, 'query', query)
// 		.then(function (row) {
// 			if (row[0].length === 1)
// 			{
// 				/*\
// 				|*| Record obtained
// 				\*/
// 				result = row[0][0];
// 				/*\
// 				|*| Check the expiration date
// 				\*/
// 				if (now <= result.token_expires)
// 				{
// 					return resolve({valid: true,name: result.username});
// 				}
// 				else
// 				{
// 					jlog.error('Token expired');
// 					throw new Error(errMsg);
// 				}
// 			}
// 			else
// 			{
// 				jlog.notice('Unable to find user email');
// 				throw new Error(errMsg);
// 			}
// 		})
// 		.fail(function (err) {
// 			var error = handle.error(err);
//             jlog.error(error);
// 			return resolve({valid: false,name: ''});
// 		});
//     });
// };
/*\
|*| Reset user password
|*|
|*| For security reasons, all rejected promises from this method and other
|*| authentication methods should return the same error text, unless the
|*| alternate text is safe against unauthorized api access and is necessary.
\*/
// Auth.prototype.updateUserPassword = function (data) {
//     return Q.Promise(function (resolve, reject, notify) {
//         var query, variables, format, record;
//         const saltRounds = 10;
//         var errMsg = 'Invalid username or password';
//         var un = data.username;
//         var npw = data.npw;
//         var npw2 = data.pwc;
//         /*\
//         |*| Validate the the two new passwords match
//         \*/
//         if (npw !== npw2)
//         {
//             jlog.error('Passwords do not match');
//             return reject({status: 500,msg: errMsg});
//         }
//         else
//         {
//             /*\
//             |*| Get the user's record
//             \*/
//             format = 'SELECT * FROM  `users` WHERE `username` = ?';
//             variables = [un];
//             query = db.format(format, variables);
//             Q.ninvoke(db, 'query', query)
//             .then(function (row) {
//                 if (row[0].length === 1)
//                 {
//                     /*\
//                     |*| Record obtained
//                     \*/
//                     record = row[0][0];
//                     /*\
//                     |*| Generate salt
//                     \*/
//                     return Q.ninvoke(bcrypt, 'genSalt', saltRounds);
//                 }
//                 else
//                 {
//                     jlog.debug('Unable to find username ['+un+']')
//                     throw new Error(errMsg);
//                 }
//             })
//             /*\
//             |*| Check the salt then hash the new password
//             \*/
//             .then(function (salt) {
//                 return Q.ninvoke(bcrypt, 'hash', npw, salt);
//             })
//             /*\
//             |*| Store the new password
//             \*/
//             .then(function (hash) {
//                 format = 'UPDATE `users` SET `password` = ? WHERE `id` = ?';
//                 variables = [hash, record.id];
//                 query = db.format(format, variables);
//                 return Q.ninvoke(db, 'query', query);
//             })
//             /*\
//             |*| Return a status message
//             \*/
//             .then(function (result) {
//                 var rows = result[0].affectedRows;
//                 if (rows === 1)
//                 {
// 					var user = {
// 						id: record.id,
// 						name: record.username,
// 						super: record.is_super,
// 						admin: record.is_admin,
// 						auth: true
// 					};
//                     jlog.event('Updated password for user: ['+un+']')
//                     return resolve({valid: true,user: user});
//                 }
//                 else
//                 {
//                     jlog.error('Unable to update user password');
//                     jlog.notice(result);
//                     throw new Error(errMsg);
//                 }
//         	})
//         	.fail(function (err) {
// 				var error = handle.error(err);
//                 jlog.error('Error encountered');
//         	    return resolve({valid: false});
//         	});
//         }
//     });
// };
/*\
|*| Get access controled user list
|*|
\*/
// Auth.prototype.getUsers = function (data) {
//     var deferred = Q.defer();
//     var query, variables, format;
//     /*\
//     |*| Only let the user see their access level or lower
//     \*/
//     if (data.super)
//     {
//         jlog.debug('Super');
//         query = 'SELECT `id`,`username`,`is_super`,`is_admin`,`email`,`token`,`token_expires` FROM `users`';
//     }
//     else if (data.admin)
//     {
//         jlog.debug('Admin');
//         query = 'SELECT `id`,`username`,`is_admin`,`email`,`token`,`token_expires` FROM `users` WHERE `is_super` <> 1';
//     }
//     else
//     {
//         jlog.debug('User');
//         format = 'SELECT `id`,`username`,`email` FROM `users` WHERE `id` = ?';
//         variables = [data.id];
//         query = db.format(format, variables);
//     }
// 	Q.ninvoke(db, 'query', query)
// 	.then(function (rows) {
//         var records = {
//             level: 3,
//             users: rows[0]
//         };
// 		deferred.resolve(records);
// 	})
// 	.fail(function (err) {
// 		var error = handle.error(err);
// 		deferred.reject(error);
// 	});
//     return deferred.promise;
// };
/*\
|*| Update password
|*|
|*| For security reasons, all rejected promises from this method and other
|*| authentication methods should return the same error text, unless the
|*| alternate text is safe against unauthorized api access and is necessary.
\*/
Auth.prototype.updatePassword = function (data) {
    return Q.Promise(function (resolve, reject, notify) {
        var query, variables, format, record;
        const saltRounds = 10;
        var errMsg = 'Invalid username or password';
        var uid = data.uid;
        var opw = data.opw;
        var npw = data.npw;
        /*\
        |*| Validate the the two new passwords match
        \*/
        // if (npw !== npw2)
        // {
        //     jlog.error('Passwords do not match');
        //     return reject({status: 500,msg: errMsg});
        // }
		if (typeof npw === 'undefined' || npw === '')
	    {
		    jlog.error('Invalid password');
		    return reject({status: 500,msg: errMsg});
	    }	else if (typeof opw === 'undefined' || opw === '')
	    {
		    jlog.error('Invalid password');
		    return reject({status: 500,msg: errMsg});
	    }	else
	    {
		   /*\
		   |*| Get the user's record
		   \*/
		   format = 'SELECT * FROM `users` WHERE `id` = ?';
		   variables = [uid];
		   query = db.format(format, variables);
		   Q.ninvoke(db, 'query', query)
		   .then(function (row) {
			   if (row[0].length === 1)
			   {
				   /*\
				   |*| Record obtained
				   \*/
				   record = row[0][0];
				   /*\
				   |*| First check if the old password is the same
				   \*/
				   return Q.ninvoke(bcrypt, 'compare', opw, record.password);
			   }
			   else
			   {
				   jlog.debug('Unable to find user id ['+uid+']')
				   throw new Error(errMsg);
			   }
		   })
		   /*\
		   |*| Check the old password validation and then generate the salt
		   \*/
		   .then(function (validated) {
			   if (validated === false)
			   {
				   jlog.error('Invalid old password');
				   throw new Error(errMsg);
			   }
			   else
			   {
				   return Q.ninvoke(bcrypt, 'genSalt', saltRounds);
			   }
		   })
		   /*\
		   |*| Check the salt then hash the new password
		   \*/
		   .then(function (salt) {
			   return Q.ninvoke(bcrypt, 'hash', npw, salt);
		   })
		   /*\
		   |*| Store the new password
		   \*/
		   .then(function (hash) {
			   format = 'UPDATE `users` SET `password` = ? WHERE `id` = ?';
			   variables = [hash, uid];
			   query = db.format(format, variables);
			   return Q.ninvoke(db, 'query', query);
		   })
		   /*\
		   |*| Return a status message
		   \*/
		   .then(function (result) {
			   var rows = result[0].affectedRows;
			   if (rows === 1)
			   {
				   jlog.event('Updated password for user: ['+uid+']')
				   resolve({status: 201,msg: "Password updated successfuly"});
			   }
			   else
			   {
				   jlog.error('Unable to update user password');
				   jlog.notice(result);
				   throw new Error(errMsg);
			   }
		   })
		   .fail(function (err) {
			   jlog.error('Error encountered');
			   reject(err);
		   });
	    }
    });
};
/*\
|*| Create user
\*/
Auth.prototype.createUser = function (data) {
    return Q.Promise(function (resolve, reject, notify) {
		jlog.debug(data);
        var query, variables, format, record;
        const saltRounds = 10;
        var errMsg = 'Unable to add new user';
        var un = data.un;
        var pw = data.pw;
        var email = data.email;
		var first = data.first;
		var last = data.last;
        /*\
        |*| Validate that the two new passwords match
        \*/
        // if (npw !== npw2)
        // {
        //     jlog.error('Passwords do not match');
        //     return reject({status: 500,msg: errMsg});
        // }
		/*\
		|*| Sanity check the username
		\*/
		if (typeof un === 'undefined' || un === '')
		{
			jlog.error('Invalid username');
			return reject({status: 500,msg: errMsg});
		}
		/*\
		|*| Normalize the bool values
		\*/
		// if (thisUser.super === 1 && isSuper === 'true')
		// {
		// 	isSuper = 1;
		// }
		// else
		// {
		// 	isSuper = 0;
		// }
		// if ( (thisUser.super === 1 || thisUser.admin === 1) && isAdmin === 'true')
		// {
		// 	isAdmin = 1;
		// }
		// else
		// {
		// 	isAdmin = 0;
		// }
		/*\
		|*| Check for duplicate user names
		\*/
        format = "SELECT * FROM  `users` WHERE `username` LIKE ?";
        variables = [un];
        query = db.format(format, variables);
        Q.ninvoke(db, 'query', query)
        .then(function (row) {
            if (row[0].length >= 1)
            {
                /*\
                |*| Duplicate name
                \*/
				throw new Error('Duplicate username detected');
            }
			/*\
			|*| Create the salt
			\*/
            return Q.ninvoke(bcrypt, 'genSalt', saltRounds);
        })
        /*\
        |*| Check the salt then hash the new password
        \*/
        .then(function (salt) {
            return Q.ninvoke(bcrypt, 'hash', pw, salt);
        })
        /*\
        |*| Store the new password
        \*/
        .then(function (hash) {
            format = "INSERT INTO `users` (`username`,`password`,`is_super`,`is_admin`,`email`, `first_name`, `last_name`) VALUES (?,?,?,?,?,?,?)";
            variables = [un,hash,0,1,email, first, last];
            query = db.format(format, variables);
            return Q.ninvoke(db, 'query', query);
        })
        /*\
        |*| Return a status message
        \*/
        .then(function (result) {
            var rows = result[0].affectedRows;
            if (rows === 1)
            {
                jlog.event('User created successfully')
				format = "SELECT `id`, `username`, `is_super`, `is_admin`, `email` FROM `users` WHERE `username` LIKE ?";
				variables = [un];
				query = db.format(format,variables);
				return Q.ninvoke(db, 'query', query);
            }
            else
            {
                jlog.error('Unable to update user password');
                throw new Error(errMsg);
            }
    	})
		/*\
		|*| Get the new user info
		\*/
		.then(function (row) {
			if (row[0].length === 1)
			{
				/*\
				|*| Record obtained
				\*/
				record = row[0][0];
				jlog.notice('New user added and verified');
				return resolve(record);
			}
			else
			{
				jlog.error('Unable to retrieve new user\'s information');
                throw new Error(errMsg);
			}
		})
    	.fail(function (err) {
            jlog.error('Error encountered');
    	    reject(err);
    	});
    });
};
/*\
|*| Update user
\*/
Auth.prototype.updateUser = function (data) {
	return Q.Promise(function (resolve, reject, notify) {
		jlog.debug(data);
        var query, variables, format, record;
        var errMsg = 'Unable to update user';
		var uid = parseInt(data.uid, 10);
        var un = data.un;
		var email = data.email;
		var first = data.first;
		var last = data.last;
		/*\
		|*| Sanity
		\*/
		if (typeof uid === 'undefined' || uid <= 0 || uid === 'undefined')
			return reject('Invalid user id');
		if (typeof un === 'undefined' || un === '')
			return reject('Invalid username');
		/*\
		|*| Prevent simple users from updating any other profile than their own
		\*/
		// if (thisUser.super === 0 && thisUser.admin === 0)
		// {
		// 	if (thisUser.id !== uid)
		// 		return reject('Invalid update attempt by non-priviledged user');
		// }
		/*\
		|*| Prevent non supers from updating or creating supers by
		|*| hijacking the API
		|*|
		|*| Normalize the bool values
		\*/
		// if (thisUser.super === 1 && isSuper === 'true')
		// {
		// 	isSuper = 1;
		// }
		// else
		// {
		// 	isSuper = 0;
		// }
		// if ( (thisUser.super === 1 || thisUser.admin === 1) && isAdmin === 'true')
		// {
		// 	isAdmin = 1;
		// }
		// else
		// {
		// 	isAdmin = 0;
		// }
		format = "UPDATE `users` SET `username` = ?,`first_name` = ?,`last_name` = ?, `email` = ? WHERE `id` = ?";
        variables = [un,first,last,email,uid];
        query = db.format(format, variables);
        Q.ninvoke(db, 'query', query)
		.then(function (result) {
            var rows = result[0].affectedRows;
            if (rows === 1)
            {
				return resolve('User updated successfully');
            }
            else
            {
                jlog.error('Unable to update user');
				return reject(errMsg);
            }
    	})
		.fail(function (err) {
            jlog.error('Error encountered');
    	    return reject(err);
		});
	});
};
/*\
|*| Delete user
\*/
// Auth.prototype.deleteUser = function (uid) {
// 	return Q.Promise(function (resolve, reject, notify) {
//         var query, variables, format, record;
//         var errMsg = 'Unable to delete user';
// 		/*\
// 		|*| Sanity
// 		\*| Also cannot delete the super user
// 		\*/
// 		if (typeof uid === 'undefined' || uid <= 1)
// 			return reject('Invalid user id');
// 		format = "DELETE FROM `users` WHERE `id` = ?";
//         variables = [uid];
//         query = db.format(format, variables);
//         Q.ninvoke(db, 'query', query)
// 		.then(function (result) {
//             var rows = result[0].affectedRows;
//             if (rows === 1)
//             {
// 				return resolve('User deleted successfully');
//             }
//             else
//             {
//                 jlog.error('Unable to delete user');
// 				return reject(errMsg);
//             }
//     	})
// 		.fail(function (err) {
//             jlog.error('Error encountered');
//     	    return reject(err);
// 		});
// 	});
// };
/*\
|*| Get selected User info
\*/
Auth.prototype.getUser = function (uid) {
	return Q.Promise(function (resolve, reject, notify) {
		var query, variables, format, record;
		var errMsg = "Unable to get user data";
		/*\
		|*| Sanity
		\*/
		if(typeof uid === 'undefined' || uid < 1)
			return reject('Invalid user id');

		format  = "SELECT";
		format += " u.`id` AS 'id',";
		format += " u.`email` AS 'email',";
		format += " u.`username` AS 'username',";
		format += " u.`is_super` AS 'is_super',";
		format += " u.`is_admin` AS 'is_admin',";
		format += " u.`first_name` AS `first_name`,";
		format += " u.`last_name` AS `last_name`"
		format += " FROM `users` AS u";
		format += " WHERE `id` = ?";
		variables = [uid];
		query = db.format(format, variables);
		Q.ninvoke(db, 'query', query)
		.then(function (row) {
			if (row[0].length === 1)
			{
				/*\
				|*| Record obtained
				\*/
				record = row[0][0];
				user = {
					id: record.id,
					name: record.username,
					super: record.is_super,
					admin: record.is_admin,
					email: record.email,
					first_name: record.first_name,
					last_name: record.last_name
				};
				return resolve(record);
			}
			else
			{
				jlog.warning('Unable to find user ['+uid+']')
				throw new Error(errMsg);
			}
		})
    	.fail(function (err) {
			var error = handle.error(err);
            jlog.error(error);
			/*\
			|*| Resolve all errors here with at dummy message
			\*/
			return resolve({auth:false,error:errMsg});
    	});
	})
}
module.exports = new Auth();
