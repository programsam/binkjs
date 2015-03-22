$(document).ready(function(){
   $("a#recentButton").click(loadRecentJams)
   $("a#browseButton").click(browse)
   //loadRecentJams()
   
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
	$( ".main" ).css( "padding-left", function( paddingleft ) {
  		return 40;
	});
})

$('#sidebar-wrapper').on('shown.bs.collapse', function () {
  	$( ".main" ).css( "padding-left", function( paddingleft ) {
  		return 265;
	});
})
  
  $("#playlistButton").click( function () {
  	$("#sidebar-wrapper").collapse('toggle')
  })

  enqueue("Winters Day", "https://s3.amazonaws.com/binkmedia/public/snd/668/First%20Bounce.mp3")
})

function enqueue(setTitle, setPath)
{
	console.log("Title: " + setTitle)
	console.log("Path: " + setPath)
	var object = { title: setTitle, path: setPath }
	$("#the-playlist").append("<li><a>" + 
					object.title + "</a><span onclick=\"play('" + object.title + "', '" + object.path + "')\"' " +
					"class='glyphicon glyphicon-plus' aria-hidden='true'></span></li>") 
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

function loadPlaylist()
{
	$.get( "/playlist", function( data ) {
		var html = "";
		console.log("Got updated playlist data: " + data)
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

function loadRecentJams()
{
	$.get( "/recent", function( data ) {
		var html = "";
		data.forEach(function (thisjam, index, array) {
  			var d = new Date(thisjam.date)
  			var mydate = (d.getMonth()+1) + "/" + d.getDate() + "/" + d.getFullYear()
  			html += "<div class='panel panel-default'>"
  			html += "<div class='panel-heading'>" + mydate + " - " + thisjam.title
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
  			html += "<p class='pull-right'><button onclick='loadJam(" + thisjam.id + ")' type='button' class='btn btn-default' aria-label='Load this Jam'><span class='glyphicon glyphicon-folder-open' aria-hidden='true'></span></button></p>"
  			html += "</div>"
  			html += "</div>"
	  		})
	  	$(".main").html(html)
	})
	.fail(function()
	{
		alert('Encountered a problem.')
	})
}

function browse()
{
	$.get( "/browse", function( data ) {
		var html = "<table class='table table-bordered'>";
		html += "<tr>"
		html += "<th><span style='cursor: pointer' class='glyphicon glyphicon-folder-open' aria-hidden='true'></span></th>"
		html += "<th>Date</th><th>Title</th><th>Band</th><th>Location</th>"
		html += "<th><span class='glyphicon glyphicon-music' aria-hidden='true'></span></th>"
		html += "<th><span class='glyphicon glyphicon-picture' aria-hidden='true'></span></th>"
		html += "<th><span class='glyphicon glyphicon-facetime-video' aria-hidden='true'></span></th>"
		html += "</tr>"
		data.forEach(function (thisjam, index, array) {
	  			var d = new Date(thisjam.date)
	  			var mydate = (d.getMonth()+1) + "/" + d.getDate() + "/" + d.getFullYear()
				html += "<tr>"
				
				html += "<td><span onclick='loadJam(" + thisjam.id + ")' class='glyphicon glyphicon-folder-open' aria-hidden='true'></span></td>"
				
				html += "<td>" + mydate + "</td>"
				html += "<td>" + thisjam.title + "</td>"

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
	  	$(".main").html(html)
	})
	.fail(function()
	{
		alert('Encountered a problem.')
	})
}

function loadJam(id)
{
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
		if (thisjam.hasOwnProperty("notes") && thisjam.notes != "")
		{
			html += "<p>" + thisjam.notes + "</p>"
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
				html += "<tr>"
				html += "<td width='15px'><span style='cursor: pointer' onclick=\"play('" + tracks.title + "', '" + tracks.path + "')\"  class='glyphicon glyphicon-play-circle' aria-hidden='true'></span></td>"
				html += "<td><a href='" + tracks.path + "'>" + tracks.title + "</a></td>"
				if (tracks.notes)
				{
					html += "<td>" + tracks.notes + "</td>"
				}
				html += "</tr>"
			})
			html += "</div>"
		}
		
		$(".main").html(html)
	});
}
