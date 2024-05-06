// Uses p5.js v.1.9.2, https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.2/p5.js
// Uses

let bVerbose = false;
let socket; 

// Global variables.
let myFaceLandmarker;
let faceLandmarks;
let myCapture;
let lastVideoTime = -1;
let bShowVideo = false;
const myEps = 0.0000001;
// let mySound;

const trackingConfig = {
	cpuOrGpuString: "GPU" /* "GPU" or "CPU" */,
	maxNumFaces: 1,
};



//------------------------------------------
async function preload() {
	// mySound = loadSound('quiet.mp3');

	const mediapipe_module = await import(
		/* "/mediapipe/tasks-vision/vision_bundle.js" */
		"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js"
	);
	let FaceLandmarker = mediapipe_module.FaceLandmarker;
	let FilesetResolver = mediapipe_module.FilesetResolver;
	const vision = await FilesetResolver.forVisionTasks(
		/* "/mediapipe/tasks-vision@0.10.12/wasm" */
		"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.13/wasm"
	);
	myFaceLandmarker = await FaceLandmarker.createFromOptions(vision, {
		numFaces: trackingConfig.maxNumFaces,
		runningMode: "VIDEO",
		outputFaceBlendshapes: false,
		baseOptions: {
			delegate: trackingConfig.cpuOrGpuString,
			modelAssetPath:
			/* "/mediapipe/face_landmarker.task", */
			"https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
		},
	});
}

//------------------------------------------
async function predictWebcam() {
	let startTimeMs = performance.now();
	if (lastVideoTime !== myCapture.elt.currentTime) {
	  if (myFaceLandmarker) {
		faceLandmarks = myFaceLandmarker.detectForVideo(
		  myCapture.elt,
		  startTimeMs
		);
	  }
	  lastVideoTime = myCapture.elt.currentTime;
	}
	window.requestAnimationFrame(predictWebcam);
}

//------------------------------------------
function setup() {
    let cnv = createCanvas(640, 480);
	frameRate(30); 

	myCapture = createCapture(VIDEO);
	myCapture.size(640, 480);
	myCapture.hide();

	setupOsc(12000, 3334);
}



//------------------------------------------
function draw() {
	background("black");
	push();
	predictWebcam();
	drawVideoBackground();
	drawFacePoints();
	drawDiagnosticInfo(); 
	pop();
	
	noFill(); 
	stroke(0,255,0); 
	ellipse(mouseX,mouseY, 200,75);
	fill(0,255,0); 
	text("local", mouseX,mouseY);

	
	transmitMouseData(); 
	transmitFaceData(); 
}

//------------------------------------------
function transmitMouseData(){
	let mx = frameCount%width + myEps; //mouseX + myEps; // must be a float! :(
	let my = 40 + myEps; //mouseY + myEps;
	sendOsc("/mouseFromP5", [mx,my]);
}

//------------------------------------------
function keyPressed(){
	if ((key == 'V') || (key == 'v')){
	  bShowVideo = !bShowVideo;
	}
}

//------------------------------------------
function sendOsc(address, value) {
	socket.emit('message', [address].concat(value));
}

function setupOsc(oscPortIn, oscPortOut) {
	socket = io.connect('http://127.0.0.1:8081', { port: 8081, rememberTransport: false });
	socket.on('connect', function() {
		socket.emit('config', {
			server: { port: oscPortIn,  host: '127.0.0.1'},
			client: { port: oscPortOut, host: '127.0.0.1'}
		});
	});
}

//------------------------------------------
function drawVideoBackground() {
	if (bShowVideo){
	  push();
	  translate(width, 0);
	  scale(-1, 1);
	  tint(127);
	  image(myCapture, 0, 0, width, height);
	  tint(255);
	  pop();
	}
  }
  
//------------------------------------------
// Tracks 478 points on the face.
function drawFacePoints() {
	if (faceLandmarks && faceLandmarks.faceLandmarks) {
		const nFaces = faceLandmarks.faceLandmarks.length;
		if (nFaces > 0) {
			fill("white");
			noStroke();
			for (let f = 0; f < nFaces; f++) {
				let aFace = faceLandmarks.faceLandmarks[f];
				if (aFace) {
					let nFaceLandmarks = aFace.length;
					for (let i = 0; i < nFaceLandmarks; i++) {
						let px = map(aFace[i].x, 0, 1, width, 0);
						let py = map(aFace[i].y, 0, 1, 0, height);
						square(px, py, 2);
					}
				}
			}
		}
	}
}

function transmitFaceData(){
	// TODO: deal with nFaces > 1
	if (faceLandmarks && faceLandmarks.faceLandmarks) {
		const nFaces = faceLandmarks.faceLandmarks.length;
		sendOsc("/nFaces", int(nFaces));
		if (nFaces > 0) {
			for (let f = 0; f < nFaces; f++) {
				let aFace = faceLandmarks.faceLandmarks[f];
				if (aFace) {
					
					let faceOscData = [];
					let nFaceLandmarks = aFace.length;
					for (let i = 0; i < nFaceLandmarks; i++) {
						let px = myEps + map(aFace[i].x, 0, 1, width, 0);
						let py = myEps + map(aFace[i].y, 0, 1, 0, height);
						faceOscData.push(px); 
						faceOscData.push(py);
					}
					sendOsc("/faceData", faceOscData);
				}
			}
		}
	} else {
		sendOsc("/nFaces", 0);
	}
}

	


  
//------------------------------------------
function drawDiagnosticInfo() {
	noStroke();
	fill("white");
	text("FPS: " + int(frameRate()), 30, 30);
}