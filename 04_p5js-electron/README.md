#### Quickstart

1. `cd /Users/gl/Documents/GitHub/show2024/04_p5js-electron`
2. `npm start`
3. Run `processing_osc_receiver.pde`



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




{
  "name": "04_p5js-electron",
  "version": "1.0.0",
  "description": "",
  "main": "main.js",
  "scripts": {
    "start": "electron-forge start",
    "package": "electron-forge package",
    "make": "electron-forge make"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "@electron-forge/cli": "^7.4.0",
    "@electron-forge/maker-deb": "^7.4.0",
    "@electron-forge/maker-rpm": "^7.4.0",
    "@electron-forge/maker-squirrel": "^7.4.0",
    "@electron-forge/maker-zip": "^7.4.0",
    "@electron-forge/plugin-auto-unpack-natives": "^7.4.0",
    "@electron-forge/plugin-fuses": "^7.4.0",
    "@electron/fuses": "^1.8.0",
    "electron": "^30.0.2"
  },
  "dependencies": {
    "electron-squirrel-startup": "^1.0.0",
    "osc-js": "^2.4.1"
  }
}
