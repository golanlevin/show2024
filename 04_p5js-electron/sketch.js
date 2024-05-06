const { ipcRenderer } = require('electron');
const OSC = require('osc-js');
let osc;
let lastSendOscTime = 0; 
let oscThrottlePeriod = 30; 

// Global variables.
let myFaceLandmarker;
let faceLandmarks;
let myCapture;
let lastVideoTime = -1;
let bShowVideo = false;


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
	  sendOscData(); 
	}
	// window.requestAnimationFrame(predictWebcam);
	setTimeout(predictWebcam, 1000);
}

//------------------------------------------
function openOSC(){
	osc = new OSC({ plugin: new OSC.DatagramPlugin({
	  send:{
		host: '127.0.0.1',
		port: 3334,
	  },
	  open: {
		host: '127.0.0.1',
		port: 12000 // Port to receive messages
	  }
	}) });

	osc.on('/hide', (message) => {
		ipcRenderer.send('toggle-window');
		console.log('Received /hide message:', message);
	});

	osc.open();

}

//------------------------------------------
function setup() {
	createCanvas(640, 480);
	openOSC(); 

	myCapture = createCapture(VIDEO);
	myCapture.size(640, 480);
	myCapture.hide();
}

function keyPressed(){
	if (key == 'X'){
		ipcRenderer.send('toggle-window');
	} else if (key == 'V'){
		bShowVideo = !bShowVideo;
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
			fill(255);
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
function sendFaceDataARR(){
	var arr = ["/faceData"];
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

//------------------------------------------
function sendOtherData(){
	let nFaces = 0; 
	if (faceLandmarks && faceLandmarks.faceLandmarks) {
		nFaces = faceLandmarks.faceLandmarks.length;
	}
	osc.send(new OSC.Message('/videoWidth',myCapture.width));
	osc.send(new OSC.Message('/videoHeight',myCapture.height));
	osc.send(new OSC.Message('/nFaces',nFaces));
}

//------------------------------------------
function sendOscData(){
	let now = performance.now();
	if (now - lastSendOscTime > oscThrottlePeriod) {
		sendOtherData(); 
		sendFaceDataARR();
		lastSendOscTime = now;
	}
}

//------------------------------------------
function drawDiagnosticInfo() {
	noStroke();
	fill(255);
	text("FPS: " + int(frameRate()), 30, 40);
}

