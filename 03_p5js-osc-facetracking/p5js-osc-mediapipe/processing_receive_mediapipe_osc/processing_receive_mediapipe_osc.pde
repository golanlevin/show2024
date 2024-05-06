/**
 This Processing sketch receives face-tracking datas 
 over OSC from the p5.js sketch in the folder "p5js-osc-mediapipe".
 You need the library OscP5 to run it.
 Works with Processing 4.3, April 2024
 
 In Terminal, `cd` to the directory p5js-osc-mediapipe. 
 Run npm to get required libraries. 
 This will create and populate the `node_modules` folder:
  $ cd p5js-osc-mediapipe/
  $ npm install
 Start node. It's essential to run this "bridge" for OSC to work: 
  $ node bridge.js
 */
 
import oscP5.*;
import netP5.*;
OscP5 oscP5;

float rcvX; 
float rcvY; 
int nFaces; 
int nFaceLandmarks; 
PVector faceData[]; 

void setup() {
  // fullScreen(); 
  size(800, 600);
  
  OscProperties oscProps = new OscProperties();
  oscProps.setListeningPort(3334);
  oscProps.setDatagramSize(8192);
  
  oscP5 = new OscP5(this, oscProps);
  oscP5.plug(this, "receiveOscFaceData", "/faceData");
  
  rcvX = 0; 
  rcvY = 0; 
  nFaces = 0; 
  nFaceLandmarks = 478; 
  faceData = new PVector[nFaceLandmarks];
  for (int i=0; i<nFaceLandmarks; i++){
    faceData[i] = new PVector(0,0); 
  }
}


void draw() {
  background(0,0,30);
  fill(255);
  ellipse(rcvX, rcvY, 200, 75);
  fill(0);
  textAlign(CENTER,CENTER); 
  text("Controlled by p5", rcvX,rcvY);
  
  fill(255);
  noStroke(); 
  textAlign(LEFT); 
  text("FPS: " + nf(frameRate,1,2), 30,20);
  
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
      int nF = theOscMessage.get(0).intValue(); 
      if ((nF >= 0) && (nF <= 4)){
        nFaces = nF;
      }
    }
  }
  
  // check if theOscMessage has the address pattern we are looking for. 
  if(theOscMessage.checkAddrPattern("/mouseFromP5")==true) {
    // check if the typetag is the right one. 
    if(true){ ///theOscMessage.checkTypetag("ff")) {
      // parse theOscMessage and extract the values from the osc message arguments.
      rcvX = theOscMessage.get(0).floatValue(); 
      rcvY = theOscMessage.get(1).floatValue();
      
      if (bVerbose){
        println(" values: "+rcvX+", "+rcvY);
      }
      return;
    }  
  } 
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
  for (int i=0; i<nFaceLandmarks; i++){
    float px = faceData[i].x; 
    float py = faceData[i].y;
    circle(px,py,2); 
  }
}

void keyPressed(){
  if (key == 'f'){
    fullScreen(); 
  }
}
