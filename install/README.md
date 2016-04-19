1) Download and put "RASPBIAN JESSIE LITE" image on sd card. (https://www.raspberrypi.org/downloads/raspbian/)

2) Boot and ssh into pi. The IP address should be on the screen. (User: "pi" Password: "raspberry")

3) Copy this directory to `/home/pi`.

4) `cd /home/pi/install && chmod +x install.sh && ./install.sh <<url to config file>> <<la1 api key>>`.

You should also change the password for "pi". `passwd`