var lastOpenMarker = null;

$(document).ready(function(){
   $("a#recentButton").click(loadRecentJams)
   $("a#browseButton").click(function() { 
	   browse(10, 0);
   })
   $("a#historyButton").click(loadHistoricJams)
   $("a#mapButton").click(loadMap)
   $("a#timelineButton").click(loadTimeline)

   loadRecentJams()
   loadPlaylist()
   
  $("#jquery_jplayer_1").jPlayer({
    cssSelectorAncestor: "#jp_container_1",
    swfPath: "/js",
    supplied: "mp3",
    useStateClassSkin: true,
    autoBlur: false,
    smoothPlayBar: true,
    keyEnabled: true,
    remainingDuration: true,
    toggleDuration: true
  });
  
$('#sidebar-wrapper').on('hidden.bs.collapse', function () {
	$( "#main" ).css( "padding-left", function( paddingleft ) {
  		return 40;
	});
})

$('#sidebar-wrapper').on('shown.bs.collapse', function () {
  	$( "#main" ).css( "padding-left", function( paddingleft ) {
  		return 265;
	});
})
  
  $("#playlistButton").click( function () {
  	$("#sidebar-wrapper").collapse('toggle')
  })
  
})

function enqueue(setTitle, setPath)
{
	var object = { title: setTitle, path: setPath }
	$("#the-playlist").append("<li><a>" + 
								"<button type='button' class='btn btn-default btn-xs' aria-label='Play Button'>" +
	  							"<span onclick=\"play('" + object.title + "', '" + object.path + "')\"' " + 
	  							"class='glyphicon glyphicon-play' aria-hidden='true'></span>" +
								"</button> " + object.title + "</a></li>"
								)
	$.ajax({
	    type: "PUT",
	    url: "/playlist",
	    contentType: "application/json",
	    data: JSON.stringify(object),
	}).done(
		function( data ) {
			console.log("Got updated playlist data: " + data)	
	})
}

function loadTimeline() {
	clearClasses()
	$("#main").addClass('timeline')
	$('#main').html('Loading...')
	$.get("/timelineData", function (data) {
		console.log(data)
		  // DOM element where the Timeline will be attached
		  var container = document.getElementById('main');

		  // Configuration for the Timeline
		  var options = {
				  height: "100%",
				  width: "100%"
		  };

		  // Create a Timeline
		  $('#main').html('Drag left/right or zoom to manipulate the timeline...')
		  var timeline = new vis.Timeline(container, data, options);
		  timeline.on('select', function(properties) {
			  console.log(properties.items)
			  loadJam(properties.items[0])
		  })
	})
}

function loadPlaylist()
{
	$.get( "/playlist", function( data ) {
		var html = "";
		if (data && typeof data != "undefined")
		{
			var array = JSON.parse(data)
			array.forEach(function(element,index,array) {
				$("#the-playlist").append("<li><a>" + 
						"<button type='button' class='btn btn-default btn-xs' aria-label='Play Button'>" +
							"<span onclick=\"play('" + element.title + "', '" + element.path + "')\"' " + 
							"class='glyphicon glyphicon-play' aria-hidden='true'></span>" +
						"</button> " + element.title + "</a></li>"
				 )	
			})
		}
		
	})
}

function play(setTitle, path)
{
	console.log("Title: " + setTitle)
	console.log("Path: " + path)
	$("#jquery_jplayer_1").jPlayer("setMedia", {
	        title: setTitle,
	        mp3: path
	  });
	$("#jquery_jplayer_1").jPlayer("play")
}

function recentCallback(data) {
	var html = "";
	renderBlogJams(html, data)
  	$("#main").jscroll({debug:true})
}

function historicCallback(data) {
	var html = "<h1>Today in BINK! History</h1>";
	renderBlogJams(html, data)
  	$("#main").jscroll({debug:true})
}

