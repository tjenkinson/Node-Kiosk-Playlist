if (process.argv.length < 5) { // first element in array is "node", second is path
	console.error("You need the following parameters: apiKey qualityIds randomise (playlistId)");
	process.exit(1);
}

var apiBaseUrl = "https://www.la1tv.co.uk/api/v1";

var request = require('request');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;

var apiKey = process.argv[2];
var qualityIds = process.argv[3].split(",").map(function(a){return parseInt(a);});
var randomise = process.argv[4] === "1";
var playlistId = process.argv.length > 5 ? process.argv[5] : null;

// array of {mediaItem, url, type}
// items at the front of the array are popped off and played
var queue = [];
var handle = null;
var killSent = false;

// if set this candidate should play next
var queuedCandidate = null;
// the candidate that's currently playing
var currentCandidate = null;

initialise();

function initialise() {
	killPlayer();
	apiRequest("permissions", function(data) {
		var permissions = data.data;
		if (!permissions.vodUris) {
			console.error("Do not have \"vodUris\" api permission.");
			process.exit(1);
		}
		else if (!permissions.streamUris && playlistId === null) {
			console.error("Do not have \"streamUris\" api permission.");
			process.exit(1);
		}
		console.log("Initialised!");
		if (playlistId === null) {
			setTimeout(liveStreamCheck, 5000);
		}
		loadNextItem();
	});
}

function apiRequest(url, callback) {
	console.log("Making api request.", url);
	request({
		url: apiBaseUrl+"/"+url,
		headers: {
			"X-Api-Key": apiKey
		}
	}, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			console.log("Api request completed.");
			callback(JSON.parse(body));
		}
		else {
			console.log("Error making request to api. Retrying shortly.");
			setTimeout(function() {
				apiRequest(url, callback);
			}, 5000);
		}
	});
}

// check if something's live, and if it is add it to the front of the queue and switch to it.
function liveStreamCheck() {
	console.log("Checking for live streams.");
	var requestUrl = "mediaItems?sortMode=SCHEDULED_PUBLISH_TIME&sortDirection=DESC&streamIncludeSetting=HAS_LIVE_STREAM&limit=10";
	apiRequest(requestUrl, function(data) {
		var mediaItems = data.data.mediaItems;
		var foundLiveMediaItem = false;
		var newCandidate = null;
		
		for(var i=0; i<mediaItems.length; i++) {
			var mediaItem = mediaItems[i];
			if (mediaItem.liveStream === null || mediaItem.liveStream.state !== "LIVE") {
				continue;
			}
			
			var candidate = createCandidateFromMediaItem(mediaItem, "stream");
			if (currentCandidate !== null && currentCandidate.type === "stream" && candidate.url === currentCandidate.url) {
				foundLiveMediaItem = true;
				break;
			}
			if (newCandidate === null) {
				newCandidate = candidate;
			}
		}
		if (!foundLiveMediaItem) {
			if (newCandidate !== null) {
				// queue the live stream and switch to it
				console.log("Queueing live stream to play on next switch.");
				queuedCandidate = newCandidate;
				loadNextItem();
			}
			else if (currentCandidate !== null && currentCandidate.type === "stream") {
				// stream has ended
				console.log("Live stream has ended so loading next item.");
				loadNextItem();
			}
		}
		
		setTimeout(liveStreamCheck, 5000);
	});
}

// populate the queue with items
function refillQueue(callback) {
	var requestUrl = playlistId !== null ? "playlists/"+playlistId+"/mediaItems" : "mediaItems?sortMode=SCHEDULED_PUBLISH_TIME&sortDirection=DESC&vodIncludeSetting=HAS_AVAILABLE_VOD&limit=25";
	apiRequest(requestUrl, function(data) {
		var mediaItems = playlistId !== null ? data.data : data.data.mediaItems;

		// to contain all media items which are supported in form {mediaItem, chosenQualityId}
		var candidates = [];
		for (var i=0; i<mediaItems.length; i++) {
			var mediaItem = mediaItems[i];
			var candidate = createCandidateFromMediaItem(mediaItem, "video");
			
			if (candidate !== null) {
				candidates.push(candidate);
			}
		}
		if (randomise) {
			shuffle(candidates);
		}
		queue = candidates;
		newMediaItemIds = [];
		if (callback) {
			callback();
		}
	});
}

