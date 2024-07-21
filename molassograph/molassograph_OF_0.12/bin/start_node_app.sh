#!/bin/zsh

# Path to Node.js executable
export PATH=$PATH:/Users/gl/.nvm/versions/node/v22.3.0/bin

# Directory of your Node.js application
cd /Users/gl/Documents/GitHub/show2024/04_p5js-electron

# Name of the Node.js application (this should be the process name)
APP_NAME="electron"

# Check if the app is already running
if pgrep -f $APP_NAME > /dev/null; then
    echo "$APP_NAME is already running."
else
    echo "Starting $APP_NAME..."
    npm start &
fi