$(document).ready(function(){
   $("#recentButton").click(loadLink)
   $("#historyButton").click(loadLink)
   $("#playerButton").click(loadLink)
   $("#browseButton").click(loadLink)
   $("#timelineButton").click(loadLink)
   $("#timelineButton").click(loadLink)
   $("#mapButton").click(loadLink)
   $("#tweetsButton").click(loadLink)
   $("#adminButton").click(loadLink)
   
   
   $('a').css('cursor','pointer');
})

function loadLink(event)
{
	if (event.target.id == "recentButton")
	{
		loadRecentJams()
	}
	else
	{
		$("#thispage").html("<h1>" + event.target.id + " was clicked</h1>");
	}
} 


function loadRecentJams()
{
	$("#thispage").html("<h1>Recent Jams</h1>")
}