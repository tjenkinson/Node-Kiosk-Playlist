#!/bin/bash
# expects config file location as the first argument

echo Loading...
cd /home/pi/app

# load config
source start_config

sudo sh -c "setterm --term linux --blank force > /dev/tty0 < /dev/tty0"

rm -rf ./Node-Kiosk-Playlist.tmp
mkdir ./Node-Kiosk-Playlist.tmp && curl -L --retry 10  https://github.com/LA1TV/Node-Kiosk-Playlist/tarball/stable | tar -xvz -C ./Node-Kiosk-Playlist.tmp --strip-components=1 && cd ./Node-Kiosk-Playlist.tmp && npm install && cd .. && rm -rf ./Node-Kiosk-Playlist && mv ./Node-Kiosk-Playlist.tmp ./Node-Kiosk-Playlist

curl --retry 10 $CONFIG_URL > ./config.json.tmp && mv ./config.json.tmp ./config.json
nodejs ./bootstrap.js

echo Terminated.