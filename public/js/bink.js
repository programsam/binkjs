$(document).ready(function(){
   $("#recentButton").click(loadRecentJams)
   $('#recentButton').css('cursor','pointer');

})

function loadRecentJams()
{
	$.get( "/recent", function( data ) {
		var html = "";
		var result = JSON.parse(data)
  		result.forEach(function (thisjam, index, array) {
  			mydate = Date.parse(thisjam.date.substr(0,10)).toString("MM/dd/yyyy")
  			html += "<div class='item'>"
  			html += "<h1><a id='jam" + thisjam.id + "' onclick='loadJam()' style='cursor:pointer'>" + mydate + " - " + thisjam.title + "</a></h1>"
  			if (thisjam.hasOwnProperty("location"))
  			{
  				html += thisjam.location.name
  			}
  			html += "<div class='quote'>" + thisjam.notes + "</div>"
  			html += "</div>"
  		})
  		$("#thispage").html(html)
	});
}

function loadJam(event)
{
	alert("Jam clicked!")
}