function renderBlogJams(html, data) {
	data.forEach(function (thisjam, index, array) {
		var d = new Date(thisjam.date)
		var mydate = (d.getMonth()+1) + "/" + d.getDate() + "/" + d.getFullYear()
		html += "<div class='panel panel-default'>"
		html += "<div class='panel-heading'>" + mydate + 
		" - <a href='javascript:loadJam(" + thisjam.id + ")'>" + thisjam.title + "</a>"
		html += "<div class='pull-right'>"
		if (thisjam.hasOwnProperty("band"))
		{
			html += thisjam.band.name
		}
		if (thisjam.hasOwnProperty("band") && thisjam.hasOwnProperty("location"))
		{
			html += " at "
		}
		if (thisjam.hasOwnProperty("location"))
		{
			html += thisjam.location.name
		}
	html += "</div>"
	html += "</div>"
		html += "<div class='panel-body'>"
	if (thisjam.hasOwnProperty("notes") && thisjam.notes != "")
	{
		html += "<p>" + thisjam.notes + "</p>"
	}
	if (thisjam.hasOwnProperty("defpic") && thisjam.defpic != null && thisjam.defpic != -1)
	{
		html += "<p><img width='200px' src='" + thisjam.defpic.path + "'></p>"
	}
		html += "<p class='pull-right'><button onclick='loadJam(" + thisjam.id + ")' type='button' class='btn btn-default' aria-label='Load this Jam'><span class='glyphicon glyphicon-folder-open' aria-hidden='true'></span></button></p>"
		html += "</div>"
		html += "</div>"
	})
	$("#main").html(html)
}

function loadRecentJams()
{
	clearClasses()
	$("#main").html("Loading...")
	$.get( "/recent", recentCallback)
	.fail(function()
	{
		alert('Encountered a problem.')
	})
}

function loadHistoricJams()
{
	clearClasses()
	$("#main").html("Loading...")
	$.get( "/history", historicCallback)
	.fail(function()
	{
		alert('Encountered a problem.')
	})
}

function getBrowseResults(size, page)
{
	if (size == null || size < 3)
		size = 10
	if (page == null)
		page = 0
		
	$.get("/browse/" + size + "/" + page, browseCallback)
	.fail(function()
	{
		alert('Encountered a problem.')
	})	
}

var nums = [3, 5, 10, 25, 50, 100]

function browse(size, page)
{
	clearClasses()
	getBrowseResults(size, page)
	$.get("/total/jams", function(data) {
		var html = ""
		html += "<div id='pages'></div>"
	  	

	    html += "<div class='panel'><div class='btn-group' data-toggle='buttons'>"
	    for (var j=0;j<nums.length;j++)
	    {
	    	html += "<label class='btn btn-primary' id='num" + nums[j] + 
	    		"' onclick=\"getBrowseResults(" + nums[j] + ", " + page + ")\">" 
		    html += "<input type='radio' autocomplete='off'> " + nums[j]
		    html += "</label>"
	    }
	    
	    html += "</div></div>"
	    html += "<div id='results'></div>"
	  	
	  	$("#main").html(html)
	}).fail(function()
	{
		alert('Encountered a problem.')
	})
}

