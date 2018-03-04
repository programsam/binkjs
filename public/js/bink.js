var lastOpenMarker = null;

$(document).ready(function() {
	$('a.navbarlink').click(function() {
		$('#navbar').collapse('hide')
	});

	$("a#recentButton").click(loadRecentJams)
	$("a#browseButton").click(loadBrowse)
	$("a#historyButton").click(loadHistoricJams)
	$("a#mapButton").click(loadMap)
	$("a#timelineButton").click(loadTimeline)
	$("a#twitterButton").click(loadTweets)
	$("INPUT#password").keypress(function(event) {
		if (event.keyCode == 13 || event.which == 13) {
				event.preventDefault();
				login();
		}
	})
	$("a#playlistButton").click(function() {
		$("#sidebar-wrapper").collapse('toggle')
	})

	$('body').on('shown.bs.modal', '#adminModal', function () {
	    $('input:visible:enabled:first', this).focus();
	})

	if (location.hash == "#browse") {
		loadBrowse();
	} else if (location.hash == "#history") {
		loadHistoricJams();
	} else if (location.hash == "#playlist") {
		$("#sidebar-wrapper").collapse('toggle')
	} else if (location.hash == "#map") {
		loadMap();
	} else if (location.hash == "#timeline") {
		loadTimeline();
	} else if (location.hash == "#tweets") {
		loadTweets();
	} else if (location.hash.indexOf("#jam-") == 0) {
		var jamid = location.hash.split("-")[1];
		loadJam(jamid);
	} else {
		loadRecentJams();
	}

	loadPlaylist();
	$("#jquery_jplayer_1").jPlayer({
		cssSelectorAncestor : "#jp_container_1",
		swfPath : "/js",
		supplied : "mp3",
		useStateClassSkin : true,
		autoBlur : false,
		smoothPlayBar : true,
		keyEnabled : true,
		remainingDuration : true,
		toggleDuration : true
	});

	$('#sidebar-wrapper').on('hidden.bs.collapse', function() {
		$("#main").css("padding-left", function(paddingleft) {
			return 40;
		});
	})

	$('#sidebar-wrapper').on('shown.bs.collapse', function() {
		$("#main").css("padding-left", function(paddingleft) {
			return 265;
		});
	});

	$("#logoutButton").click(logout);
	$("#loginButton").click(login);
	$("a#adminButton").click(function() {
		$('#password').val('');
		$('#adminModal').modal('show');
	})

	$.get("/admin/loggedin").done(function(data) {
		if (data.admin) {
			showAdmin();
		}
		else {
			hideAdmin();
		}
	}) //get logged in
}) //document.ready

function createNew() {
	$.ajax({
		method : "POST",
		url : "/admin/jam",
		contentType : "application/json"
	}).done(function(msg) {
		var data = JSON.parse(msg)
		console.log(data);
	}).fail(function(jqXHR) { //failure connecting or similar
		binkAlert("Error occurred while creating jam. Error was: " + jqXHR.responseText);
	});
}

function loadBrowse() {
	$('.nav-link.active').removeClass('active');
	$('#browseButton').addClass('active');

	$.get('/views/browse', function(view) {
		$('#main').html(view);
		$.getScript('/js/bootstrapTable.js', function(data, status, jqXhr) {
			$('#jamTable').bootstrapTable({
				columns: [
					{field:'date',
						title:'Date',
						sortable: true,
						order: 'desc',
						formatter: dateFormatter},
					{field:'title',
							title:'Title',
						formatter: titleFormatter},
					{field:'location.name',
						title:'Location',
						formatter: locationFormatter},
					{field:'band.name',
						title:'Band',
						formatter: bandFormatter},
					{field:'hasTracks',
						title:'Tracks',
						formatter: hasTracksFormatter},
					{field:'hasPics',
						title:'Pics',
						formatter: hasPicsFormatter},
					{field:'hasVids',
						title:'Vids',
						formatter: hasVidsFormatter},
					{field:'private',
						title:'Private',
						formatter: privateFormatter}
				],
				url: '/api/search',
				sidePagination: 'server',
				pagination: true,
				search: true,
				showRefresh: true,
				showColumns: true,
				pageList: [5,10,20,50,100],
				sortOrder: 'desc',
				icons: {
					refresh: 'fas fa-sync',
					columns: 'fas fa-columns'
				}
			});
		})
	})
}

