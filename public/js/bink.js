$(document).ready(function(){
   $("#recentButton").click(loadRecentJams)
   $('#recentButton').css('cursor','pointer');

})

function loadRecentJams()
{
	$.get( "/recent", function( data ) {
		var html = "";
		var result = JSON.parse(data)
  		result.forEach(function (element, index, array) {
  			html += "<h1><a href=''>" + element.title + "</a></h1>"
  		})
  		$("#thispage").html(html)
	});
}