function genPages(size, page, total) {
	var pageCount = (total / size) - 1
	var html = "<ul class='pagination'>"
	if (page == 0)
	{
		html += "<li class='disabled'><a href='#' aria-label='Previous'><span aria-hidden='true'>&laquo;</span></a></li>"
	}
	else
	{
  		html += "<li>"
  			html += "<a href=\"javascript:getBrowseResults(" + size + "," + (page - 1) + ")\" aria-label='Previous'>" +
  					"<span aria-hidden='true'>&laquo;</span>" +
  					"</a>"
  		html += "</li>"
	}
  	
  	for (var j=0;j<pageCount;j++)
  	{
			html += "<li id='page" + j + "'><a href=\"javascript:getBrowseResults(" + size + "," + j + ")\">" + (j+1) + "</a></li>"
  	}
  	
  	if (page >= (pageCount-1))
	{
		html += "<li class='disabled'><a href='#' aria-label='Next'><span aria-hidden='true'>&raquo;</span></a></li>"
	}
  	else
  	{
	  	html += "<li>"
	  		html += "<a href=\"javascript:getBrowseResults(" + size + "," + (page + 1) + ")\" aria-label='Next'>" +
	  				"<span aria-hidden='true'>&raquo;</span>" + 
	  				"</a>"
	  	html += "</li>"
  	}
	 html += "</ul>"
     html += "</nav>"
    $("#pages").html(html)
    for (var j=0;j<pageCount;j++)
	{
		$("#page" + j).removeClass("active")
	}
	$("#page" + page).addClass("active")
}

function browseCallback( data ) {
	
	var html = "<table class='table table-bordered'>";
	html += "<tr>"
	html += "<th><span style='cursor: pointer' class='glyphicon glyphicon-folder-open' aria-hidden='true'></span></th>"
	html += "<th>Date</th><th>Title</th><th>Band</th><th>Location</th>"
	html += "<th><span class='glyphicon glyphicon-music' aria-hidden='true'></span></th>"
	html += "<th><span class='glyphicon glyphicon-picture' aria-hidden='true'></span></th>"
	html += "<th><span class='glyphicon glyphicon-facetime-video' aria-hidden='true'></span></th>"
	html += "</tr>"
	data.results.forEach(function (thisjam, index, array) {
  			var d = new Date(thisjam.date)
  			var mydate = (d.getMonth()+1) + "/" + d.getDate() + "/" + d.getFullYear()
			html += "<tr>"
			
			html += "<td><span onclick='loadJam(" + thisjam.id + ")' style='cursor: pointer' class='glyphicon glyphicon-folder-open'" +
					" aria-hidden='true'></span></td>"
			
			html += "<td>" + mydate + "</td>"
			html += "<td><a href='javascript:loadJam(" + thisjam.id + ")'>" + thisjam.title + "</a></td>"

			if (thisjam.hasOwnProperty("band"))
			{
				html += "<td>" + thisjam.band.name + "</td>"
			}
			else
			{
				html += "<td></td>"
			}

			if (thisjam.hasOwnProperty("location"))
			{
				html += "<td>" + thisjam.location.name + "</td>"
			}
			else
			{
				html += "<td></td>"
			}

			if (thisjam.hasTracks)
			{
				html += "<td><span class='glyphicon glyphicon-music' aria-hidden='true'></td>"
			}
			else
			{
				html += "<td></td>"
			}
			
			if (thisjam.hasPics)
			{
				html += "<td><span class='glyphicon glyphicon-picture' aria-hidden='true'></td>"
			}
			else
			{
				html += "<td></td>"
			}
			
			if (thisjam.hasVids)
			{
				html += "<td><span class='glyphicon glyphicon-facetime-video' aria-hidden='true'></td>"
			}
			else
			{
				html += "<td></td>"
			}
  		})
  	html += "</table>"

  	$("#results").html(html)
  	for (var j=0;j<nums.length;j++)
	{
		$("#num" + nums[j]).removeClass("active")
	}
	$("#num" + data.size).addClass("active")
	
	genPages(data.size, data.page, data.total)
}

function clearClasses()
{
	$("#main").removeClass('mapviewer')
	$("#main").removeClass('timeline')
	$("#main")[0].style.removeProperty("background-color")
}

