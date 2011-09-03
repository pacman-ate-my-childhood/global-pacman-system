
var express = require('express'),
    Game = require('./lib/game.js'),
    Map = require('./lib/map.js');
    _ = require('underscore'),
    Channel = require('./lib/channel.js'),
	 base64 = require('./lib/base64.js');

var app = express.createServer();
	 
Channel.listen(app);

app.use(express.bodyParser()); // for parsing incoming json + www-encoded-forms into req.body
app.use(express.cookieParser()); // supports sessions
app.use(express.session({ secret: 'pacman' }));

var auth = require('./lib/auth.js');

app.use(auth.middleware());
app.use(express.favicon());
app.set('view engine', 'ejs');


app.get(/^\/(?!static)/, function(req, res, next) {
   if (req.loggedIn) next();
   else res.redirect('/login');
});


/*
 * Menu-type screens:
 */
app.get('/', function(req, res){
	Game.list(function(err, games) {

		var user = req.user;

		if (!err) {
			res.render("index", {
				user: req.user
			,	games: games
			,	_:_
			});
		}
		else res.render('error');
   });
});

app.get('/help', function(req, res){
	var user = req.user;

	res.render("help");
});

app.get('/create_game', function(req, res){
	Map.list(function(err, maps) {
      console.log(maps);
		if (!err) {
      	res.render("create_game", {
				maps: maps
			,	_:_
			});
		}
		else res.render('error');
   });
});
app.get('/create_map', function(req, res){

	Map.list(function(err, maps) {
		if (!err) {
      	res.render("create_map", {
				maps:maps
			,	_:_
			});
		}
		else res.render('error');
	});

});


/*
 * Game on!
 */
app.get('/game/:id/', function(req, res, next) {
   if (!req.params.id) next()

   Game.join(req.params.id, req.user, function(err, game) {

		if( err ){ res.render('error', {error:err}); return;}

		Map.get(game.map_id, function(err, map) {
			if( err ){ res.render('error', {error:err}); return; }

			res.setHeader('Content-Type', 'text/html');

			res.render("game", {
				map: map,
				game: game,
				production: process.env['NODE_ENV'] === 'production',
				_:_
			});
		});

   });
});



/*
 * Game API
 */

app.post('/api/game/create', function(req, res, next) {
   var params = {
      map_id: req.body.map_id,
      created_by: req.user.id,
		characters:{},
		users:{},
		open:true,
      score: 0,
      mode: 'normal',
      timestamp: Date.now()
   };

   Game.create(base64.encode('' + Date.now()), params, function(err, game) {
      res.end(JSON.stringify({error: err, game: game})); 
   });
});

app.get('/api/game/list', function(req, res, next) {
   Game.list(function(err, games) {
      res.end(JSON.stringify({error:err, games:games}));
   });
});

app.get('/api/game/:id/', function(req, res, next) {
   Game.get(req.params.id, function(err, game) {
      res.end(JSON.stringify({error:err, game:game}));
   });
});

app.post('/api/game/:id/join', function(req, res, next) {
   Game.join(req.params.id, req.user, function(err, game) {
      res.end(JSON.stringify({error:err, game:game}));
   });
});

app.post('/api/game/:id/leave', function(req, res, next) {
   console.log('user ' + req.user.id + ' leaving game ' + req.params.id);
   Game.leave(req.params.id, req.user, function(err) {
      res.end(JSON.stringify({error:err}));
   });
});

app.post('/api/game/:id/remove', function(req, res, next) {
   Game.remove(req.params.id, function(err) {
      res.end(JSON.stringify({error:err}));
   });
});


/*
 * Map API
 */

app.post('/api/map/create', function(req, res, next) {
   req.body.id = req.body.id.replace(/\s+/g, '+');
   Map.create(req.body.id, req.body, function(err, map) {
      res.end(JSON.stringify({error:err, map:map}));
   });
});

app.get('/api/map/list', function(req, res, next) {
   Map.list(function(err, maps) {
      res.end(JSON.stringify({error:err, maps:maps}));
   });
});

app.get('/api/map/:id/', function(req, res, next) {
   Map.get(req.params.id, function(err, map) {
      res.end(JSON.stringify({error:err, map:map}));
   });
});

app.post('/api/map/:id/remove', function(req, res, next) {
   Map.remove(req.params.id, function(err) {
      res.end(JSON.stringify({error:err}));
   });
});

// Jim: moved this to after the app.get()s because it was taking over from ejs with index etc
app.use('/static', express.static(__dirname + '/public', { maxAge: 0 }));

auth.helpExpress(app);


console.log('started server');

app.listen(80);

