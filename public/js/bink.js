var lastOpenMarker = null;

$(document).ready(function() {
	$('a.navbarlink').click(function() {
		$('#navbar').collapse('hide')
	});

	$("a#recentButton").click(loadRecentJams)
	$("a#browseButton").click(function() {
		// search(10, 0);
		$('.nav-link.active').removeClass('active');
		$('#browseButton').addClass('active');
		browseJams();
	})
	$("a#historyButton").click(loadHistoricJams)
	$("a#mapButton").click(loadMap)
	$("a#timelineButton").click(loadTimeline)
	$("a#twitterButton").click(loadTweets)
	$("INPUT#search").keypress(function(event) {
		if (event.which == 13) {
			event.preventDefault();
			query = $("input#search")
			$('.nav-link.active').removeClass('active');
			search(10, 0, query.val())
		}
	})
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
		search(10, 0);
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

function browseJams() {
	$.get('/views/browse', function(view) {
		$('#main').html(view);
		$.getScript('https://cdn.jsdelivr.net/npm/bootstrap-table@1.11.2/dist/bootstrap-table.min.js', function(data, status, jqXhr) {
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
						title:'Location'},
					{field:'band.name',
						title:'Band'},
					{field:'hasTracks',
						title:'',
						formatter: hasTracksFormatter},
					{field:'hasPics',
						title:'',
						formatter: hasPicsFormatter},
					{field:'hasVids',
						title:'',
						formatter: hasVidsFormatter}
				],
				url: '/api/search',
				sidePagination: 'server',
				pagination: true,
				sortOrder: 'desc',
				search: true
			});
		})
	})
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
    return '<i class="fa fa-music"></i>';
  } else {
		return '';
	}
  return value;
}

function hasPicsFormatter(value) {
	if (value === true) {
    return '<i class="fa fa-camera"></i>';
  } else {
		return '';
	}
  return value;
}

