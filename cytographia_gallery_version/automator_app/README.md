### MacOS Automator App for *Cytographia* (Gallery Version)

(*July 2024*) This is an Automator app to launch the gallery (self-playing) version of Cytographia. It does the following: 

* Launch (a local copy of) *Cytographia* in the Google Chrome browser
* Sets Chrome to fullscreen

The Automator app consists of a single *Run AppleScript* element, as follows:

```
on run {input, parameters}
```

The app requires the following System Settings:

* Privacy & Security > Accessibility: enable Automator and Launch_Cyto to control computer
* Privacy & Security > Automation: allow Launch_Cyto to control System Events and Google Chrome
* Place Launch_Cyto in General > Login Items. 