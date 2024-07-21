### MacOS Automator App for *Cytographia* (Gallery Version)

(*July 2024*) This is an Automator app to launch the gallery (self-playing) version of Cytographia. It does the following: 

* Launch (a local copy of) *Cytographia* in the Google Chrome browser
* Sets Chrome to fullscreen

The Automator app consists of a single *Run AppleScript* element, as follows:

```
on run {input, parameters}    set htmlFilePath to "file:///Users/gl/Desktop/cytographia/index.html"    tell application "Google Chrome"        if it is running then            activate        else            launch            delay 2        end if        -- Check if there are any open windows        if (count of windows) is 0 then            -- Create a new window if no windows are open            make new window            delay 1        end if        -- Open the local HTML file        set newTab to make new tab at the end of tabs of window 1        set URL of newTab to htmlFilePath        -- Wait for the page to load        delay 2        -- Make Chrome fullscreen        activate        tell application "System Events"            keystroke "f" using {command down, control down}        end tell    end tell    return inputend run
```

The app requires the following System Settings:

* Privacy & Security > Accessibility: enable Automator and Launch_Cyto to control computer
* Privacy & Security > Automation: allow Launch_Cyto to control System Events and Google Chrome
* Place Launch_Cyto in General > Login Items. 
