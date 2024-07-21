// p5.js interface to Google MediaPipe Face Tracking
// See https://mediapipe-studio.webapps.google.com/home
// Uses p5.js v.1.9.2 + MediaPipe v.0.10.12
// By Golan Levin, 3/30/2024
// 
// OSC not yet implemented

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

  FaceLandmarker = mediapipe_module.FaceLandmarker;
  FilesetResolver = mediapipe_module.FilesetResolver;
  const vision = await FilesetResolver.forVisionTasks(
    /* "/mediapipe/tasks-vision@0.10.12/wasm" */
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
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
  createCanvas(640, 480);
  myCapture = createCapture(VIDEO);
  myCapture.size(640, 480);
  myCapture.hide();
}

function draw() {
  background("black");
  push();
  predictWebcam();
  drawVideoBackground();
  drawFacePoints();
  drawDiagnosticInfo(); 
  pop();
}

function keyPressed(){
  if ((key == 'V') || (key == 'v')){
    bShowVideo = !bShowVideo;
  }
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
            px = map(aFace[i].x, 0, 1, width, 0);
            py = map(aFace[i].y, 0, 1, 0, height);
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
  text("FPS: " + int(frameRate()), 30, 30);
}