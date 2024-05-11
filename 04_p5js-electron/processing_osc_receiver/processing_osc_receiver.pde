import oscP5.*;
import netP5.*;
OscP5 oscP5;

int nFaces;
int oscVideoWidth;
int oscVideoHeight;
int nFaceLandmarks;
int nFaceMetrics;
PVector faceLandmarks[];
float faceMetrics[];
boolean bCalculateFaceMetrics;

import processing.video.*;
Capture cam;

void setup() {
  // fullScreen();
  size(800, 600);

  OscProperties oscProps = new OscProperties();
  oscProps.setDatagramSize(8192);
  oscProps.setListeningPort(3334);
  oscProps.setRemoteAddress("127.0.0.1", 12000);

  oscP5 = new OscP5(this, oscProps);
  oscP5.plug(this, "receiveOscFaceLandmarks", "/faceLandmarks");
  oscP5.plug(this, "receiveOscFaceMetrics", "/faceMetrics");

  nFaces = 0;
  oscVideoWidth = 640;
  oscVideoHeight = 480;
  nFaceLandmarks = 478; // will break if nFaces > 1
  nFaceMetrics = 52;
  bCalculateFaceMetrics = true;

  faceLandmarks = new PVector[nFaceLandmarks];
  for (int i=0; i<nFaceLandmarks; i++) {
    faceLandmarks[i] = new PVector(0, 0);
  }
  faceMetrics = new float[nFaceMetrics];
  for (int i=0; i<nFaceMetrics; i++) {
    faceMetrics[i] = 0;
  }

  String[] cameras = Capture.list();
  if (cameras == null) {
    println("Failed to retrieve the list of available cameras, will try the default...");
    cam = new Capture(this, 640, 480);
  } else if (cameras.length == 0) {
    println("There are no cameras available for capture.");
    // exit();
  } else {
    println("Available cameras:");
    printArray(cameras);
    // cam = new Capture(this, cameras[1]);
    cam = new Capture(this, 640, 480, "HD Pro Webcam C920", 30); //FaceTime HD Camera", 30);
  }
  cam.start();
}

//===================================================
void draw() {
  if (cam.available() == true) {
    cam.read();
  }

  background(30, 30, 60);
  image(cam, mouseX, mouseY);

  fill(255);
  noStroke();
  textAlign(LEFT);
  textSize(10); 
  text("FPS: " + nf(frameRate, 1, 2), 30, 20);

  drawFaceLandmarks();
  drawFaceMetrics(); 
}


/* incoming osc message are forwarded to the oscEvent method. */
void oscEvent(OscMessage theOscMessage) {

  // print the address pattern and the typetag of the received OscMessage
  boolean bVerbose = false;
  if (bVerbose) {
    print("### received an OSC message.");
    print(" addrpattern: "+theOscMessage.addrPattern());
    println(" typetag: "+theOscMessage.typetag());
  }

  if (theOscMessage.checkAddrPattern("/nFaces")==true) {
    if (theOscMessage.checkTypetag("i")) {
      int val = theOscMessage.get(0).intValue();
      nFaces = val;
    }
  }
  if (theOscMessage.checkAddrPattern("/videoWidth")==true) {
    if (theOscMessage.checkTypetag("i")) {
      int val = theOscMessage.get(0).intValue();
      if (val > 0) {
        oscVideoWidth = val;
      }
    }
  }
  if (theOscMessage.checkAddrPattern("/videoHeight")==true) {
    if (theOscMessage.checkTypetag("i")) {
      int val = theOscMessage.get(0).intValue();
      if (val > 0) {
        oscVideoHeight = val;
      }
    }
  }
}

void hideOscSource() {
  OscMessage myMessage = new OscMessage("/hide");
  myMessage.add(123); /* add an int to the osc message */
  oscP5.send(myMessage);
}

// receiveOscFaceLandmarks is called by oscP5 when receiving
// an OSC message with address pattern /faceLandmarks (see plug above)
void receiveOscFaceLandmarks (float[] theValues) {
  if (theValues.length == (nFaceLandmarks*2)) {
    int index = 0;
    for (int i=0; i<theValues.length; i+=2) {
      faceLandmarks[index].x = theValues[i];
      faceLandmarks[index].y = theValues[i+1];
      index++;
    }
  }
}

void receiveOscFaceMetrics(float[] theValues) {
  if (theValues.length == (nFaceMetrics)) {
    for (int i=0; i<theValues.length; i++) {
      faceMetrics[i] = theValues[i];
    }
  }
}

void drawFaceLandmarks() {
  noStroke();
  fill(255);
  if (nFaces > 0) {
    for (int i=0; i<nFaceLandmarks; i++) {
      float px = faceLandmarks[i].x * width;
      float py = faceLandmarks[i].y * height;
      circle(px, py, 5);
    }
  }
}

//------------------------------------------
void drawFaceMetrics() {
  if (bCalculateFaceMetrics) {
    if (nFaces > 0) {
      
      textSize(7);
      float tx = 50;
      float ty = 50;
      float dy = 8;
      float vx0 = tx-5;
      float vx1 = vx0-40;

      for (int i=1; i<nFaceMetrics; i++) {
        noStroke();
        fill(255);
        text(nf(i, 2), tx, ty);

        float metricValue = faceMetrics[i];
        float vx = map(metricValue, 0, 1, vx0, vx1);
        stroke(255);
        line(vx0, ty-2, vx, ty-2);
        stroke(0, 0, 0, 20);
        line(vx0, ty-2, vx1, ty-2);
        ty+=dy;
      }
    }
  }
}



void keyPressed() {
  if (key == 'X') {
    hideOscSource();
  }
}
