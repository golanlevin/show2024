#### Quickstart


1. `cd /Users/gl/Documents/GitHub/show2024/04_p5js-electron`
2. `npm start`
3. Run `processing_osc_receiver.pde` or OF app



#### Software Development Installation:

```
mkdir my-p5-project
cd my-p5-project
npm init -y
npm install electron --save-dev
npm i osc-js

npm install --save-dev @electron-forge/cli
npx electron-forge import
```

#### To build app with Electron Forge

```
npm run make
```

#### Key Commands

* 'V' - toggle Video
* 'X' - toggle app display

#### More information 

* https://chatgpt.com/c/1e6fbf6d-7c1d-4049-b4f9-7b7288330638
* https://chat.openai.com/share/f4bbdde0-36cc-4687-964d-4c860025ae53
* Allow incoming connections in Settings->Firewall
* Included files appear to be located in `04_p5js-electron-darwin-arm64/04_p5js-electron.app/Contents/Resources/app/settings.json`


#### Todo: 

* Choose camera in Processing
* Make sure settings and mediapipe files are included in build
* Dealing with multiple monitors
* Art
