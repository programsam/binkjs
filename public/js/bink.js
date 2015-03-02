$(document).ready(function(){
   $("a#recentButton").click(loadRecentJams)
})

function loadRecentJams()
{
	$.get( "/recent", function( data ) {
		console.log(data)
		var html = "";
		data.forEach(function (thisjam, index, array) {
  			var d = new Date(thisjam.date)
  			var mydate = (d.getMonth()+1) + "/" + d.getDate() + "/" + d.getFullYear()
  			html += "<div class='jumbotron'>"
  			html += "<h1><a id='jam" + thisjam.id + "' onclick='loadJam(" + thisjam.id + ")' style='cursor:pointer'>" + mydate + " - " + thisjam.title + "</a></h1>"
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
  			html += "<p /><div class='quote'>" + thisjam.notes + "</div>"
  			html += "</div>"
	  		})
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
		mydate = Date.parse(thisjam.date.substr(0,10)).toString("MM/dd/yyyy")
		html += "<div class='item'>"
		html += "<h1><a id='jam" + thisjam.id + "' onclick='loadJam(" + thisjam.id + ")' style='cursor:pointer'>" + mydate + " - " + thisjam.title + "</a></h1>"
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
		html += "<p /><div class='quote'>" + thisjam.notes + "</div>"
		html += "</div>"
		$("#thispage").html(html)
	});
}