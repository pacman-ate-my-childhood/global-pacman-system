(function(GoogleMaps){

	var DEFAULT_ICON = "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%20|66FFFF|000000",
		 SELECTED_ICON = "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%20|FFFF66|000000";

	function MapEditor(){
		this.map_state =
			{	edges:[]
			,	vertices:[]
			};

      var map_center = { coords: { latitude: 51.504469, longitude: -0.136986 } };

      if (window.navigator.geolocation) {
         window.navigator.geolocation.getCurrentPosition(
            _.bind(this.create_google_map, this),
            _.bind(this.create_google_map, this, map_center)
         );
      } else {
         this.create_google_map(map_center);
      }

		this.init_events();
	}

	MapEditor.prototype.map_state = null;
	MapEditor.prototype.google_map = null;
	MapEditor.prototype.overlay = null;
	MapEditor.prototype._selected_marker = null;

	MapEditor.prototype.create_google_map = function(position) {

		var 		self = this,
					jMap = $('#map'),
					latlng = new GoogleMaps.LatLng(position.coords.latitude, position.coords.longitude),
					google_map;

		//adjust map div to be (roughly) as high as screen is happy to show:
		// jMap.height($(window).height() - 250); - disabled, needs to be smarter on mobile

		google_map = new GoogleMaps.Map(jMap[0], {
                  zoom: (position && position.timestamp) ? 15 : 3, 
                  center: latlng,
						streetViewControl: false,
                  mapTypeId: GoogleMaps.MapTypeId.ROADMAP 
               });


		this.google_map = google_map;

		this.overlay = new PacmanMapOverlay(google_map, _.bind(this.get_map_data, this));

		GoogleMaps.event.addListener(google_map, 'click', _.bind( this.handleClickOnMap, this ));

		var jCreateButton = $('<a id="create-map-button" href="#">Create Map</a>');
		jCreateButton.bind('click', _.bind(this._handle_click_create, this));
		google_map.controls[GoogleMaps.ControlPosition.RIGHT_BOTTOM].push(jCreateButton[0]);
	};



	MapEditor.prototype.handleClickOnMap = function( event ) {
      if (this._selected_marker) this.deselect();
      else {
         var   vertex = {lat: + event.latLng.lat(), 'long': + event.latLng.lng()},
               marker = new GoogleMaps.Marker({ position: event.latLng, map: this.google_map, draggable:true });

         marker.pacman = {map_vertex: vertex};
         marker.vertex_id = this.map_state.vertices.length;
			marker.setIcon(DEFAULT_ICON);

         this.map_state.vertices.push( vertex );
         this.overlay.draw();

         GoogleMaps.event.addListener(marker, 'drag', _.bind( this.handleMarkerDragged, this, marker ));
         GoogleMaps.event.addListener(marker, 'click', _.bind( this.handle_marker_clicked, this, marker ));

			// during dragging, need to be able to see the google map under the pacman map to position points
			// property:
			GoogleMaps.event.addListener(marker, 'dragstart', _.bind( this.overlay.makeTransluent, this.overlay ));
			GoogleMaps.event.addListener(marker, 'dragend', _.bind( this.overlay.makeSolid, this.overlay ));
      }
	};

	MapEditor.prototype.handleMarkerDragged = function( marker, event ) {
		var vertex = marker.pacman.map_vertex;

      // de-select any maker that could have come from click being fired
      // before the drag
      this._selected_marker = null;
      marker.setAnimation(null);

		vertex.long = event.latLng.lng();
		vertex.lat = event.latLng.lat();

		this.overlay.draw();
	};

   MapEditor.prototype.handle_marker_clicked = function(marker, event) {
      var sm = this._selected_marker;

      if (sm) {
         this.deselect();

         // remove the vertex if the user has selected the same marker twice 
         // otherwise add/remove an edge between the two selected vertices
         if (sm === marker) {
            this.remove_vertex(marker.vertex_id);
            marker.setVisible(false);
         } else {
            var sv = sm.vertex_id, mv = marker.vertex_id;
            
            // in order to check if we are adding or removing an edge we will need
            // to iterate over the array so we may as well attempt to remove an edge
            // now and use the lengths of the two arrays to dictate where we should
            // have removed or not
            var edges = this.map_state.edges.filter(function(e) {
					return (e.a !== sv && e.b !== mv) || (e.a !== mv && e.b !== sv);
				});

            if (edges.length === this.map_state.edges.length) this.map_state.edges.push({ a: sv, b: mv });
            else this.map_state.edges = edges;
         }
      } else {
         this.select_marker(marker);
      }

		this.overlay.draw();
   };

   MapEditor.prototype.select_marker = function(marker) {
      // start bouncing to indicate selectedness
      marker.setAnimation(google.maps.Animation.BOUNCE);
		marker.setIcon(SELECTED_ICON);
      this._selected_marker = marker;
   };

   MapEditor.prototype.deselect = function() {
		this._selected_marker.setIcon(DEFAULT_ICON);

      // halt the bouncing animation as we are finishing the action
      this._selected_marker.setAnimation(null);
      this._selected_marker = null;
   };

   MapEditor.prototype.remove_vertex = function (id) {
      this.map_state.vertices.splice(id, 1);
      this.map_state.edges = _(this.map_state.edges).filter(
         function(edge) {
            return edge.a !== id && edge.b !== id;
         });

      _(this.map_state.edges).each(function(edge) {
         edge.a = (edge.a > id) ? (edge.a - 1) : edge.a;
         edge.b = (edge.b > id) ? (edge.b - 1) : edge.b;
      });
   };

/* returns the map data in a form that the renderer and/or db would understand it */
	MapEditor.prototype.get_map_data = function() {

		var pacman_home_id = $('#pacman_home').val(),
			 ghost_home_id = $('#ghost_home').val();

		var pacman_home = this.map_state.vertices[(pacman_home_id === '') ? null : +pacman_home_id],
			 ghost_home = this.map_state.vertices[(ghost_home_id === '') ? null : +ghost_home_id];

		return {
			id: $('#name').val(),
			vertices: this.map_state.vertices,
			edges: this.map_state.edges,
			pacman_home: pacman_home,
			ghost_home: ghost_home
		}
	};

	MapEditor.prototype._handle_click_create = function(evt) {

		var map_state = this.get_map_data();

		if (!map_state.pacman_home) { alert('Please enter a vertex id to use as the pacman home'); }
		else if (!map_state.ghost_home) { alert('Please enter a vertex id to use as the ghosts\' home'); }
		else {
			$.ajax('/api/map/create', {
				type: 'POST',
				dataType: 'json',
				data: map_state,
				success: function(data) {
					if (!data.error) {
						window.location = window.location.protocol + '//' + window.location.host + '/';
					}
					else {
						alert('error creating map'); console.log(data.error);
					}
				}
			});
		}

		evt.preventDefault();
	};

	// todo: split out into separate methods
	MapEditor.prototype.init_events = function() {

		var self = this;

		$('#ghost_home').bind('click', function(evt) {
			self.overlay.draw();
		});
		$('#ghost_home').bind('change', function(evt) {
			self.overlay.draw();
		});
	};

	window.MapEditor = MapEditor;

})(google.maps);