function hasVidsFormatter(value) {
	if (value === true) {
    return '<i class="fa fa-video"></i>';
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
	clearClasses()
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
	clearClasses()
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
	clearClasses()
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
	clearClasses()
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
	clearClasses()
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
							html += "<div id='map-canvas' style='width: 100%; height: 300px'></div>"
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
	clearClasses()
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
	clearClasses()
	$('.nav-link.active').removeClass('active');
	$('#historyButton').addClass('active');
	$("#main").html("Loading...")
	$.get("/api/history", historicCallback).fail(function() {
		binkAlert("Problem", "Could not load historic jams.")
	})
}



// function getSearchResults(size, page, query) {
// 	if (size == null || size < 3)
// 		size = 10
// 	if (page == null)
// 		page = 0
//
// 	if (null == query) {
// 		$.get("/api/search/" + size + "/" + page, searchCallback).fail(
// 				function() {
// 					binkAlert("Problem", "Failed to browse jams.")
// 				})
// 	} else {
// 		$.get("/api/search/" + size + "/" + page + "/" + query, searchCallback)
// 				.fail(function() {
// 					binkAlert("Problem", "Failed to search jams.")
// 				})
// 	}
// }
//
// var nums = [ 3, 5, 10, 25, 50 ]
// function search(size, page, query) {
// 	clearClasses()
// 	getSearchResults(size, page, query)
// 	var html = ""
// 	html += "<div class=<div class='btn-group mb-3' data-toggle='buttons'>"
//
// 	if (null != query) {
// 		query = query.replace(/"/g, '\\\"')
// 		query = query.replace(/'/g, '\\\'')
// 	}
// 	for (var j = 0; j < nums.length; j++) {
// 		if (query != null) {
// 			html += "<label class='btn btn-primary' id='num" + nums[j]
// 					+ "' onclick=\"javascript:getSearchResults(" + nums[j]
// 					+ ", " + page + ", '" + query + "')\">"
// 		} else {
// 			html += "<label class='btn btn-primary' id='num" + nums[j]
// 					+ "' onclick=\"javascript:getSearchResults(" + nums[j]
// 					+ ", " + page + ")\">"
// 		}
//
// 		html += "<input type='radio' autocomplete='off'> " + nums[j]
// 		html += "</label>"
// 	}
//
// 	html += "</div>"
// 	html += "<nav id='pages' aria-label='Pages'></nav>"
// 	html += "</div></div>"
// 	html += "<div id='results'></div>"
// 	$("#main").html(html)
// }
//
// function genPages(size, page, total, query) {
// 	var pageCount = Math.floor(total / size)
// 	if ((total % size) > 0)
// 		pageCount++
//
// 	var html = "<ul class='pagination d-flex flex-wrap'>"
// 	//If we're on the first page, you cannot go backwards.
// 	if (page == 0) {
// 		html += "<li class='page-item disabled'>";
// 		html += "<a href='#' class='page-link' aria-label='Previous'>";
// 		html += "<span aria-hidden='true'>&laquo;</span></a></li>";
// 	} else { //we are on a different page, so it's enabled
// 		html += "<li class='page-item'>"
// 		if (null != query)  //are we searching or just browsing?
// 			html += "<a class='page-link' href=\"javascript:getSearchResults(" + size + ","
// 					+ (page - 1) + ", '" + query
// 					+ "')\" aria-label='Previous'>"
// 					+ "<span aria-hidden='true'>&laquo;</span>" + "</a>"
// 		else
// 			html += "<a class='page-link' href=\"javascript:getSearchResults(" + size + ","
// 					+ (page - 1) + ")\" aria-label='Previous'>"
// 					+ "<span aria-hidden='true'>&laquo;</span>" + "</a>"
// 		html += "</li>"
// 	}
//
// 	for (var j = 0; j < pageCount; j++) {
// 		if (null != query)
// 			html += "<li class='page-item' id='page" + j
// 					+ "'><a class='page-link' href=\"javascript:getSearchResults(" + size + ","
// 					+ j + ", '" + query + "')\">" + (j + 1) + "</a></li>"
// 		else
// 			html += "<li class='page-item' id='page" + j
// 					+ "'><a class='page-link' href=\"javascript:getSearchResults(" + size + ","
// 					+ j + ")\">" + (j + 1) + "</a></li>"
// 	}
//
// 	if (page >= (pageCount - 1)) {
// 		html += "<li class='disabled page-item'><a href='#' class='page-link' aria-label='Next'><span aria-hidden='true'>&raquo;</span></a></li>"
// 	} else {
// 		html += "<li class='page-item'>"
// 		if (null != query)
// 			html += "<a class='page-link' href=\"javascript:getSearchResults(" + size + ","
// 					+ (page + 1) + ", '" + query + "')\" aria-label='Next'>"
// 					+ "<span aria-hidden='true'>&raquo;</span>" + "</a>"
// 		else
// 			html += "<a class='page-link' href=\"javascript:getSearchResults(" + size + ","
// 					+ (page + 1) + ")\" aria-label='Next'>"
// 					+ "<span aria-hidden='true'>&raquo;</span>" + "</a>"
// 		html += "</li>"
// 	}
// 	html += "</ul>"
// 	html += "</nav>"
// 	$("#pages").html(html)
// 	for (var j = 0; j < pageCount; j++) {
// 		$("#page" + j).removeClass("active")
// 	}
// 	$("#page" + page).addClass("active")
// }
//
// function searchCallback(data) {
// 	if (data.results.length > 0) {
// 		var html = "<table class='table table-bordered'>";
// 		html += "<tr>"
// 		//load
// 			html += "<th><span class='oi oi-folder' aria-hidden='true'></span></th>"
// 			html += "<th>Date</th><th>Title</th><th>Band</th><th>Location</th>"
// 		//music
// 			html += "<th><span class='oi oi-musical-note' aria-hidden='true'></span></th>"
// 		//pictures
// 			html += "<th><span class='oi oi-image' aria-hidden='true'></span></th>"
// 		//images
// 			html += "<th><span class='oi oi-video' aria-hidden='true'></span></th>"
// 		//private
// 			html += "<td><span class='oi oi-key' aria-hidden='true'></span></th>"
// 		html += "</tr>"
// 		data.results
// 				.forEach(function(thisjam, index, array) {
// 					var d = new Date(thisjam.date)
// 					var mydate = (d.getMonth() + 1) + "/" + d.getDate() + "/"
// 							+ d.getFullYear()
// 					html += "<tr>"
//
// 					html += "<td><span onclick='loadJam("
// 							+ thisjam.id
// 							+ ")' class='oi oi-folder linkish'"
// 							+ " aria-hidden='true'></span></td>"
//
// 					html += "<td>" + mydate + "</td>"
// 					html += "<td><a href='javascript:loadJam(" + thisjam.id
// 							+ ")'>" + thisjam.title + "</a></td>"
//
// 					if (thisjam.hasOwnProperty("band")) {
// 						html += "<td><a href='javascript:loadBand("
// 								+ thisjam.band.id + ")'>" + thisjam.band.name
// 								+ "</a></td>"
// 					} else {
// 						html += "<td></td>"
// 					}
//
// 					if (thisjam.hasOwnProperty("location")) {
// 						html += "<td><a href='javascript:loadLocation("
// 								+ thisjam.location.id + ")'>"
// 								+ thisjam.location.name + "</a></td>"
// 					} else {
// 						html += "<td></td>"
// 					}
//
// 					if (thisjam.hasTracks) {
// 						html += "<td><span class='oi oi-musical-note' aria-hidden='true'></td>"
// 					} else {
// 						html += "<td></td>"
// 					}
//
// 					if (thisjam.hasPics) {
// 						html += "<td><span class='oi oi-image' aria-hidden='true'></td>"
// 					} else {
// 						html += "<td></td>"
// 					}
//
// 					if (thisjam.hasVids) {
// 						html += "<td><span class='oi oi-video' aria-hidden='true'></td>"
// 					} else {
// 						html += "<td></td>"
// 					}
//
// 					if (thisjam.private != 0) {
// 						html += "<td><span class='oi oi-key' aria-hidden='true'></span></td>"
// 					} else {
// 						html += "<td></td>"
// 					}
// 				})
// 		html += "</table>"
//
// 		$("#results").html(html)
// 		genPages(data.size, data.page, data.total, data.query)
// 	} else {
// 		$("#results").html(
// 				"<em>There were no collections that match your query</em>")
// 	}
//
// 	for (var j = 0; j < nums.length; j++) {
// 		$("#num" + nums[j]).removeClass("active")
// 	}
// 	$("#num" + data.size).addClass("active")
// }

function clearClasses() {
	$("#main").removeClass('mapviewer')
	$("#main").removeClass('timeline')
	$("#main")[0].style.removeProperty("background-color")
}

function loadMap() {
	$.get("/api/mapdata", function(data) {
		$('.nav-link.active').removeClass('active');
		$('#mapButton').addClass('active');
		$('#main').addClass('mapviewer')
		var coordinates = new google.maps.LatLng(39.944465, -97.350595);
		var mapOptions = {
			center : coordinates,
			zoom : 5
		}
		var map = new google.maps.Map($("#main")[0], mapOptions);
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
	clearClasses();
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
