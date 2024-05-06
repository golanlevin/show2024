import oscP5.*;
import netP5.*;
OscP5 oscP5;

int nFaces; 
int oscVideoWidth;
int oscVideoHeight;
int nFaceLandmarks; 
PVector faceData[]; 

import processing.video.*;
Capture cam;

void setup() {
  fullScreen(); 
  // size(800, 600);
  
  OscProperties oscProps = new OscProperties();
  oscProps.setDatagramSize(8192);
  oscProps.setListeningPort(3334);
  oscProps.setRemoteAddress("127.0.0.1",12000);
  
  oscP5 = new OscP5(this, oscProps);
  oscP5.plug(this, "receiveOscFaceData", "/faceData");
  
  nFaces = 0; 
  oscVideoWidth = 640; 
  oscVideoHeight = 480; 
  nFaceLandmarks = 478; 
  faceData = new PVector[nFaceLandmarks];
  for (int i=0; i<nFaceLandmarks; i++){
    faceData[i] = new PVector(0,0); 
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
    cam = new Capture(this, cameras[0]);
    //cam = new Capture(this, 640, 480, "FaceTime HD Camera", 30);
  }
  cam.start();
}

//===================================================
void draw() {
  if (cam.available() == true) {
    cam.read();
  }
  
  background(30,30,60);
  fill(255);
  noStroke(); 
  textAlign(LEFT); 
  text("FPS: " + nf(frameRate,1,2), 30,20);
  
  image(cam, mouseX, mouseY);
  drawFaceData(); 
}


/* incoming osc message are forwarded to the oscEvent method. */
void oscEvent(OscMessage theOscMessage) {
  
  // print the address pattern and the typetag of the received OscMessage
  boolean bVerbose = false; 
  if (bVerbose){
    print("### received an OSC message.");
    print(" addrpattern: "+theOscMessage.addrPattern());
    println(" typetag: "+theOscMessage.typetag());
  }
  
  if(theOscMessage.checkAddrPattern("/nFaces")==true) {
    if(theOscMessage.checkTypetag("i")) {
      int val = theOscMessage.get(0).intValue(); 
      nFaces = val;
    }
  }
  if(theOscMessage.checkAddrPattern("/videoWidth")==true) {
    if(theOscMessage.checkTypetag("i")) {
      int val = theOscMessage.get(0).intValue(); 
      if (val > 0){ oscVideoWidth = val; }
    }
  }
  if(theOscMessage.checkAddrPattern("/videoHeight")==true) {
    if(theOscMessage.checkTypetag("i")) {
      int val = theOscMessage.get(0).intValue(); 
      if (val > 0){ oscVideoHeight = val; }
    }
  }
}

void hideOscSource(){
  OscMessage myMessage = new OscMessage("/hide");
  myMessage.add(123); /* add an int to the osc message */
  oscP5.send(myMessage);  
}

// receiveOSCFaceData is called by oscP5 when receiving
// an OSC message with address pattern /faceData (see plug above)
void receiveOscFaceData (float[] theValues) {
   if (theValues.length == (nFaceLandmarks*2)){
     int index = 0; 
     for (int i=0; i<theValues.length; i+=2){
       faceData[index].x = theValues[i]; 
       faceData[index].y = theValues[i+1]; 
       index++; 
     }
   }
}

void drawFaceData(){
  noStroke(); 
  fill(255); 
  if (nFaces > 0){
    for (int i=0; i<nFaceLandmarks; i++){
      float px = faceData[i].x * width; 
      float py = faceData[i].y * height;
      circle(px,py,5); 
    }
  }
}

void keyPressed(){
  if (key == 'X'){
    hideOscSource(); 
  }
}
