
var WALL_COLOUR = "#5757FF",
	 PACMAN_COLOR = "#ffff57",
	 PACMAN_SIZE = 28,
	 PACMAN_SIZE_HALF = PACMAN_SIZE/2,
	 PILL_COLOR = "#FFFFAB",
	 POWER_PILL_SIZE_PX = 14,
	 PILL_SIZE_PX = 4,
	 POWER_PILL_SIZE_PX_HALF = POWER_PILL_SIZE_PX/2,
	 PILL_SIZE_PX_HALF = PILL_SIZE_PX/2,
	 TARGET_FRAME_RATE_MS = 30,
	 GHOST_IMAGE_SIZE = 28,
	 GHOST_IMAGE_SIZE_HALF = GHOST_IMAGE_SIZE/2,
	FOG_OF_WAR_RADIUS = 0.0006;


function Engine( game_state ){

	this.game_state = game_state;

	var self = this;

}

Engine.prototype.canvas = {map:null, char:null};
Engine.prototype.ghost_images = {
	"ghost1":null
,	"ghost2":null
,	"ghost3":null
,	"ghost4":null
};

Engine.prototype.init = function(){
	this._init_canvas();
	this._init_ghost_images();
}

Engine.prototype.render_frame = function(){
	// clear canvas
	this.canvas.eles.char.getContext('2d').clearRect(0,0, this.canvas.width, this.canvas.height+1);

	this._render_pills();
	this._render_characters();
}


Engine.prototype._init_canvas = function() {
	var jCanvasContainer = $('#canvasContainer'),
		 jCanvases = $('canvas'),
		 bounds = this.game_state.bounds;

// now make world square (eg, not stretching the x more than y)
//	by making canvas rectangular:
	var aspect = bounds.longsize / bounds.latsize;
	if( aspect < 1 ){
		style = {"width": Math.round( jCanvases.width() * aspect ) };
		jCanvases.attr(style);
		jCanvasContainer.css(style);
	}else{
		style = {"height": Math.round( jCanvases.height() / aspect ) };
		jCanvases.attr(style);
		jCanvasContainer.css(style);
	}

	this.canvas = {
		eles: {	map: $("#mapCanvas")[0],
					char:$("#charCanvas")[0]
		},
		width: jCanvases.width(),
		height: jCanvases.height()
	};
};

Engine.prototype._init_ghost_images = function() {
	this.ghost_images = { alive : {
      'normal': {
         "ghost1":$('img.ghost.red')[0]
      ,	"ghost2":$('img.ghost.pink')[0]
      ,	"ghost3":$('img.ghost.orange')[0]
      ,	"ghost4":$('img.ghost.blue')[0]
      },
      'power': {
         "ghost1":$('img.ghost-eatable.red')[0]
      ,	"ghost2":$('img.ghost-eatable.pink')[0]
      ,	"ghost3":$('img.ghost-eatable.orange')[0]
      ,	"ghost4":$('img.ghost-eatable.blue')[0]
      }
   },
      dead: {
         "ghost1":$('img.ghost-dead.red')[0]
      ,	"ghost2":$('img.ghost-dead.pink')[0]
      ,	"ghost3":$('img.ghost-dead.orange')[0]
      ,	"ghost4":$('img.ghost-dead.blue')[0]
      }
	};
};

Engine.prototype.render_map = function() {

	var self = this;
	var nodes = this.game_state.map.vertices;
	var ctx = this.canvas.eles.map.getContext('2d');

	function render_lines( is_outline ) {

		function draw_line(ctx, node1, node2) {

			var xy1 = coords.long_lat_to_x_y(node1),
				 xy2 = coords.long_lat_to_x_y(node2);

			ctx.moveTo(xy1.x, xy1.y);
			ctx.lineTo(xy2.x, xy2.y);

		}

		ctx.strokeStyle = is_outline? WALL_COLOUR : "black";
		ctx.lineWidth = is_outline? 30 : 25;
		ctx.lineCap = "round";

		ctx.beginPath();
		_(self.game_state.map.edges).each( function(edge){

			var node1 = nodes[ edge.a ],
				 node2 = nodes[ edge.b ];

			draw_line(ctx, node1, node2);
		});
		ctx.stroke();
	}

	function render_ghost_home(){
		var gh_location = coords.long_lat_to_x_y( self.game_state.map.ghost_home );

		ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
		ctx.strokeStyle = "white";

		ctx.beginPath();
		ctx.arc(gh_location.x,gh_location.y, 30, 2*Math.PI, 0, true);
		ctx.fill();
		ctx.lineWidth = 1;
		ctx.stroke();
	}


	render_lines( true );
	render_lines( false );

	render_ghost_home();
};

