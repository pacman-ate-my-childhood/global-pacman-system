(function(GoogleMaps){

	function MapEditor(){
		this.map_state =
			{	edges:[]
			,	vertices:[]
			};

		this.create_google_map();
		this.init_events();
	}

	MapEditor.prototype.map_state = null;
	MapEditor.prototype.overlay = null;

	MapEditor.prototype.create_google_map = function() {
		var 	jMap = $('#map'),
					latlng = new GoogleMaps.LatLng(51.504469, -0.136986),
					map = new GoogleMaps.Map(document.getElementById('map'), { zoom: 8, center: latlng, mapTypeId: GoogleMaps.MapTypeId.ROADMAP }),
					// crate a new canvas the same size as the map and insert it using an ELabel:
					w = jMap.width(),
					h = jMap.height();

		var swBound = new google.maps.LatLng(51.491645, -0.149689);
		var neBound = new google.maps.LatLng(51.513871, -0.104370);
		var bounds = new google.maps.LatLngBounds(swBound, neBound);

		this.overlay = new PacmanMapOverlay(map, _.bind(this.get_map_data, this));

		GoogleMaps.event.addListener(map, 'click', function(event) {
				new GoogleMaps.Marker({ position: event.latLng, map: map });
				$('#lat').val(event.latLng.lat());
				$('#long').val(event.latLng.lng());
			});
	};

	MapEditor.prototype.populate_lists = function() {
		$('#vertices').empty();

		_.each(this.map_state.vertices, function(vertex, key) {
			if (vertex) $('#vertices').append($('<option value="' + key + '">[' + key + '] Long:' + vertex.long + ' Lat:' + vertex.lat + '</option>'));
		});

		$('#edges').empty();

		_.each(this.map_state.edges, function(edge, key) {
			$('#edges').append($('<option value="' + key + '">' + edge.a + ' <-> ' + edge.b + '</option>'));
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

	// todo: split out into separate methods
	MapEditor.prototype.init_events = function() {

		var self = this;

		$('#add').bind('click', function(evt) {
			var long = $('#long').val(),
				 lat = $('#lat').val();

			$('#long').val('');
			$('#lat').val('');

			self.map_state.vertices.push({long: +long, lat: +lat});
			self.populate_lists();
			self.overlay.draw();
			evt.preventDefault();
		});

		$('#join').bind('click', function(evt) {
			var vertices = $('#vertices').val();

			if (vertices && vertices.length && vertices.length === 2) {
				self.map_state.edges.push({ a: +vertices[0], b: +vertices[1] });
				self.populate_lists();
			} else {
				alert('incorrect number of vertices selected, must be 2');
			}

			self.overlay.draw();
			evt.preventDefault();
		});

		$('#remove_vertices').bind('click', function(evt) {
			var vs = $('#vertices').val(),
				 num_removed = 0;

			function remove_vertex(id) {
				id = +id - num_removed;
				self.map_state.vertices.splice(id, 1);
				self.map_state.edges = _(self.map_state.edges).filter(
					function(edge) {
						return edge.a !== id && edge.b !== id;
					});

				_(self.map_state.edges).each(function(edge) {
					edge.a = (edge.a > id) ? (edge.a - 1) : edge.a;
					edge.b = (edge.b > id) ? (edge.b - 1) : edge.b;
				});
				num_removed++;
			}

			if (vs) {
				if (vs.length) { vs.sort(function(a,b) { return a - b; }); _.each(vs, remove_vertex); }
				else { remove_vertex(+vs); }

				self.populate_lists();
			}

			self.overlay.draw();
			evt.preventDefault();
		});

		$('#remove_edges').bind('click', function(evt) {
			var edges_selected = $('#edges').val();

			if (edges_selected) {
				if (edges_selected.length) {
					for (var i = 0, len = edges_selected.length; i < len; i++) {
						self.map_state.edges.splice(+edges_selected[i], 1);
					}
				} else {
					self.map_state.edges.splice(+edges_selected, 1);
				}

				self.populate_lists();
			}

			self.overlay.draw();
			evt.preventDefault();
		});

		$('#ghost_home').bind('click', function(evt) {
			self.overlay.draw();
		});
		$('#ghost_home').bind('change', function(evt) {
			self.overlay.draw();
		});

		$('#create').bind('click', function(evt) {

			var map_state = this.get_map_data();


			if (!map_state.pacman_home) { alert('Please enter a vertex id to use as pacmans home'); }
			else if (!map_state.ghost_home) { alert('Please enter a vertex id to use as the ghosts home'); }
			else {
				$.ajax('/api/map/create', {
					type: 'POST',
					dataType: 'json',
					data: map_state,
					success: function(data) {
						if (!data.error) {
							window.location = window.location.protocol + '//' + window.location.host + '/create_game';
						}
						else {
							alert('error creating map'); console.log(data.error);
						}
					}
				});
			}

			evt.preventDefault();
		});
	};

	window.MapEditor = MapEditor;

})(google.maps);