function privateFormatter(value, row) {
	if (row.private) {
		return '<i class="fas fa-key"></i>';
	} else {
		return '-';
	}
}

function locationFormatter(value, row) {
	if (row.location) {
		return `<a href="javascript:loadLocation(${row.location.id})">${value}</a>`;
	} else {
		return '-'
	}
}

function bandFormatter(value, row) {
	if (row.band) {
		return `<a href="javascript:loadBand(${row.band.id})">${value}</a>`;
	} else {
		return '-';
	}
}

function titleFormatter(value, row) {
	return `<a href="javascript:loadJam(${row.id})">${value}</a>`;
}

function dateFormatter(value) {
	let d = new Date(value);
	return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
}

function hasTracksFormatter(value) {
	if (value === true) {
    return '<i class="fas fa-music"></i>';
  } else {
		return '';
	}
  return value;
}

function hasPicsFormatter(value) {
	if (value === true) {
    return '<i class="fas fa-camera"></i>';
  } else {
		return '';
	}
  return value;
}

function hasVidsFormatter(value) {
	if (value === true) {
    return '<i class="fas fa-video"></i>';
  } else {
		return '';
	}
  return value;
}

function showAdmin()
{
	$.get('/views/admin/dropdown', function(view) {
		$('#adminItem').addClass('dropdown');
		$('#adminItem').html(view);
		$("#logoutButton").click(logout);
		$('#newButton').click(createNew);
	})
}

function hideAdmin()
{
	$('#adminItem').removeClass('dropdown');
	var html = "";
	html += '<a class="nav-link linkish" id="adminButton">Admin</a>';
	$('#adminItem').html(html);
	$('#modalAlert').html('');

	$("a#adminButton").click(function() {
		$('#password').val('');
		$('#adminModal').modal('show');
	})
}

function logout()
{
	$.ajax({
		method : "PUT",
		url : "/admin/logout"
	}).done(function(msg) {
		hideAdmin();
		loadRecentJams();
	});
}

function login() {
	var sendThem = {
		password : $("#password").val()
	}

	$.ajax({
		method : "POST",
		url : "/admin/login",
		contentType : "application/json",
		data : JSON.stringify(sendThem)
	}).done(function(msg) {
		var data = JSON.parse(msg)
		if (data.valid) {
			$('#adminModal').modal('hide');
			showAdmin();
			loadRecentJams();
		} else // invalid password
		{
			loginAlert("Failed to authenticate. Incorrect password.");
			$('#password').val('');
			$('#password').focus();
		}
	}).fail(function(jqXHR) { //failure connecting or similar
		loginAlert("Error occurred while logging in. Error was: " + jqXHR.responseText);
		$('#password').val('');
		$('#password').focus();
	});
}

function loginAlert(message) {
	$.get('/views/loginAlert', function(view) {
		$('#modalAlert').append(view);
		$('#messageHolder').html(message);
	})
}

function enqueue(setTitle, setPath) {
	var object = {
		title : setTitle,
		path : setPath
	}
	$("#the-playlist")
			.append(
					"<li><a>"
							+ "<button type='button' class='btn btn-default btn-xs' aria-label='Play Button'>"
							+ "<span onclick=\"play('"
							+ object.title
							+ "', '"
							+ object.path
							+ "')\"' "
							+ "class='oi oi-media-play' aria-hidden='true'></span>"
							+ "</button> " + object.title + "</a></li>")
	$.ajax({
		type : "PUT",
		url : "/api/playlist",
		contentType : "application/json",
		data : JSON.stringify(object),
	}).done(function(data) {
		console.log("Got updated playlist data: " + data)
	})
}

var months = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep",
		"Oct", "Nov", "Dec" ]
function loadTweets() {
	$('.nav-link.active').removeClass('active');
	$('#twitterButton').addClass('active');
	$.get("/api/tweets", function(data) {
		var html = ""
		for (var i = 0; i < data.length; i++) {
			var d = new Date(data[i].created_at)
			html += "<img src='" + data[i].user.profile_image_url
					+ "' style='float: left; margin-right: 10px' /><strong>"
					+ data[i].user.name + "</strong>&nbsp;&nbsp;"
			html += "<font color='gray'>@" + data[i].user.screen_name
					+ "</font> &middot; " + d.getDate() + " "
					+ months[d.getMonth()] + " " + d.getFullYear() + "<br />"
			html += data[i].text + "<hr />"
		}
		$("#main").html(html)
	})
}

