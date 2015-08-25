// ==UserScript==
// @name         OpenLoad to HTML5
// @namespace    https://github.com/JurajNyiri/
// @version      1.11
// @description  Replaces buggy and full-of-adds openload player with a clear html5 player.
// @author       Juraj Nyíri | jurajnyiri.eu
// @encoding utf-8
// @license http://opensource.org/licenses/MIT
// @homepage https://github.com/JurajNyiri/OLEnhancedPlayer
// @match        https://openload.co/*
// @match        https://openload.tv/*
// @grant        none
// @require http://code.jquery.com/jquery-latest.js
// @updateURL https://raw.githubusercontent.com/JurajNyiri/OLEnhancedPlayer/master/main.user.js
// @downloadURL https://raw.githubusercontent.com/JurajNyiri/OLEnhancedPlayer/master/main.user.js
// ==/UserScript==

var videoElem = false;
$(function() {
	$.get(window.location.href, function(data) {
		var subtitleshtml = data.substring(data.indexOf("<track kind=\"captions\" src=\""),(data.lastIndexOf("</track>")+8));
		var htmlcontent = "<video id=\"realVideoElem\" style=\"width: 100%; height:100%;\" controls poster=\""+$('video').attr('poster')+"\"><source src=\""+$("video source").attr('src')+"\" type=\"video/mp4\">";
		htmlcontent += subtitleshtml;
		htmlcontent += "</video>";
		$(".videocontainer").html(htmlcontent)
		videoElem = $("#realVideoElem");
		$(videoElem).bind( "click", function() 
		{
			pausePlayVideo(videoElem[0])
		});
		videoElem[0].play();
	});
})

function pausePlayVideo(video)
{
	if (video.paused == true)
	{
		video.play();
	}
	else
	{
		video.pause();
	}
}

$(window).keypress(function(e) 
{
	if(videoElem)
	{
		if (e.which == 32) 
		{
			pausePlayVideo(videoElem[0]);
		}
	}
});