function isMediaItemValid(mediaItem, type) {
	if (type !== "video" && type !== "stream") {
		throw "Invalid item type.";
	}
	return type === "video" ? mediaItem.vod !== null && mediaItem.vod.available : mediaItem.liveStream !== null && mediaItem.liveStream.state === "LIVE";
}

function createCandidateFromMediaItem(mediaItem, type) {
	if (type !== "video" && type !== "stream") {
		throw "Invalid item type.";
	}
	
	if (!isMediaItemValid(mediaItem, type)) {
		return null;
	}
	
	var mediaItemPart = type === "video" ? mediaItem.vod : mediaItem.liveStream;
	
	var availableQualityIds = [];
	for (var j=0; j<mediaItemPart.qualities.length; j++) {
		availableQualityIds.push(mediaItemPart.qualities[j].id);
	}
	var chosenUrl = null;
	for (var j=0; j<qualityIds.length && chosenUrl === null; j++) {
		var proposedQualityId = qualityIds[j];
		if (availableQualityIds.indexOf(proposedQualityId) !== -1) {
			// find the url for the mp4 encoded version
			for (var k=0; k<mediaItemPart.urlData.length && chosenUrl === null; k++) {
				var item = mediaItemPart.urlData[k];
				if (item.quality.id === proposedQualityId) {
					for(var j=0; j<item.urls.length; j++) {
						var urlInfo = item.urls[j];
						if ((type === "video" && urlInfo.type === "video/mp4") || (type === "stream" && urlInfo.type === "application/x-mpegURL")) {
							chosenUrl = urlInfo.url;
							break;
						}
					}
				}
			}
		}
	}
	if (chosenUrl === null) {
		// could not find an applicable url
		return null;
	}
	
	return {
		mediaItem: mediaItem,
		url: chosenUrl,
		type: type
	};
}

function fillQueueIfNecessary(callback) {
	if (queue.length > 0) {
		callback();
	}
	else {
		console.log("Queue empty. Refilling...");
		refillQueue(callback);
	}
}

// get the next item off the queue and play it
function loadNextItem() {
	if (currentCandidate !== null) {
		// loadNextItem will be called again when the player is killed
		if (killSent) {
			return;
		}
		killSent = true;
		killPlayer();
		return;
	}
	
	console.log("Loading next item...");
	fillQueueIfNecessary(function() {
		
		var candidate = null;
		
		if (queuedCandidate !== null) {
			// there is one set to play next so pick that one
			candidate = queuedCandidate;
			queuedCandidate = null;
		}
		else {
			if (queue.length === 0) {
				console.log("Nothing to switch to, queue is empty. Trying again shortly.");
				setTimeout(function() {
					loadNextItem();
				}, 5000);
				return;
			}
			candidate = queue.shift();
		}
		
		// check this candidate is still available and valid
		var requestUrl = playlistId !== null ? "playlists/"+playlistId+"/mediaItems/"+candidate.mediaItem.id : "mediaItems/"+candidate.mediaItem.id;
		apiRequest(requestUrl, function(data) {
			console.log("Checking next item is still a valid option.");
			var mediaItem = playlistId !== null ? data.data : data.data.mediaItem;
			if (!isMediaItemValid(mediaItem, candidate.type)) {
				console.log("Item no longer valid. Skipping...");
				loadNextItem();
			}
			else {
				console.log("Item valid.");
				currentCandidate = candidate;
				playItem(candidate.url, candidate.type);
			}
		});
	});
}

function playItem(url, type) {
	console.log("Loading item.", url);
	var commandArgs = null;
	if (type === "video") {
		commandArgs = ["-b" , url];
	}
	else if (type === "stream") {
		commandArgs = ["-b" , "--live", url]
	}
	else {
		throw "Invalid item type.";
	}
	
	// play item
	handle = spawn("omxplayer", commandArgs);
	var closeEventHandled = false;
	handle.on("close", function() {
		if (closeEventHandled) {
			return;
		}
		closeEventHandled = true;
		handle = null;
		currentCandidate = null;
		killSent = false;
		killPlayer(); // just to be certain
		loadNextItem();
	});
}

function killPlayer() {
	exec('pkill omxplayer');
}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex ;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}