$(document).ready(function(){
   $("#recentButton").click(loadRecentJams)
   $('#recentButton').css('cursor','pointer');

})

function loadRecentJams()
{
	$.get( "/recent", function( data ) {
  		data.forEach(function (element, index, array) {
  			console.log(data.id + "...");
  		})
	});
}