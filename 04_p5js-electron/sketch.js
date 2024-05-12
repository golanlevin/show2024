const { ipcRenderer } = require('electron');
const OSC = require('osc-js');
let osc;
let lastSendOscTime = 0; 
let oscThrottlePeriod = 30; //ms
let portForSendingFaceData;
let portForReceivingSignals;

let settingsJson;
let myCapture;
let videoInputDevices = [];
let preferredCameraName;
let bShowVideo = false;
let bCalculateFaceMetrics = true;
let bWindowVisibility = true;

let myFaceLandmarker;
let faceLandmarks;
let lastVideoTime = -1;
const trackingConfig = {
	cpuOrGpuString: "GPU" /* "GPU" or "CPU" */,
	maxNumFaces: 1,
};

//------------------------------------------
async function preload() {

	// Assign the camera choice to a global variable
	preferredCameraName = "";
	settingsJson = loadJSON('settings.json');

	//--------------
	const mediapipe_module = await import(
		"./mediapipe-0.10.12/tasks-vision/vision_bundle.js"
		/* "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js" */
	);
	let FaceLandmarker = mediapipe_module.FaceLandmarker;
	let FilesetResolver = mediapipe_module.FilesetResolver;
	const vision = await FilesetResolver.forVisionTasks(
		"./mediapipe-0.10.12/tasks-vision@0.10.12/wasm"
		/* "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.13/wasm" */
	);
	myFaceLandmarker = await FaceLandmarker.createFromOptions(vision, {
		numFaces: trackingConfig.maxNumFaces,
		runningMode: "VIDEO",
		outputFaceBlendshapes: bCalculateFaceMetrics,
		baseOptions: {
			delegate: trackingConfig.cpuOrGpuString,
			modelAssetPath:
			"./mediapipe-0.10.12/face_landmarker.task"
			/* "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",*/
		},
	});
}

//------------------------------------------
async function predictWebcam() {
	if (myCapture){
		if ((myCapture.elt) && (myCapture.elt.width > 0) && (myCapture.elt.height > 0)){
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
		}
	}
}

//------------------------------------------
function openOSC(){

	portForSendingFaceData = 3334;
    portForReceivingSignals = 12000;
	if (settingsJson){
		portForSendingFaceData = settingsJson.portForSendingFaceData;
    	portForReceivingSignals = settingsJson.portForReceivingSignals;
	}

	//------------
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

	// List cameras and start video capture once devices are listed
	listCameras().then(() => {startVideoCapture();});

	// myCapture = createCapture(VIDEO);
	// myCapture.size(640, 480);
	// myCapture.hide()
}

//------------------------------------------
async function listCameras() {
	let devices = await navigator.mediaDevices.enumerateDevices();
	videoInputDevices = devices.filter(device => device.kind === 'videoinput');
	// console.log(videoInputDevices);  // Log out devices to see what's available
}

function startVideoCapture() {

	if (settingsJson){
		preferredCameraName = settingsJson.cameraChoice;
	}

	// Check if a specific camera is available, e.g., 'Logitech c920'
	let selectedCamera = videoInputDevices.find(device => device.label.includes(preferredCameraName));
	if (selectedCamera) {
	 	// console.log("Using selectedCamera: " + selectedCamera.label);
		myCapture = createCapture({
			video: {
				deviceId: selectedCamera.deviceId
			},
			audio: false /* disable audio capture */
		});
	} else if (videoInputDevices.length > 0) {
		// console.log("Using default camera: " + videoInputDevices[0].label);
		myCapture = createCapture(VIDEO);
		myCapture.size(640, 480);

	} else {
	  	console.log("No camera available");
	}
	myCapture.hide(); // Hide the HTML video element; use p5 canvas for rendering
}

//------------------------------------------
function keyPressed(){
	if (key == 'X'){
		ipcRenderer.send('toggle-window');
		bWindowVisibility = !bWindowVisibility;

	} else if (key == 'V'){
		bShowVideo = !bShowVideo;
	}
}

