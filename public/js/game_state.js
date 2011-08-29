function GameState( map_json, game_json, user_id ){

	this.map = map_json;
	this.user_id = user_id;

	this.id = game_json.id;
	this.map_id = game_json.map_id;
	this.created_by = game_json.created_by;
	this.pills = game_json.pills;
	this.powerpills = game_json.powerpills;

   this.score = game_json.score;
   this.mode = game_json.mode;

	// put pacman at the start:
	this.users = game_json.users;
	this.characters = game_json.characters;
}


GameState.prototype.engine = null; // the renderer
GameState.prototype.map = null;
GameState.prototype.bounds = {	  // the edges of the map
	latmin:  null,
	latmax:	null,
	longmin:	null,
	longmax:	null,
	longsize:null,
	latsize: null
};


GameState.prototype.init = function() {
	this._init_bounds();
};

GameState.prototype._init_bounds = function() {
	var bounds = this.bounds;
	var style;

	bounds.latmin  = _.min( _(this.map.vertices).pluck('lat') );
	bounds.latmax  = _.max( _(this.map.vertices).pluck('lat') );
	bounds.latsize = this.bounds.latmax - this.bounds.latmin;

	bounds.longmin = _.min( _(this.map.vertices).pluck('long') );
	bounds.longmax = _.max( _(this.map.vertices).pluck('long') );
	bounds.longsize= this.bounds.longmax - this.bounds.longmin;

	// expand the game bounds a bit to get a margin:
	var latMargin = bounds.latsize/10,
		 longMargin = bounds.longsize/10;

	bounds.latmin -= latMargin;
	bounds.latmax += latMargin;
	bounds.longmin -= longMargin;
	bounds.longmax += longMargin;

	bounds.latsize += (latMargin*2);
	bounds.longsize += (longMargin*2);
}
