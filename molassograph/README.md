Molassograph software has two parts: 

* molassograph_OF_0.12, client written for OF v.12.
* face_tracker/04_p5js-electron, Node+Electron+p5+MediaPipe

molassograph_OF_0.12 uses the face tracking OSC app, 04_p5js-electron, and the addons: 

* ofxConvexHull.h
* ofxOsc.h
* ofxOpenCv.h
* ofxCvHaarFinder.h
* ofxGui.h

--

In order to boot into the apps correctly, an Automator app is placed into System Settings > General > Login Items. This contains a `zsh` "Run Shell Script" module, as follows: 


```
# Load nvm and npm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
 
# Construct the PATH including the npm path
export PATH=/Users/gazelli3/.nvm/versions/node/v22.4.1/bin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin

# Change to the directory where your npm project is located.
cd /Users/gazelli3/Desktop/molassograph/vision_server/04_p5js-electron

# Start the npm app in the background
npm start &

# Add a delay before launching the openFrameworks app
sleep 5

# Launch the openFrameworks app. Change path as necessary. 
open /Users/gazelli3/Desktop/molassograph/molassograph/bin/floccugraphClient2.app


```

This is followed by a "Run AppleScript" module, which ensures the OF app is in focus, as follows: 

```
delay 5
tell application "floccugraphClient2" to activate
```