Engine.prototype._render_pills = function() {
	var self = this;
	var ctx = this.canvas.eles.char.getContext('2d');
	ctx.fillStyle = PILL_COLOR;

	var character_name = this.game_state.users[ this.game_state.user_id ].character,
       character = this.game_state.characters[character_name],
		 character_location = character.location;
   
   console.log('current player [' + character_name + '] at lng:' + character_location.long + ' lat:' + character_location.lat);

	function render_list_of_pills( pills, is_power_pill ) {
		var SIZE = is_power_pill? POWER_PILL_SIZE_PX : PILL_SIZE_PX;
		var SIZE_HALF = is_power_pill? POWER_PILL_SIZE_PX_HALF : PILL_SIZE_PX_HALF;
		var renderer = is_power_pill? renderPowerPill : renderPill;

		function renderPowerPill(xy){
			ctx.beginPath();
			ctx.arc(xy.x, xy.y, SIZE_HALF, 0, Math.PI*2,true);
			ctx.fill();
		}
		function renderPill(xy){
			ctx.fillRect(xy.x - SIZE_HALF, xy.y - SIZE_HALF, SIZE, SIZE );
		}

		_(pills).each(function(pill) {
			var xy = coords.long_lat_to_x_y( pill );
			renderer( xy );
		});
	}

	var filter = (character_name == 'pacman')?
						function pacman_sees_all(){ return true; }
					:	function fog_of_war_for_ghosts_filter( pill ){
							var distance = lineLength(pill.lat, pill.long, character_location.lat, character_location.long );
							return distance < FOG_OF_WAR_RADIUS;
						};

	render_list_of_pills( _(this.game_state.pills).select(filter), false );
	render_list_of_pills( _(this.game_state.powerpills).select(filter), true );

	// draw circle around ghost to show edge of vision
	if( character_name != 'pacman' ) {
		var character_location_xy = coords.long_lat_to_x_y( character_location );
		var fog_of_war_edge_location = _.clone(character_location);
		fog_of_war_edge_location.lat = fog_of_war_edge_location.lat + FOG_OF_WAR_RADIUS;

		var fog_of_war_edge_px    = coords.long_lat_to_x_y( fog_of_war_edge_location );

		var fow_size_px = Math.abs(fog_of_war_edge_px.y - character_location_xy.y);

		ctx.strokeStyle = "white";
		ctx.beginPath();
		ctx.arc(character_location_xy.x, character_location_xy.y, fow_size_px, 2*Math.PI, 0, true);
		ctx.lineWidth = 1;
		ctx.stroke();
	}
};

Engine.prototype._render_characters = function() {

	var ctx = this.canvas.eles.char.getContext('2d');

	var character_name = this.game_state.users[ this.game_state.user_id ].character,
       character = this.game_state.characters[character_name],
		 character_location = character.location;

	_(this.game_state.characters).each(function(character, name){

		var xy = coords.long_lat_to_x_y( character.location ),
			 prev_xy = character.prev_location ? coords.long_lat_to_x_y( character.prev_location ): null;

		var renderer = ( name == 'pacman' )? this._render_pacman : this._render_ghost;

		// ghosts only see pacman when he is nearby:
		if( character_name != 'pacman' && name == 'pacman' ) {
			var pacman_location = this.game_state.characters.pacman.location;

			var distance = lineLength(pacman_location.lat, pacman_location.long, character_location.lat, character_location.long );

			if( distance > FOG_OF_WAR_RADIUS ){
				renderer = function(){};
			}
		}

		(_.bind(renderer,this))(name, xy, prev_xy, ctx);
	}, this);
};

Engine.prototype._render_pacman = function(name, xy, prev_xy, ctx) {
	var mouth_open_angle = 0.5,
		 angle;

	if( prev_xy ) {
		angle = Math.atan( (xy.y - prev_xy.y)/(xy.x - prev_xy.x) );
      if( xy.x < prev_xy.x ){
         angle += Math.PI;
      }
	} else {
		angle = 0;
	}

	ctx.save();

	ctx.translate(xy.x, xy.y);
	ctx.rotate(angle);

	ctx.beginPath();
	ctx.moveTo(0,0);
	ctx.arc(0,0, PACMAN_SIZE_HALF, 2*Math.PI - mouth_open_angle, mouth_open_angle, true);
	ctx.moveTo(0,0);

	ctx.fillStyle = PACMAN_COLOR;
	ctx.fill();

	ctx.restore();
};

Engine.prototype._render_ghost = function(name, xy, prev_xy, ctx) {
   var ghost = this.game_state.characters[name],
       img;

   if (ghost.dead) { img = this.ghost_images.dead[name]; }
   else { img = this.ghost_images.alive[this.game_state.mode][name]; }

   console.log('trying to render ghost ', img, img && img.src, xy);

	ctx.drawImage(img, xy.x - GHOST_IMAGE_SIZE_HALF, xy.y - GHOST_IMAGE_SIZE_HALF);
}
