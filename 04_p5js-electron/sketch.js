const { ipcRenderer } = require('electron');
const OSC = require('osc-js');
let osc;

// Global variables.
let myFaceLandmarker;
let faceLandmarks;
let myCapture;
let lastVideoTime = -1;
let bShowVideo = false;
const myEps = 0.0000001;

const trackingConfig = {
	cpuOrGpuString: "GPU" /* "GPU" or "CPU" */,
	maxNumFaces: 1,
};

//------------------------------------------
async function preload() {

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
	  sendFaceDataARR(); 
	}
	window.requestAnimationFrame(predictWebcam);
}

//------------------------------------------
function openOSC(){
	osc = new OSC({ plugin: new OSC.DatagramPlugin({
	  send:{
		host: '127.0.0.1',
		port: 3334,
	  }
	}) });
	osc.open();
}

//------------------------------------------
function setup() {
	createCanvas(640, 480);
	frameRate(30); 
	openOSC(); 

	myCapture = createCapture(VIDEO);
	myCapture.size(640, 480);
	myCapture.hide();
}

function keyPressed(){
	if (key == 'X'){
		ipcRenderer.send('toggle-window');
	}
}

//------------------------------------------
function draw() {
	background(0,0,30);

	push();
	predictWebcam();
	drawVideoBackground();
	drawFacePoints();
	drawDiagnosticInfo(); 
	pop();
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

//------------------------------------------
function drawDiagnosticInfo() {
	noStroke();
	fill("white");
	text("FPS: " + int(frameRate()), 30, 40);
}

//------------------------------------------
function sendFaceDataARR(){
	var arr = ["/faceData"];
	// arr.push(camera.videoWidth);
	// arr.push(camera.videoHeight);
	// arr.push(poses.length);
	if (faceLandmarks && faceLandmarks.faceLandmarks) {
		const nFaces = faceLandmarks.faceLandmarks.length;

		for (var f = 0; f < nFaces; f++){
			let aFace = faceLandmarks.faceLandmarks[f];
			if (aFace) {
				let nFaceLandmarks = aFace.length;
				for (let i = 0; i < nFaceLandmarks; i++) {
					let px = map(aFace[i].x, 0, 1, 1, 0);
					let py = map(aFace[i].y, 0, 1, 0, 1);
					arr.push(px);
					arr.push(py);
				}
			}
		}
	}
	osc.send(new OSC.Message(...arr));
}