function loadMap()
{
	$.get("/mapdata", function(data) {
		$('#main').addClass('mapviewer')
		var coordinates = new google.maps.LatLng(39.944465, -97.350595);
		var mapOptions = {
				center: coordinates,
				zoom: 5
		}
		var map = new google.maps.Map($("#main")[0], mapOptions);
		for (var j=0;j<data.length;j++)
		{
			var coordinates = new google.maps.LatLng(parseFloat(data[j].lat), parseFloat(data[j].lon));
			var content = data[j].name
			if (null != data[j].jams)
			{
				content += "<hr />"
				for (var k=0;k<data[j].jams.length;k++)
				{
					content += "<a href='javascript:loadJam(" + data[j].jams[k].id + ")'>" 
						+ data[j].jams[k].title + "</a>"
					if (k != data[j].jams.length-1)
						content += ", "
				}
			}
			dropMarker(coordinates, data[j].name, content, map)
		}
	})
}

function dropMarker(coordinates, name, content, map) {
	var thismarker = new google.maps.Marker({
	      position: coordinates,
	      map: map,
	      title: name
	  });
	var thiswindow = new google.maps.InfoWindow({
	      content: content
	  })
	google.maps.event.addListener(thismarker, 'click', function() {
		    if (lastOpenMarker != null)
		    	lastOpenMarker.close()
		    thiswindow.open(map,thismarker);
		    lastOpenMarker = thiswindow
	});
}

