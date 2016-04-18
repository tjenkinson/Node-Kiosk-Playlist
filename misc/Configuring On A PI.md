Configuring On A PI
===================

# 1
sudo apt-get install npm

# 2
Set ~/.config/lxsession/LXDE-pi/autostart to the contents of 'autostart' in the 'LXDE-pi' folder in this repo.

# 3
sudo apt-get install upstart

# 4
Copy "kiosk-playlist.conf" to "/etc/init/kiosk-playlist.conf".

# 5
sudo crontab -e and insert "0 4 * * * sudo reboot"

#6
sudo raspi-config
Set memsplit to 128.
Set boot mode to desktop autologin as pi user.