//------------------------------------------
function draw() {
	background(0,0,0);
	predictWebcam();
	if (bWindowVisibility){
		push();
		drawVideoBackground();
		drawFaceLandmarks();
		drawFaceMetrics(); 
		drawDiagnosticInfo(); 
		pop();
	}
}


//------------------------------------------
function drawVideoBackground() {
	if (bShowVideo){
		push();
		// translate(width, 0);
		// scale(-1, 1);
		tint(127);
		image(myCapture, 0, 0, width, height);
		tint(255);
		pop();
	}
}
  
//------------------------------------------
// Tracks 478 points on the face.
function drawFaceLandmarks() {
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
						let px = map(aFace[i].x, 0, 1, 0, width); //, 0);
						let py = map(aFace[i].y, 0, 1, 0, height);
						square(px, py, 2);
					}
				}
			}
		}
	}
}

//------------------------------------------
function drawFaceMetrics(){
	if (bCalculateFaceMetrics){
		if (faceLandmarks && faceLandmarks.faceBlendshapes) {
			const nFaces = faceLandmarks.faceLandmarks.length;
			for (let f = 0; f < nFaces; f++) {
				let aFaceMetrics = faceLandmarks.faceBlendshapes[f];
				if (aFaceMetrics){
				
					textSize(7); 
					let tx = 50 + f*100; 
					let ty = 50; 
					let dy = 8;
					let vx0 = tx-5; 
					let vx1 = vx0-40;
					
					let nMetrics = aFaceMetrics.categories.length; 
					for (let i=1; i<nMetrics; i++){
						let metricName = aFaceMetrics.categories[i].categoryName;
						noStroke();
						fill(255);
						// text(metricName, tx,ty); 
						text(nf(i,2) + " " + metricName, tx,ty); 
						
						let metricValue = aFaceMetrics.categories[i].score;
						let vx = map(metricValue,0,1,vx0,vx1);
						stroke(255); 
						strokeWeight(2.0); 
						line(vx0,ty-2, vx,ty-2); 
						stroke(0,0,0,20);
						line(vx0,ty-2, vx1,ty-2); 
						ty+=dy;
					}
				}
			}
		}
	}
}

//------------------------------------------
function sendFaceLandmarksARR(){
	let arr = ["/faceLandmarks"];
	if (faceLandmarks && faceLandmarks.faceLandmarks) {
		const nFaces = faceLandmarks.faceLandmarks.length;

		for (let f = 0; f < nFaces; f++){
			let aFace = faceLandmarks.faceLandmarks[f];
			if (aFace) {
				let nFaceLandmarks = aFace.length;
				for (let i = 0; i < nFaceLandmarks; i++) {
					let px = aFace[i].x; //map(aFace[i].x, 0, 1, 1, 0);
					let py = aFace[i].y; //map(aFace[i].y, 0, 1, 0, 1);
					arr.push(px);
					arr.push(py);
				}
			}
		}
	}
	osc.send(new OSC.Message(...arr));
}

//------------------------------------------
function sendFaceMetricsARR(){
	let arr = ["/faceMetrics"];
	if (bCalculateFaceMetrics){
		if (faceLandmarks && faceLandmarks.faceBlendshapes) {
			const nFaces = faceLandmarks.faceLandmarks.length;
			for (let f = 0; f < nFaces; f++) {
				let aFaceMetrics = faceLandmarks.faceBlendshapes[f];
				if (aFaceMetrics){
					let nMetrics = aFaceMetrics.categories.length; 
					for (let i=0; i<nMetrics; i++){
						let metricValue = aFaceMetrics.categories[i].score;
						arr.push(metricValue);
					}
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
		sendFaceLandmarksARR();
		sendFaceMetricsARR(); 
		lastSendOscTime = now;
	}
}

//------------------------------------------
function drawDiagnosticInfo() {
	noStroke();
	fill(255);
	textSize(10); 
	text("FPS: " + int(frameRate()), 30, 40);
}