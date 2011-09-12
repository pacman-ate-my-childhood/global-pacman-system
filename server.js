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
app.use(express.favicon());
app.set('view engine', 'ejs');


/*
 * Menu-type screens:
 */
app.get('/', function(req, res){
	Map.list(function(err, maps) {
		if (!err) {
			res.render("index", {
            maps: maps
			,	_:_
			});
		}
		else res.render('error');
   });
});

app.get('/help', function(req, res){
	res.render("help");
});

app.get('/map/create', function(req, res){
   res.render("create_map");
});


/*
 * Game on!
 */
app.get('/game/:id/', function(req, res, next) {
   if (!req.params.id) next()

   Game.get(req.params.id, function(err, game) {

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
      avaliable_characters:[],
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

// Jim: moved this to after the app.get()s because it was taking over from ejs with index etc
app.use('/static', express.static(__dirname + '/public', { maxAge: 0 }));

console.log('started server');

app.listen(80);