function loadJam(id)
{
	clearClasses()
	$.get( "/jam/" + id, function( thisjam ) {
		console.log(thisjam)
		var html = "";
		var d = new Date(thisjam.date)
		var mydate = (d.getMonth()+1) + "/" + d.getDate() + "/" + d.getFullYear()
		html += "<h3>" + mydate + " - " + thisjam.title + "</h3>"
		html += "<h4>"
		if (thisjam.hasOwnProperty("band"))
		{
			html += thisjam.band.name
		}
		if (thisjam.hasOwnProperty("band") && thisjam.hasOwnProperty("location"))
		{
			html += " at "
		}
		if (thisjam.hasOwnProperty("location"))
		{
			html += thisjam.location.name
		}
		html += "</h4>"
		var hasMap = false;
		if (thisjam.hasOwnProperty("location") && thisjam.location.lat != null && thisjam.location.lon != null)
		{
			html += "<div class='panel panel-default'><div class='panel-heading'>Location</div>"
			html += "<div id='map-canvas' style='width: 100%; height: 300px'></div>"
			html += "</div>"
			hasMap = true
		}
		if (thisjam.hasOwnProperty("notes") && thisjam.notes != "")
		{
			html += "<div class='panel panel-default'><div class='panel-heading'>Notes</div>"
			html += "<div class='panel-body'>" + thisjam.notes + "</div>"
			html += "</div>"
		}
		if (thisjam.hasOwnProperty("musicians") && thisjam.musicians.length != 0)
		{
			html += "<div class='panel panel-default'><div class='panel-heading'>Musicians</div>"
			html += "<ul class='list-group'>"
			thisjam.musicians.forEach(function (musician, mi, ma) {
				html += "<li class='list-group-item'>" + musician.name + " - "
				musician.instruments.forEach(function (instrument, instindex, instarray) {
					if (instindex == (instarray.length - 1))
					{
						html += instrument
					}
					else
					{
						html += instrument + ", "
					}
				})
				html += "</li>"
			})
			html += "</ul></div>"
		}
		if (thisjam.hasOwnProperty("staff") && thisjam.staff.length != 0)
		{
			html += "<div class='panel panel-default'><div class='panel-heading'>Staff</div>"
			html += "<ul class='list-group'>"
			thisjam.staff.forEach(function (staff, staffi, staffa) {
				html += "<li class='list-group-item'>" + staff.name + " - "
				staff.roles.forEach(function (role, roleindex, rolearray) {
					if (roleindex == (rolearray.length - 1))
					{
						html += role
					}
					else
					{
						html += role + ", "
					}
				})
				html += "</li>"
			})
			html += "</ul></div>"
		}
		if (thisjam.hasOwnProperty("tracks") && thisjam.tracks.length != 0)
		{
			html += "<div class='panel panel-default'><div class='panel-heading'>Music</div>"
			html += "<table class='table table-bordered'>"
			thisjam.tracks.forEach(function (tracks, tracksi, tracksa) {
				if (tracks.title == "--------------------")
				{
					html += "<tr><td colspan='4'>&nbsp</td></tr>"
				}
				else
				{
					html += "<tr>"
					html += "<td width='15px'><span style='cursor: pointer' onclick=\"play('" + tracks.title + "', '" + tracks.path + "')\"  class='glyphicon glyphicon-play-circle' aria-hidden='true'></span></td>"
					html += "<td width='15px'><span style='cursor: pointer' onclick=\"enqueue('" + tracks.title + "', '" + tracks.path + "')\"  class='glyphicon glyphicon-plus' aria-hidden='true'></span></td>"
					
					html += "<td><a href='" + tracks.path + "'>" + tracks.title + "</a></td>"
					if (tracks.notes)
					{
						html += "<td>" + tracks.notes + "</td>"
					}
					html += "</tr>"
				}
			})
			html += "</table></div>"
		}
		if (thisjam.hasOwnProperty("pictures") && thisjam.pictures != null && thisjam.pictures.length != 0)
		{
			html += "<div class='panel panel-default'><div class='panel-heading'>Pictures</div>"
				html += "<div id='carousel-example-generic' class='carousel slide' data-ride='carousel' style='width: 400px'>"
					html += "<ol class='carousel-indicators'>"
					for (var i=0;i<thisjam.pictures.length;i++)
					{
						if (thisjam.pictures[i].id == thisjam.defpic)
						{
							html += "<li data-target='#carousel-example-generic' data-slide-to='" + i + "' class='active'></li>"
						}
						else
						{
							html += "<li data-target='#carousel-example-generic' data-slide-to='" + i + "'></li>"
						}
					}
				html += "</ol>"

			html += "<div class='carousel-inner' role='listbox'>"
			for (var i=0;i<thisjam.pictures.length;i++)
			{
				if (thisjam.pictures[i].id == thisjam.defpic)
				{
					html += "<div class='item active'>"
				}
				else
				{
					html += "<div class='item'>"
				}
				
					html += "<img src='" + thisjam.pictures[i].path + "' width='400px'>"
					html += "<div class='carousel-caption'>"
					html += "</div>"
				html += "</div>"
			}
			html += "</div>"

			html += "<a class='left carousel-control' href='#carousel-example-generic' role='button' data-slide='prev'>"
			html += "<span class='glyphicon glyphicon-chevron-left' aria-hidden='true'></span>"
			html += "<span class='sr-only'>Previous</span>"
			html += "</a>"
			html += "<a class='right carousel-control' href='#carousel-example-generic' role='button' data-slide='next'>"
			html += "<span class='glyphicon glyphicon-chevron-right' aria-hidden='true'></span>"
			html += "<span class='sr-only'>Next</span>"
			html += "</a>"
			html += "</div>"
			html += "</div>"
		}
		if (thisjam.hasOwnProperty("video") && thisjam.video != null && thisjam.video.length != 0)
		{
			html += "<div class='panel panel-default'><div class='panel-heading'>Videos</div>"
			html += "<table class='table table-bordered'>"
			thisjam.video.forEach(function (element, index, array) {
				html += "<tr>"
				html += "<td><a href='" + element.path + "'>" + element.title + "</a></td>"
				if (element.notes)
				{
					html += "<td>" + element.notes + "</td>"
				}
				html += "</tr>"
			})
			html += "</table></div>"
		}
		$("#main").html(html)	
		if (hasMap)
		{
			var coordinates = new google.maps.LatLng(parseFloat(thisjam.location.lat), parseFloat(thisjam.location.lon));
			var mapOptions = {
					center: coordinates,
					zoom: 9
				}
			var map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
			var marker = new google.maps.Marker({
			      position: coordinates,
			      map: map,
			      title: thisjam.location.name
			  });
		}
	});
}
