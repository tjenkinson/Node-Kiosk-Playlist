if (process.argv.length < 5) { // first element in array is "node", second is path
	console.error("You need the following parameters: apiKey qualityIds randomise (playlistId)");
	process.exit(1);
}

var apiBaseUrl = "https://www.la1tv.co.uk/api/v1";

var request = require('request');
var exec = require('child_process').exec;

var apiKey = process.argv[2];
var qualityIds = process.argv[3].split(",").map(function(a){return parseInt(a);});
var randomise = process.argv[4] === "1";
var playlistId = process.argv.length > 5 ? process.argv[5] : null;

// array of {mediaItem, url}
// items at the front of the array are popped off and played
var queue = [];

initialise();

function initialise() {
	apiRequest("permissions", function(data) {
		var permissions = data.data;
		if (!permissions.vodUris) {
			console.error("Do not have \"vodUris\" api permission.");
			process.exit(1);
		}
		console.log("Initialised!");
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

// populate the queue with items
function refillQueue(callback) {
	var requestUrl = playlistId !== null ? "playlists/"+playlistId+"/mediaItems" : "mediaItems?sortMode=SCHEDULED_PUBLISH_TIME&sortDirection=DESC&vodIncludeSetting=HAS_AVAILABLE_VOD&limit=25";
	apiRequest(requestUrl, function(data) {
		var mediaItems = playlistId !== null ? data.data : data.data.mediaItems;

		// to contain all media items which are supported in form {mediaItem, chosenQualityId}
		var candidates = [];
		for (var i=0; i<mediaItems.length; i++) {
			var mediaItem = mediaItems[i];
			var candidate = createCandidateFromMediaItem(mediaItem);
			
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

function isMediaItemValid(mediaItem) {
	return mediaItem.vod !== null && mediaItem.vod.available;
}

function createCandidateFromMediaItem(mediaItem) {
	if (!isMediaItemValid(mediaItem)) {
		return null;
	}
	var availableQualityIds = [];
	for (var j=0; j<mediaItem.vod.qualities.length; j++) {
		availableQualityIds.push(mediaItem.vod.qualities[j].id);
	}
	var chosenUrl = null;
	for (var j=0; j<qualityIds.length && chosenUrl === null; j++) {
		var proposedQualityId = qualityIds[j];
		if ($.inArray(proposedQualityId, availableQualityIds) !== -1) {
			// find the url for the mp4 encoded version
			for (var k=0; k<mediaItem.urlData.length && chosenUrl === null; k++) {
				var item = mediaItem.urlData[k];
				if (item.quality.id === proposedQualityId) {
					for(var j=0; j<item.urls.length; j++) {
						var urlInfo = item.urls[j];
						if (urlInfo.type === "video/mp4") {
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
		url: chosenUrl
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
	console.log("Loading next item...");
	fillQueueIfNecessary(function() {
		if (queue.length === 0) {
			console.log("Nothing to switch to, queue is empty. Trying again shortly.");
			setTimeout(function() {
				loadNextItem();
			}, 5000);
			return;
		}
		candidate = queue.shift();
		
		// check this candidate is still available and valid
		var requestUrl = playlistId !== null ? "playlists/"+playlistId+"/mediaItems/"+candidate.mediaItem.id : "mediaItems/"+candidate.mediaItem.id;
		apiRequest(requestUrl, function(data) {
			console.log("Checking next item is still a valid option.");
			var mediaItem = playlistId !== null ? data.data : data.data.mediaItem;
			if (!isMediaItemValid(mediaItem)) {
				console.log("Item no longer valid. Skipping...");
				loadNextItem();
			}
			else {
				console.log("Item valid.");
				loadMediaItem(candidate.mediaItem, candidate.url);
			}
		});
	});
}

function loadMediaItem(mediaItem, url) {
	console.log("Loading media item.", mediaItem);
	
	// play item
	var handle = exec("omxplayer "+url, function(error, stdout, stderr) {
		onVideoEnded();
	});
}

function onVideoEnded() {
	console.log("Video ended. Moving on.");
	loadNextItem();
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