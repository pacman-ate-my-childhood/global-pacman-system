var WALL_COLOUR = "#5757FF";

function Map_View( jCanvas ) {
	this.ctx = jCanvas[0].getContext("2d");
}

Map_View.prototype.render_map = function( map_state ) {

	var self = this;
	var nodes = map_state.vertices;
	var ctx = this.ctx;

	render_lines( true );
	render_lines( false );
	render_ghost_home(map_state);

	function render_lines( is_outline ) {

		function draw_line(ctx, node1, node2) {

			var xy1 = coords.long_lat_to_x_y(node1),
				 xy2 = coords.long_lat_to_x_y(node2);

			ctx.moveTo(xy1.x, xy1.y);
			ctx.lineTo(xy2.x, xy2.y);

		}

		ctx.strokeStyle = is_outline? WALL_COLOUR : "black";
		ctx.lineWidth = is_outline
									? coords.long_lat_distance_to_px(0.0004)
									: coords.long_lat_distance_to_px(0.00025)
									;
		ctx.lineCap = "round";

		ctx.beginPath();
		_(map_state.edges).each( function(edge){

			var node1 = nodes[ edge.a ],
				 node2 = nodes[ edge.b ];

			draw_line(ctx, node1, node2);
		});
		ctx.stroke();
	}

	function render_ghost_home( map_state ){

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
	}
};