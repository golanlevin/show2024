#include "ofApp.h"
/*
 defaults write com.apple.VideoEffectCamera ReactionsEnabled -bool false
 */

//--------------------------------------------------------------
void ofApp::setup(){
    ofLogLevel(OF_LOG_ERROR);
    setupOSC();
    
    camW = 1280;
    camH = 720;
    setupCamera();
}

//--------------------------------------------------------------
void ofApp::setupOSC(){
    oscReceiver.setup(OSC_RX_PORT);
    oscSender.setup("127.0.0.1", OSC_TX_PORT);
    faceMetrics = new float[N_FACE_METRICS];
    for (int i=0; i<N_FACE_METRICS; i++){
        faceMetrics[i] = 0.0;
    }
    oscUpdateCount = 0;
    nOscFaces = 0;
}

//--------------------------------------------------------------
void ofApp::setupCamera(){
    
    vidGrabber.setVerbose(true);
    std::vector<ofVideoDevice> devices = vidGrabber.listDevices();
    int deviceID = -1; // Default to an invalid device ID
    for(int i=0; i<devices.size(); i++) {
        if (devices[i].bAvailable) {
            if (ofIsStringInString(devices[i].deviceName, "C920")) {
                deviceID = devices[i].id; break;
            }
        } else {
            ofLogNotice() << "Device " << devices[i].id << ": " << devices[i].deviceName << " - unavailable ";
        }
    }
    if(deviceID != -1) {
        vidGrabber.setDeviceID(deviceID);
        vidGrabber.setup(camW, camH);
    } else {
        vidGrabber.setDeviceID(0); // Fallback to default device
        vidGrabber.setup(camW, camH);
    }
}

//--------------------------------------------------------------
void ofApp::update(){
    if(vidGrabber.isInitialized()){
        bool bNewFrame = false;
        
        vidGrabber.update();
        bNewFrame = vidGrabber.isFrameNew();
        if (bNewFrame){
            processOSC();
        }
    }
}


//--------------------------------------------------------------
void ofApp::processOSC(){
    if (!oscReceiver.isListening()) {
        return;
    }
    while(oscReceiver.hasWaitingMessages()){
        ofxOscMessage m;
        if (oscReceiver.getNextMessage(m)) {
            int nData = (int)m.getNumArgs();
            if (nData > 0){
                
                if (m.getAddress() == "/oscUpdateCount"){
                    oscUpdateCount = m.getArgAsInt(0);
                }
                if (m.getAddress() == "/nOscFaces"){
                    nOscFaces = m.getArgAsInt(0);
                }
                
                if(m.getAddress() == "/faceLandmarks"){
                    if (nData == (N_FACE_LANDMARKS*2)){
                        faces.clear();
                        Face aFace;
                        for (int i=0; i<N_FACE_LANDMARKS; i++){
                            ofVec2f pt;
                            float px = m.getArgAsFloat(i*2);
                            float py = m.getArgAsFloat(i*2+1);
                            pt.x = px * camW;
                            pt.y = py * camH;
                            aFace.keypoints.push_back(pt);
                        }
                        faces.push_back(aFace);
                    }
                } else if (m.getAddress() == "/faceMetrics"){
                    if (nData == N_FACE_METRICS){
                        for (int i=0; i<N_FACE_METRICS; i++){
                            faceMetrics[i] = m.getArgAsFloat(i);
                        }
                    }
                } else {
                    // cout << "unrecognized OSC message received @ " <<m.getAddress()<< endl;
                }
            }
        }
    }
}


//--------------------------------------------------------------
void ofApp::draw(){
    ofFill();
    ofSetColor(255,255,255,127);
    vidGrabber.draw(0,0, camW,camH);
    drawDebugOSC();
    
    fpsCounter.newFrame();
    ofDrawBitmapStringHighlight("FPS: "+ofToString(fpsCounter.getFps()),50,20);
}


//--------------------------------------------------------------
void ofApp::drawDebugOSC(){
    ofNoFill();
    ofSetColor(255);
    ofSetLineWidth(1);
    ofDrawRectangle(0,0,camW,camH);
    
    // Draw face landmarks
    ofFill();
    ofSetColor(255);
    for (int f=0; f<faces.size(); f++){
        for (int j = 0; j < N_FACE_LANDMARKS; j++){
            ofVec2f p0 = faces[f].keypoints[j];
            ofDrawCircle(p0.x, p0.y, 2);
        }
    }
    
    // Draw face metrics
    ofSetColor(255);
    if (faces.size() > 0){
        float tx = 50;
        float ty = 50;
        float dy = 8;
        float vx0 = tx-5;
        float vx1 = vx0-40;
        for (int i=1; i<N_FACE_METRICS; i++){
            float val = faceMetrics[i];
            float vx = ofMap(val, 0,1, vx0,vx1);
            ofDrawLine(vx0, ty-2, vx, ty-2);
            ty+=dy;
        }
    }
}

//--------------------------------------------------------------
void ofApp::keyPressed(int key){
    if (key == 'X'){
        toggleOSCSource();
    }
}

//--------------------------------------------------------------
void ofApp::toggleOSCSource(){
    ofxOscMessage myMessage;
    myMessage.setAddress("/hide");
    myMessage.addIntArg(123);
    oscSender.sendMessage(myMessage, false);
}

//--------------------------------------------------------------
void ofApp::mouseMoved(int x, int y ){}

//--------------------------------------------------------------
void ofApp::mouseDragged(int x, int y, int button){}

//--------------------------------------------------------------
void ofApp::mousePressed(int x, int y, int button){}

//--------------------------------------------------------------
void ofApp::mouseReleased(int x, int y, int button){}
void ofApp::mouseEntered(int x, int y){}
void ofApp::mouseExited(int x, int y){}
void ofApp::windowResized(int w, int h){}
void ofApp::gotMessage(ofMessage msg){}
void ofApp::dragEvent(ofDragInfo dragInfo){}
void ofApp::keyReleased(int key){}
