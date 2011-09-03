
var COLLISION_DISTANCE = 0.0001249;

var POINTS_PER_PILL = 100,
    POINTS_PER_GHOST = 400,
    POWERPILL_TIMEOUT = 60000;


var mode_timeouts = {};


function pill_collision(game, channel, object) {

	var id = object.ref.id;

	game.pills = _.filter(game.pills, function(pill) { return pill.id !== id });
   game.score += POINTS_PER_PILL;

	channel.emit('pill_eaten', { id: id });
   channel.emit('score_changed', { score: game.score });

   if (game.pills.length === 0) {
      channel.emit('pacman_wins');
      game.isDead = true;
      game.remove(function() {});
   }

	return true;
}

function death_collision(game, channel, object) {
   var ghost_id = (object.name === 'pacman') ? object.ref.name : object.name,
       ghost = game.characters[ghost_id];

   console.log('ghost id for death collision: ' + ghost_id);

   if (game.mode === 'power' && !ghost.dead) {
      ghost.dead = true;
      game.score += POINTS_PER_GHOST;
      channel.emit('score_changed', { score: game.score });
      channel.emit('ghost_died', { id: ghost_id }); 
   } else if (!ghost.dead) {
		game.isDead = true;
      game.remove(function() {});
   }

   return false;
}

function ghost_home_collision(game, channel, object) {
   var ghost = object.ref;

   if (ghost.dead) {
      ghost.dead = false;
      channel.emit('ghost_alive', { id: object.name });
   }

   return false;

}

function powerpill_collision(game, channel, object) {

	var id = object.ref.id;

	game.powerpills = _.filter(game.powerpills, function(pill) { return pill.id !== id });
   game.score += POINTS_PER_PILL;
   game.mode = 'power';

	channel.emit('powerpill_eaten', { id: id });
   channel.emit('score_changed', { score: game.score });
   channel.emit('mode_changed', { mode: game.mode });

   if (mode_timeouts[game.id]) { clearTimeout(mode_timeouts[game.id]); }

   mode_timeouts[game.id] = setTimeout(function() {
      mode_timeouts[game.id] = null;

		if (game.isDead) return;

      game.mode = 'normal';
      game.save(function(err) {
         if (!err) channel.emit('mode_changed', { mode: game.mode }); 
      });

   }, POWERPILL_TIMEOUT);

   return true;
}



function step(game, channel, character, coords) {

	if (game.isDead) return;

	// get the coordinates of things we are interested in
	var objects = [];
	if (character.name === 'pacman') {
		var characters = _.clone(game.characters);
		delete characters.pacman;

		_.each(characters, function(character, name) {
			objects.push({
				long: character.location.long,
				lat: character.location.lat,
				name: name,
				ref: character,
				callback: death_collision
			});
		});

		_.each(game.pills, function(pill) {
			objects.push({
				long: pill.long,
				lat: pill.lat,
				name:'pill',
				ref: pill,
				callback: pill_collision
			});
		});

		_.each(game.powerpills, function(pill) {
			objects.push({
				long: pill.long,
				lat: pill.lat,
				name:'powerpill',
				ref: pill,
				callback: powerpill_collision
			});
		});


	} else {
		var pacman = game.characters['pacman'];

		objects.push({
			long: pacman.location.long,
			lat: pacman.location.lat,
			name:'pacman',
			ref: character,
			callback: death_collision
		});

      objects.push({
         long: game.ghost_home.long,
         lat: game.ghost_home.lat,
         name: character.name,
         ref: character,
         callback: ghost_home_collision
      });
	}


	var proximateObjects = _.map(objects, function(obj) {
		var latDiff = Math.abs(coords.latitude - obj.lat),
			 longDiff = Math.abs(coords.longitude - obj.long);

		obj.distance = ( Math.sqrt( Math.pow(latDiff,2) + Math.pow(longDiff,2) ) );

		return obj;
	}).sort(function(a, b) { return a.distance - b.distance; });

	for (var i = 0, len = proximateObjects.length; i < len; i++) {
		obj = proximateObjects[i];

		if (obj.distance > COLLISION_DISTANCE) break;

		// allow callbacks to return false to halt all subsequent checks
		if (!obj.callback(game, channel, obj)) break;
	}

};


module.exports = step;
