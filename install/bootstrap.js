var spawn = require('child_process').spawn;

var apiKey = require('./api-key.js')

var args = [
	"--expose-gc",
	"./Node-Kiosk-Playlist/app/main.js",
	apiKey,
	__dirname+"/config.json"
];

var handle = spawn("nodejs", args);
handle.stdout.on("data", function(a) {
    console.log(a.toString());
});
handle.stderr.on("data", function(a) {
	console.error(a.toString());
});