function loadTimeline() {
	$('.nav-link.active').removeClass('active');
	$('#timelineButton').addClass('active');
	$("#main").addClass('timeline')
	$('#main').html('Loading...')
	$.get("/api/timelineData", function(data) {
		// DOM element where the Timeline will be attached
		var container = document.getElementById('main');

		// Configuration for the Timeline
		var options = {
			height : "100%",
			width : "100%"
		};

		// Create a Timeline
		$('#main')
				.html('Drag left/right or zoom to manipulate the timeline...')
		var timeline = new vis.Timeline(container, data, options);
		timeline.on('select', function(properties) {
			console.log(properties.items)
			loadJam(properties.items[0])
		})
	})
}

function loadPlaylist() {
	$
			.get(
					"/api/playlist",
					function(data) {
						var html = "";
						if (data && typeof data != "undefined") {
							var array = JSON.parse(data)
							array
									.forEach(function(element, index, array) {
										$("#the-playlist")
												.append(
														"<li><a>"
																+ "<button type='button' class='btn btn-default btn-xs' aria-label='Play Button'>"
																+ "<span onclick=\"play('"
																+ element.title
																+ "', '"
																+ element.path
																+ "')\"' "
																+ "class='oi oi-media-play' aria-hidden='true'></span>"
																+ "</button> "
																+ element.title
																+ "</a></li>")
									})
						}

					})
}

function play(setTitle, path) {
	console.log("Title: " + setTitle)
	console.log("Path: " + path)
	$("#jquery_jplayer_1").jPlayer("setMedia", {
		title : setTitle,
		mp3 : path
	});
	$("#jquery_jplayer_1").jPlayer("play")
}

function recentCallback(data) {
	$.get('/views/recent', function(view) {
		$('#main').html(view);
	})
}

function historicCallback(data) {
	var html = "<h1>Today in BINK! History</h1>";
	var data = JSON.parse(data);
	if (data.length > 0) {
		renderBlogJams(html, data)
	} else {
		html += "<em>There were no collections that happened today in previous years.</em>"
		$("#main").html(html)
	}
}

function loadBand(id) {
	$('.nav-link.active').removeClass('active');
	$.get("/api/entity/bands/" + id, function(data) {
		var html = "<h1>Band: " + data.name + "</h1>"
		if (data.link != null && data.link.indexOf("http") == 0) {
			html += "Website: <a target='_blank' href='" + data.link + "'>"
					+ data.link + "</a>"
		}
		html += "<hr />Appears on collections: <ul>"
		for (var j = 0; j < data.jams.length; j++) {
			html += "<li><a href='javascript:loadJam(" + data.jams[j].id
					+ ")'>" + data.jams[j].title + "</a></li>"
		}
		html += "</ul>"
		$("#main").html(html)
	})
}

function loadMusician(id) {
	$('.nav-link.active').removeClass('active');
	$.get("/api/entity/musicians/" + id, function(data) {
		var html = "<h1>Musician: " + data.name + "</h1>"
		if (data.link != null && data.link.indexOf("http") == 0) {
			html += "Website: <a target='_blank' href='" + data.link + "'>"
					+ data.link + "</a>"
		}
		html += "<hr />Appears on collections: <ul>"
		for (var j = 0; j < data.jams.length; j++) {
			html += "<li><a href='javascript:loadJam(" + data.jams[j].id
					+ ")'>" + data.jams[j].title + "</a></li>"
		}
		html += "</ul>"
		$("#main").html(html)
	})
}

function loadStaff(id) {
	$('.nav-link.active').removeClass('active');
	$.get("/api/entity/staff/" + id, function(data) {
		var html = "<h1>Staff: " + data.name + "</h1>"
		html += "<hr />Appears on collections: <ul>"
		for (var j = 0; j < data.jams.length; j++) {
			html += "<li><a href='javascript:loadJam(" + data.jams[j].id
					+ ")'>" + data.jams[j].title + "</a></li>"
		}
		html += "</ul>"
		$("#main").html(html)
	})
}

