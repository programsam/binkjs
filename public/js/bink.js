$(document).ready(function(){
   $("a#recentButton").click(loadRecentJams)
   loadRecentJams()
   
  $("#jquery_jplayer_1").jPlayer({
    ready: function () {
      $(this).jPlayer("setMedia", {
        title: "Winter's Day",
        mp3: "https://s3.amazonaws.com/binkmedia/public/snd/668/First%20Bounce.mp3"
      });
    },
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
})

function loadRecentJams()
{
	$.get( "/recent", function( data ) {
		var html = "";
		html += "<div class='row'>"
		data.forEach(function (thisjam, index, array) {
  			var d = new Date(thisjam.date)
  			var mydate = (d.getMonth()+1) + "/" + d.getDate() + "/" + d.getFullYear()
  			html += "<div class='col-xs-6 col-md-3'>"
  			html += "<h4>" + mydate + " - " + thisjam.title + "</h4>"
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
  			html += "<div align='right'><button onclick='loadJam(" + thisjam.id + ")' type='button' class='btn btn-default' aria-label='Load this Jam'><span class='glyphicon glyphicon-expand' aria-hidden='true'></span></button></div>"
  			
  			html += "</div>"
	  		})
	  	html += "</div>"
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
		html += "<h1>" + mydate + " - " + thisjam.title + "</h1>"
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
		if (thisjam.hasOwnProperty("notes") && thisjam.notes != "")
		{
			html += "<p /><div class='panel panel-default'><div class='panel-heading'>Notes</div>"
			html += "<div class='panel-body'>" + thisjam.notes + "</div></div>"
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
			html += "<ul class='list-group'>"
			thisjam.tracks.forEach(function (tracks, tracksi, tracksa) {
				html += "<li class='list-group-item'>"
				html += "<a href='" + tracks.path + "'>" + tracks.title
				html += "</a>"
				html += "</li>"
			})
			html += "</ul></div>"
		}
		
		$(".main").html(html)
	});
}