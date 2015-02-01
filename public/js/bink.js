$(document).ready(function(){
   $("#recentButton").click(loadLink)
   $('a').css('cursor','pointer');
})

function loadLink(event)
{
	$("#thispage").html("<h1>This is some HTML</h1>");
} 