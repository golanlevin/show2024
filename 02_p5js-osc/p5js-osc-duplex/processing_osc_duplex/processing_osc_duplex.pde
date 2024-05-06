/**
 This Processing sketch will send its mouse
 position over OSC to the p5.js sketch in the folder "p5js-osc-duplex".
 You need the library OscP5 to run it.
 Works with Processing 4.3, March 2024
 
 In Terminal, `cd` to the directory p5js-osc-duplex. 
 Run npm to get required libraries. 
 This will create and populate the `node_modules` folder:
  $ cd p5js-osc-duplex/
  $ npm install
 Start node. It's essential to run this "bridge" for OSC to work: 
  $ node bridge.js
 */
 
import oscP5.*;
import netP5.*;

OscP5 oscP5;
NetAddress myRemoteLocation;

float rcvX; 
float rcvY; 

void setup() {
  size(500, 500);
  oscP5 = new OscP5(this, 3334);
  myRemoteLocation = new NetAddress("127.0.0.1", 12000);
  rcvX = 0; 
  rcvY = 0; 
}


void draw() {
  background(0);
  fill(255);
  ellipse(rcvX, rcvY, 200, 75);
  fill(0);
  textAlign(CENTER,CENTER); 
  text("Controlled by p5", rcvX,rcvY);
  
  noFill(); 
  stroke(255); 
  ellipse(mouseX, mouseY, 200,75);
  fill(255);
  text("local",mouseX,mouseY); 
  
  // send mouse position over OSC
  OscMessage myMessage = new OscMessage("/mouseFromProcessing");
  myMessage.add(mouseX);
  myMessage.add(mouseY);
  oscP5.send(myMessage, myRemoteLocation);
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
