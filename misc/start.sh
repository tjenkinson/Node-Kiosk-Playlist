#!/bin/bash
# expects config file location as the first argument

echo Loading...

cd /home/pi/app
rm -rf ./Node-Kiosk-Playlist.tmp
mkdir ./Node-Kiosk-Playlist.tmp && curl -L --retry 10  https://github.com/LA1TV/Node-Kiosk-Playlist/tarball/stable | tar -xvz -C ./Node-Kiosk-Playlist.tmp --strip-components=1 && cd ./Node-Kiosk-Playlist.tmp && npm install && cd .. && rm -rf ./Node-Kiosk-Playlist && mv ./Node-Kiosk-Playlist.tmp ./Node-Kiosk-Playlist

curl --retry 10 $1 > ./config.json.tmp && mv ./config.json.tmp ./config.json
../node-v0.10.28-linux-arm-pi/bin/node ./bootstrap.js

echo Terminated.