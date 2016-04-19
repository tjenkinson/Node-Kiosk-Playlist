#!/bin/bash
# /etc/init.d/pi-kiosk

### BEGIN INIT INFO
# Provides:          pi-kiosk
# Required-Start:    $remote_fs $syslog
# Required-Stop:     $remote_fs $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: pi-kiosk
# Description:       pi-kiosk
### END INIT INFO


case "$1" in 
    start)
        echo "Starting pi-kiosk"
        /home/pi/app/start.sh
        ;;
esac

exit 0