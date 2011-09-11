(function( GoogleMaps ){

	/**
	 *
	 * @param google_map
	 * @param {Function} get_map_state function which when called returns the map state
	 */
	function PacmanMapOverlay(google_map, get_map_state) {
		this.google_map = google_map;
		this.get_map_state = get_map_state;

	  	this.setMap(google_map);
	}

	// extend from GoogleMap's OverlayView:
	PacmanMapOverlay.prototype = new google.maps.OverlayView();

	PacmanMapOverlay.prototype.google_map = null;
	PacmanMapOverlay.prototype.jCanvasWrap = null;
	PacmanMapOverlay.prototype.map_view = null;
	PacmanMapOverlay.prototype.get_map_state = null;


	PacmanMapOverlay.prototype.onAdd = function() {

		console.log( "onAdd" );

	  // Note: an overlay's receipt of onAdd() indicates that
	  // the map's panes are now available for attaching
	  // the overlay to the map via the DOM.

		var jCanvas = jQuery("<canvas width='10' height='10'>"),
			 canvas = jCanvas[0],
			 jCanvasWrap = jCanvas.wrap('<div class="editorCanvasWrap" style="position:absolute" />').parent();
		this.jCanvasWrap = jCanvasWrap;
		this.map_view = new Map_View(jCanvas);

		jCanvasWrap.css('position', 'absolute');
		//jCanvasWrap.css('border', '1px black solid');

		var panes = this.getPanes();
		panes.overlayLayer.appendChild(jCanvasWrap[0]);

		// init coord translator (.draw() will fill in the bounds with map bounds before it is
		//	used to render the game map
		new Coord_Translator(null, canvas);

		// now we are added, start listening to the bounds of the map changing:
		var self = this;
		GoogleMaps.event.addListener(this.google_map, "bounds_changed", function(){
			console.log("bc happened");
			self.draw();
		});
	};

	/* draw is called sometimes by GM api but mostly by us in response to bounds change
	 	events on the main Map object */
	PacmanMapOverlay.prototype.draw = function() {

		console.log( "draw" );

	  // Size and position the overlay. We use a southwest and northeast
	  // position of the overlay to peg it to the correct position and size.
	  // We need to retrieve the projection from this overlay to do this.
		var overlayProjection = this.getProjection(),
				mapBounds = this.google_map.getBounds();

		// update the game bounds that the coord translator sees to where the map is now:
		coords.game_bounds = Coord_Translator.fromGoogleMapsBounds(mapBounds);

	  // Retrieve the southwest and northeast coordinates of this overlay
	  // in latlngs and convert them to pixels coordinates.
	  // We'll use these coordinates to resize the DIV.
		var sw = overlayProjection.fromLatLngToDivPixel(mapBounds.getSouthWest());
		var ne = overlayProjection.fromLatLngToDivPixel(mapBounds.getNorthEast());

	  // Resize the wrapper div and canvas to fit the indicated dimensions.

		var left = Math.round(sw.x);
		var top = Math.round(ne.y);
		var width = Math.round(ne.x - sw.x);
		var height = Math.round(sw.y - ne.y);

		this.jCanvasWrap.css( {left: left, top:top, width:width, height:height} );
		this.jCanvasWrap.find('canvas').attr({width:width, height:height});

		this.map_view.render_map( this.get_map_state() );

		console.log( "set style to", this.jCanvasWrap[0].style.cssText );
	};

	window.PacmanMapOverlay = PacmanMapOverlay;

})(google.maps);