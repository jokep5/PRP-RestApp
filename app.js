const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');


//Sessions support
const session = require('express-session');
const Mongostore = require('connect-mongo')(session);

//models import
const userModel = require('models/user');

const config = require('config');


//Mongoose
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

mongoose.connect(config.get('db:uri'));
const db = mongoose.connection;

db.on('error', function (err) {
	console.error('connection error:', err.message);
});

db.once('open', function () {
	console.info('Connected to DB!');
});

//passportjs
const passport = require('passport');
const passportVkStrategy = require('passport-vkontakte').Strategy;
const LocalStrategy = require('passport-local').Strategy;
passport.serializeUser(userModel.serializeUser());
passport.deserializeUser(userModel.deserializeUser());
passport.use(new LocalStrategy(
	{
		usernameField: 'username',
		passwordField: 'password'
	}, userModel.authenticate()
));

passport.use('vkontakte', new passportVkStrategy({
		clientID: config.get("auth:vk:APP_ID"),   // google @how to get vkontakte app id@
		clientSecret: config.get("auth:vk:clientSecret"),  // add secret in appconfig file
		callbackURL: config.get("app:url") + "auth/vk/callback"
	}, function myVerifyCallbackFn(accessToken, refreshToken, params, profile, done) {
		console.log("Vkontaket Auth", profile)
		process.nextTick(function () {							// see google passport social auth example 1st link (code.tutsplus.com)
			userModel.findOne({vkontakteId: profile.id}, function (err, user) {
				if (err)
					return done(err)
				if (user) {
					return done(null, user)
				} else
					var newUser = new userModel()
				newUser.auth.vk.id = profile.id
			})  												// google mongoose findOrCreate 2nd link (stackOverflow)
				.then(function (user) {
					done(null, user)
				})
				.catch(done);
		})
	}
));

//Routes
var index = require('routes/index');
var users = require('routes/users');
var api = require('routes/api');
//var auth = require('routes/auth');


const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser(config.get('SECRET')));
app.use(session({
	secret: config.get('session:secret'),
	resave: false,
	saveUninitialized: true,
	cookie: {secure: false, httpOnly: true},
	//store: new Mongostore({url: config.get('db:uri')})
}));

// Passport init
app.use(passport.initialize());
app.use(passport.session());


app.use(require('node-sass-middleware')({
	src: path.join(__dirname, 'public'),
	dest: path.join(__dirname, 'public'),
	indentedSyntax: false,
	sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));

//open routes
app.use('/', index);
app.use('/api', api);

//auth
app.use('/auth',
	passport.authenticate('local', {
		successRedirect: '/users',
		failureRedirect: '/',
		failureFlash: false
	})
);

app.get('/auth/vk',
	passport.authenticate('vkontakte')
);

app.get('/auth/vk/callback',
	passport.authenticate('vkontakte', {
		successRedirect: '/users',
		failureRedirect: '/',
		failureFlash: false
	})
);


// check auth middleware
const checkAuth = function (req, res, next) {
	if (req.user) {
		next()
	}
	else {
		res.redirect('/')
	}
};

// restricted access
app.use('/users', checkAuth, users);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
	let err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handler
app.use(function (err, req, res) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});

module.exports = app;
