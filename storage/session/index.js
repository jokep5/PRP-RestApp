const session = require('express-session');
const Mongostore = require('connect-mongo')(session);
const config = require('config');

const sessionMW = session({
	secret: config.get('session:secret'),
	resave: false,
	saveUninitialized: true,
	cookie: { secure: false, httpOnly: true },
	store: new Mongostore({ url: config.get('db:uri') })
})

module.exports = sessionMW;
