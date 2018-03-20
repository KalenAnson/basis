# Basis Authorization Module

## Mount Point

Mounted under `/api/users`.

## Routes

| Method | Path          | Type  | Authorized | Description
| -----: | ------------- | :---: | :--------: | -----------
| GET    | /user         | API   | yes        | Get logged in user's information
| GET    | /logout       | API   | no         | Destroys session
| POST   | /validate     | API   | no         | Credential validation route
| POST   | /pw           | API   | yes        | Reset the logged in user's password
| POST   | /             | API   | yes        | Create a new user
| POST   | /user/:uid    | API   | yes        | Update current user's information

### Default Route:

	GET: 		/*				auth.users

### Non-Authorized UI Routes:

### Authorized API Routes:

	GET:		/user 			auth.getUser
	GET:        /logout			auth.logout
	POST:       /pw				auth.updatePassword
	POST:       /				auth.createUser
	POST:       /user/:uid		auth.updateUser
	POST:       /validate		auth.validate

## Notes
The auth module will set the following data to the session variable if a user successfully authenticates:

	req.session: {
	    valid: bool,
	    user: {
	        id: int,
	        name: string,
	        super: int,
	        admin: int,
			layout: string (perhaps an object that has been deserialized,
	        auth: bool
	    }
	}
