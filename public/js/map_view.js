var WALL_OUTLINE_COLOUR = "#5757FF",
	 WALL_THICKNESS = 0.0005,
	 PATH_THICKNESS = 0.0003,
	 GHOST_IMAGE_SIZE = 28,
	 GHOST_IMAGE_SIZE_HALF = GHOST_IMAGE_SIZE/2;

function Map_View( jCanvas, editor_mode ) {
	this.ctx = jCanvas[0].getContext("2d");
	this.editor_mode = editor_mode;
}

Map_View.prototype.render_map = function( map_state ) {
	this.render_lines( map_state );
	this.render_ghost_home(map_state);
};

Map_View.prototype.render_lines = function(map_state) {
	this.trace_lines( map_state, true );
	this.trace_lines( map_state, false );
}

Map_View.prototype.trace_lines = function( map_state, is_outline ) {

	var nodes = map_state.vertices;
	var visited_nodes = {};
	var ctx = this.ctx;
	var thickness = is_outline
								? coords.long_lat_distance_to_px(WALL_THICKNESS)
								: coords.long_lat_distance_to_px(PATH_THICKNESS)
								;

	function draw_line(node1, node2) {
		var xy1 = coords.long_lat_to_x_y(node1),
			 xy2 = coords.long_lat_to_x_y(node2);

		ctx.moveTo(xy1.x, xy1.y);
		ctx.lineTo(xy2.x, xy2.y);
	}

	function draw_unconnected_vertex( vertex ) {
		var xy = coords.long_lat_to_x_y(vertex);

		ctx.beginPath();
		ctx.arc(xy.x,xy.y, thickness/2, 2*Math.PI, 0, true);
		ctx.fill();
	}

	ctx.strokeStyle = is_outline? WALL_OUTLINE_COLOUR : "black";
	ctx.lineWidth = thickness;
	ctx.lineCap = "round";

	ctx.beginPath();
	_(map_state.edges).each( function(edge){

		var node1 = nodes[ edge.a ],
			 node2 = nodes[ edge.b ];

		visited_nodes[edge.a] = true;
		visited_nodes[edge.b] = true;

		draw_line(node1, node2);
	});
	ctx.stroke();

	// get unvisited nodes:
	var unvisited = _(nodes).filter( function( node, index ){
		return !visited_nodes[index];
	});

	if( unvisited.length > 0 ) {
		ctx.fillStyle = is_outline? WALL_OUTLINE_COLOUR : "black";
		_(unvisited).each( draw_unconnected_vertex );
	}
};

Map_View.prototype.render_ghost_home = function ( map_state ){

	var ctx = this.ctx;

	// might not have ghost home if map is being edited and a work in progress
	if( !map_state.ghost_home ){
		return;
	}

	var gh_location = coords.long_lat_to_x_y( map_state.ghost_home );

	ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
	ctx.strokeStyle = "white";

	ctx.beginPath();
	ctx.arc(gh_location.x,gh_location.y, 30, 2*Math.PI, 0, true);
	ctx.fill();
	ctx.lineWidth = 1;
	ctx.stroke();

	if( this.editor_mode ) {
		var jImg = $('.ghosts .ghost');
		ctx.drawImage(jImg[0], gh_location.x - GHOST_IMAGE_SIZE_HALF, gh_location.y - GHOST_IMAGE_SIZE_HALF);
	}
};