function loadLocation(id) {
	$('.nav-link.active').removeClass('active');
	$
			.get(
					"/api/entity/locations/" + id,
					function(data) {
						var html = "<h1>Location: " + data.name + "</h1>"
						if (data.link != null && data.link.indexOf("http") == 0) {
							html += "Website: <a target='_blank' href='"
									+ data.link + "'>" + data.link + "</a>"
						}
						var hasMap = false
						if (data.lat != null && data.lon != null) {
							hasMap = true
							html += "<div id='map-canvas' style='width: 100%; height: 100%'></div>"
						}
						html += "<hr />Collections at this location: <ul>"
						for (var j = 0; j < data.jams.length; j++) {
							html += "<li><a href='javascript:loadJam("
									+ data.jams[j].id + ")'>"
									+ data.jams[j].title + "</a></li>"
						}
						html += "</ul>"
						$("#main").html(html)
						if (hasMap) {
							var coordinates = new google.maps.LatLng(
									parseFloat(data.lat), parseFloat(data.lon));
							var mapOptions = {
								center : coordinates,
								zoom : 9
							}
							var map = new google.maps.Map(document
									.getElementById('map-canvas'), mapOptions);
							var marker = new google.maps.Marker({
								position : coordinates,
								map : map,
								title : data.name
							});
						}
					})
}

function loadRecentJams() {
	$('.nav-link.active').removeClass('active');
	$('#recentButton').addClass('active');
	$("#main").html("Loading...")
	$.get("/api/recent", recentCallback).fail(function() {
		binkAlert("Problem", "Could not load recent jams.")
	})
}

function binkAlert(title, alert) {
	$("#thisAlert").html(alert)
	$("#thisAlertTitle").html(title)
	$("#alertModal").modal('show')
}

function loadHistoricJams() {
	$('.nav-link.active').removeClass('active');
	$('#historyButton').addClass('active');
	$("#main").html("Loading...")
	$.get("/views/history", function(view) {
		$('#main').html(view);
	});
}

function loadMap() {
	loadMapsAPI(function() {
		var coordinates = new google.maps.LatLng(39.944465, -97.350595);
		var mapOptions = {
			center : coordinates,
			zoom : 5
		}
		$('#main').html('<div class="position-absolute w-100 h-100" id="map-canvas"></div>');
		var map = new google.maps.Map($("#map-canvas")[0], mapOptions);
		$.get("/api/mapdata", function(data) {
			$('.nav-link.active').removeClass('active');
			$('#mapButton').addClass('active');

			for (var j = 0; j < data.length; j++) {
				var coordinates = new google.maps.LatLng(parseFloat(data[j].lat),
						parseFloat(data[j].lon));
				var content = data[j].name
				if (null != data[j].jams) {
					content += "<hr />"
					for (var k = 0; k < data[j].jams.length; k++) {
						content += "<a href='javascript:loadJam("
								+ data[j].jams[k].id + ")'>"
								+ data[j].jams[k].title + "</a>"
						if (k != data[j].jams.length - 1)
							content += ", "
					}
				}
				dropMarker(coordinates, data[j].name, content, map)
			}
		})
	})
}

function dropMarker(coordinates, name, content, map) {
	var thismarker = new google.maps.Marker({
		position : coordinates,
		map : map,
		title : name
	});
	var thiswindow = new google.maps.InfoWindow({
		content : content
	})
	google.maps.event.addListener(thismarker, 'click', function() {
		if (lastOpenMarker != null)
			lastOpenMarker.close()
		thiswindow.open(map, thismarker);
		lastOpenMarker = thiswindow
	});
}

function loadJam(id) {
	location.hash = "jam-" + id;
	$('.nav-link.active').removeClass('active');
	$.get(`/views/jam/${id}`, function(view) {
		$('#main').html(view);
		$.get(`/api/jam/${id}/location`, function(loc) {
			loadMapsAPI(function() {
				mapLocation(loc);
			})
		})
	})
}

function loadMapsAPI(callback) {
	$.get("/api/maps/key", function(data) {
		$.getScript(`https://maps.googleapis.com/maps/api/js?key=${data}`,
			function(script, textStatus, jqXhr) {
				callback();
		})
	})
}

function mapLocation(loc) {
	var coordinates = new google.maps.LatLng(parseFloat(loc.lat),
			parseFloat(loc.lon));
	var mapOptions = {
		center : coordinates,
		zoom : 9
	}
	var map = new google.maps.Map($('#map-canvas')[0],
			mapOptions);
	var marker = new google.maps.Marker({
		position : coordinates,
		map : map,
		title : location.name
	});
}
