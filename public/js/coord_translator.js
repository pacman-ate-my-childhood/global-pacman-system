function Coord_Translator( game_bounds, canvas ) {
	this.game_bounds = game_bounds;
	this.canvas = canvas;
	window.coords = this;
}

Coord_Translator.prototype.long_lat_to_x_y = function(point) {
	var bounds = this.game_bounds,
		 canvas = this.canvas;

	return {
		x: ((point.long - bounds.longmin)/bounds.longsize ) * canvas.width
	,	y: ((point.lat  - bounds.latmin)/bounds.latsize ) * (-canvas.height) + canvas.height
	};
};

Coord_Translator.prototype.x_y_to_long_lat = function(xy) {
	var bounds = this.game_bounds,
		 canvas = this.canvas;

	return {
		long: bounds.longmin + ((xy.x)/canvas.width)  * bounds.longsize
	,	lat:  bounds.latmin  + ((xy.y)/canvas.height) * (-bounds.latsize) + bounds.latsize
	};
};