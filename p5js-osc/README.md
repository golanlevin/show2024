### Full duplex OSC communication between p5.js and Processing

* March 2024 by Golan Levin
* Based on `p5js-osc` by Gene Kogan. 
* Uses p5.js 1.9.2, Processing 4.3, and socket.io 1.4.5. 

---

Install [node](https://nodejs.org/) if necessary. 

In Terminal, `cd` to the current directory (`p5js-osc`). Run npm to get required libraries. This will create and populate a directory called `node_modules`:

	$ cd p5js-osc/
	$ npm install

Start node. It is essential to run this "bridge" in order for OSC communications to work: 

    $ node bridge.js

Launch `index.html` inside the `p5js-osc-duplex` directory. This will run the p5.js program (in e.g. Chrome). 

Launch `processing_osc_duplex.pde`. This will run the Processing program. (Be sure to have installed the OscP5 Processing library.)

The p5.js and Processing programs will share data over OSC.

![Screenshot](screenshot.png)

