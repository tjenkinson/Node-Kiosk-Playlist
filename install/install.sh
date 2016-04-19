#!/bin/bash
set -e

# ARGUMENTS
# - la1 config url
# - la1 api key

sudo apt-get update -y
sudo apt-get install -y
sudo apt-get upgrade -y
sudo apt-get install -y omxplayer

mkdir $HOME/app
cp start.sh $HOME/app/start.sh
chmod +x $HOME/app/start.sh
echo "module.exports='$2';" > $HOME/app/api-key.js
echo "CONFIG_URL='$1'" > $HOME/app/start_config
cp bootstrap.js $HOME/app/bootstrap.js

wget https://nodejs.org/dist/v4.4.3/node-v4.4.3-linux-`uname -m`.tar.gz
tar -xvf node-v4.4.3-linux-`uname -m`.tar.gz 
cd node-v4.4.3-linux-`uname -m`
sudo cp -R * /usr/local/
sudo ln -s /usr/local/bin/node /usr/local/bin/nodejs
cd ..
rm -rf node-v4.4.3-linux-`uname -m`*

nodejs -v
npm -v

sudo cp pi-kiosk.sh /etc/init.d/pi-kiosk
sudo chmod +x /etc/init.d/pi-kiosk
sudo update-rc.d pi-kiosk defaults

sudo cp reboot.sh /etc/cron.daily/reboot.sh
sudo chmod +x /etc/cron.daily/reboot.sh

echo "Done! Reboot and cross fingers."
echo "You should run passwd and change the password for 'pi' to something else. You might also want to tweak some settings in 'raspi-config'."
