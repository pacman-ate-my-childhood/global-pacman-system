
var COLLISION_DISTANCE = 0.0001249;

var POINTS_PER_PILL = 100,
    POINTS_PER_GHOST = 400,
    POWERPILL_TIMEOUT = 60000;


var mode_timeouts = {};


function pill_collision(game, channel, character, pill) {

	var id = pill.id,
       score = game.users[character.user_id].score += POINTS_PER_PILL;

   console.log('[' + character.user_id + ',' + game.id + ',' + character.name +
         '] has collided with a pill [' + id + ']');

	game.pills = _.filter(game.pills, function(pill) { return pill.id !== id });

	channel.emit('pill_eaten', id);
   channel.emit('score_changed', character.user_id, score);

   if (game.pills.length === 0) {
      channel.emit('pacman_wins');
      game.remove(function() {});
   }

	return true;
}

function death_collision(game, channel, character, other_character) {
   var ghost, pacman;

   if (character.name === 'pacman') { pacman = character; ghost = other_character; }
   else { pacman = other_character; ghost = character }

   console.log('[' + character.user_id + ',' + game.id + ',' + character.name +
         '] has collided with ' + other_character.name + ' [' + other_character.user_id + ',' + game.id + ']');

   if (game.mode === 'power' && !ghost.dead) {
      var score = game.users[pacman.user_id].score += POINTS_PER_GHOST;
      ghost.dead = true;

      channel.emit('score_changed', pacman.user_id, score);
      channel.emit('ghost_died', ghost.id); 
   } else if (!ghost.dead) {
      game.remove(function() {});
   }

   return false;
}

function ghost_home_collision(game, channel, ghost) {
   console.log('[' + ghost.user_id + ',' + game.id + ',' + ghost.name +
      '] has collided with the ghost home');

   if (ghost.dead) {
      console.log('[' + ghost.user_id + ',' + game.id + ',' + ghost.name +
         '] has been revived');

      ghost.dead = false;
      channel.emit('ghost_alive', ghost.name);
   }

   return false;

}

function powerpill_collision(game, channel, character, power_pill) {

	var id = power_pill.id,
       score = game.users[character.user_id].score += POINTS_PER_PILL;

	game.powerpills = _.filter(game.powerpills, function(pill) { return pill.id !== id; });
   game.mode = 'power';

	channel.emit('powerpill_eaten', id);
   channel.emit('score_changed', character.user_id, score);
   channel.emit('mode_changed', game.mode);

   if (mode_timeouts[game.id]) { clearTimeout(mode_timeouts[game.id]); }

   mode_timeouts[game.id] = setTimeout(function() {
      console.log('[' + character.user_id + ',' + game.id + ',' + character.name +
         '] has left power mode');

      mode_timeouts[game.id] = null;

		if (!game.alive) return;

      game.mode = 'normal';
      game.save(function(err) {
         if (!err) channel.emit('mode_changed', game.mode); 
      });

   }, POWERPILL_TIMEOUT);

   console.log('[' + character.user_id + ',' + game.id + ',' + character.name +
         '] has collided with a power_pill [' + id + '] power mode active for ' + POWERPILL_TIMEOUT);

   return true;
}



function step(game, channel, character, coords) {

	if (!game.alive) return;

	// get the coordinates of things we are interested in
	var objects = [];
	if (character.name === 'pacman') {
		_.each(game.characters, function(character, name) {
         if (name === 'pacman') return;

			objects.push({
				long: character.location.long,
				lat: character.location.lat,
				ref: character,
				callback: death_collision
			});
		});

		_.each(game.pills, function(pill) {
			objects.push({
				long: pill.long,
				lat: pill.lat,
				ref: pill,
				callback: pill_collision
			});
		});

		_.each(game.powerpills, function(pill) {
			objects.push({
				long: pill.long,
				lat: pill.lat,
				ref: pill,
				callback: powerpill_collision
			});
		});


	} else {
		var pacman = game.characters['pacman'];

      /*
       if the current pacman disconnects then there will be a period of time
       when there is no pacman in the game
       */
      if (pacman) {
         objects.push({
            long: pacman.location.long,
            lat: pacman.location.lat,
            ref: pacman,
            callback: death_collision
         });
      }

      objects.push({
         long: game.ghost_home.long,
         lat: game.ghost_home.lat,
         callback: ghost_home_collision
      });
	}

   console.log('[' + character.user_id + ',' + game.id + ',' + character.name +
         '] distance against ' + objects.length + ' objects');

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
		if (!obj.callback(game, channel, character, obj.ref)) break;
	}

};


module.exports = step;
