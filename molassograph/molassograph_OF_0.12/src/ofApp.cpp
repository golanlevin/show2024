#include "ofApp.h"

/*
 
 Predates but related to Snow Mirror (2006) Danny Rozin
 https://www.smoothware.com/danny/snowmirror.html
 
 Predates but related to Gold (2008) Memo Akten
 https://www.memo.tv/works/gold/
 
 */


//--------------------------------------------------------------
void ofApp::setup(){
    ofLogLevel(OF_LOG_ERROR);
    
    
    ofSetVerticalSync(true);
    bFullScreen = true;
    ofSetFullscreen(bFullScreen);
    ofSetWindowTitle("Molassograph (1998, 2024)");
    ofBackground(0,0,0,0);
    ofHideCursor();
    
    camW = 1280;
    camH = 720;
    imgW = 480;
    imgH = 480;
    fboW = 540;
    fboH = 960;
    dispW = 1080;
    dispH = 1920;
    
    setupOSC();
    setupCamera();
    
    ofDisableArbTex();
    gradientShader.load("shadersGL2/imageGradient");
    
    bFlipHorizontal = true;
    bDrawVideoDebug = false;
    bToggledOscSource = false;
    
    faceSc = 0.0;
    faceTx = faceTy = 0;
    lastOscFaceFrameCount = 0;
    nFramesSinceCameraFace = 0;
    setupImageBuffers();

    setupSimulation();
    setupHistogramEqualizer();
    
    bHideGui = false;
    guiStartTime = ofGetElapsedTimef();
    pauseStartTime = -99999;
    ofxGuiSetDefaultWidth(256);
    gui.setPosition(10, 520);
    gui.setup("Molassograph");
    gui.add(fpsSlider.setup("fpsSlider", 60.0, 0.0, 120.0));
    gui.add(bUsingLiveCamera.setup("bUsingLiveCamera", true));
    gui.add(bSimPaused.setup("bSimPaused", false));
    gui.add(bPlayerPaused.setup("bPlayerPaused", false));
    gui.add(particleFboAlpha.setup("particleFboAlpha", 255.0, 0.0,255.0));
    
    gui.add(haarNeigbors.setup("haarNeigbors", 4, 1, 16));
    gui.add(haarScale.setup("haarScale", 1.12, 1.05, 1.35));
    gui.add(haarRectBlur.setup("haarRectBlur", 0.60, 0.50, 1.0));
    gui.add(gamma.setup("gamma", 2.2, MIN_GAMMA,MAX_GAMMA));
    gui.add(faceDisplayPct.setup("faceDisplayPct", 0.55, MIN_FACE_PCT, MAX_FACE_PCT));
    gui.add(bUseMetrics.setup("bUseMetrics", true));
    
    gui.add(lightingCentroid01.setup("lightDir", 0.5, 0.0, 1.0));
    gui.add(windRangeDeg.setup("windRangeDeg", 70, 0, 90));
    gui.add(windDitherDeg.setup("windDitherDeg", 15, 0, 30));
    gui.add(windSpeedAvg.setup("windSpeedAvg", 2,   MIN_WIND_SPEED, MAX_WIND_SPEED));
    gui.add(windSpeedStd.setup("windSpeedStd", 0.2, 0.0, 0.5));
    gui.add(gradStrength.setup("gradStrength", 0.001, 0.0,MAX_GRAD_STRENGTH));
    gui.add(eddyStrength.setup("eddyStrength", 0.00, -0.01, 0.01));
    
    gui.add(pointSize.setup("pointSize", 2.5, MIN_POINT_SIZE,MAX_POINT_SIZE));
    gui.add(sparkleProb.setup("sparkleProb", 0.0, 0.0,MAX_SPARKLE_PROB));
    gui.add(bShowMicroOSCFace.setup("bShowMicroOSCFace", false));
    gui.add(bShowFaceMetrics.setup("bShowFaceMetrics", false));
    
    // Uncomment this when the program is close to done:
    // gui.loadFromFile("settings.xml");
    videoPlayer.setPaused((bool)bPlayerPaused);
    
    faceDataSource = FACE_FROM_OSC;
    haarFinder.setup("haarcascade_frontalface_default.xml");
    haarFinder.setNeighbors(haarNeigbors);
    haarFinder.setScaleHaar(haarScale);
    haarUpdateCount = 0;
    nHaarFaces = 0;
    lastHaarFaceFrameCount = 0;
    haarW = camW/6;
    haarH = camH/4;
    fpsBlur = (float) fpsSlider;
    
    gammaArray = new float[256];
    for (int i=0; i<256; i++){
        gammaArray[i] = powf(1.0 - i/255.0, gamma);
    }
    
    lastOscUpdateTimeMs = ofGetElapsedTimeMillis(); // used for testing connection
    lastOscCamFaceTimeSec = ofGetElapsedTimef();
}



//--------------------------------------------------------------
void ofApp::setupImageBuffers(){
    // See: https://openprocessing.org/sketch/2219047
    
    camImgC3.allocate(camW, camH);
    vidImgC3.allocate(camW, camH);
    camImgC1.allocate(camW, camH);
    camImgA1.allocate(camW, camH);
    grayImgC1.allocate(camW, camH);
    maskInvBigC1.allocate(camW, camH);
    maskedCamC1.allocate(camW, camH);
    
    maskImgDivisor = 5;
    mskW = camW/maskImgDivisor;
    mskH = camH/maskImgDivisor;
    maskImgC3.allocate(mskW, mskH);
    maskImgC1.allocate(mskW, mskH);
    maskInvC1.allocate(mskW, mskH);
    
    ofFboSettings maskFboSettings;
    maskFboSettings.numSamples = 1;
    maskFboSettings.width = mskW;
    maskFboSettings.height = mskH;
    maskFboSettings.internalformat = GL_RGB;
    maskFbo.allocate(maskFboSettings);
    
    ofFboSettings compFboSmSettings;
    compFboSmSettings.numSamples = 1;
    compFboSmSettings.width = imgW;
    compFboSmSettings.height = imgH;
    compFboSmSettings.internalformat = GL_RGB;
    compFboSm.allocate(compFboSmSettings);
    compFboSm.begin();
    ofClear(MIDDLE_GRAY);
    compFboSm.end();
    
    compC3.allocate(imgW, imgH);
    compC1.allocate(imgW, imgH);
    compC3.set(MIDDLE_GRAY);
    compC1.set(MIDDLE_GRAY);
    
    ofFboSettings fboSettings;
    fboSettings.numSamples = 1;
    fboSettings.width = fboW;
    fboSettings.height = fboH;
    fboSettings.internalformat = GL_RGB;
    fboOutput.allocate(fboSettings);
    fboOutput.begin();
    ofClear(MIDDLE_GRAY);
    fboOutput.end();
    fboOutput.readToPixels(fboOutputPixels);
    
    ofFboSettings fboSettings2;
    fboSettings.width = dispW;
    fboSettings.height = dispH;
    fboSettings.internalformat = GL_RGB;
    fboSettings.numSamples = 4; // MSAA
    fboSettings.useStencil = false;
    fboSettings.useDepth = false;
    fboSettings.minFilter = GL_LINEAR;
    fboSettings.maxFilter = GL_LINEAR;
    
    fboDisplay.allocate(fboSettings);
    fboDisplay.begin();
    ofClear(0,0,0);
    fboDisplay.end();
    
    verticalSum = new float[camW];
}

//--------------------------------------------------------------
void ofApp::setupOSC(){
    if (!oscReceiver.setup(OSC_RX_PORT)){
        ofLogError("ofApp::setupOSC") << "oscReceiver setup failure.";
    }
    if (!oscSender.setup("127.0.0.1", OSC_TX_PORT)){
        ofLogError("ofApp::setupOSC") << "oscSender setup failure.";
    }
    faceMetrics = new float[N_FACE_METRICS];
    for (int i=0; i<N_FACE_METRICS; i++){
        faceMetrics[i] = 0.0;
    }
    oscUpdateCount = 0;
    nOscFaces = 0;
}

//--------------------------------------------------------------
void ofApp::setupCamera(){
    bUsingLiveCamera = true;
    
    // Set up camera
    videoGrabber.setVerbose(true);
    std::vector<ofVideoDevice> devices = videoGrabber.listDevices();
    int whichCameraID = 0;
    if (devices[whichCameraID].bAvailable) {
        videoGrabber.setDesiredFrameRate(30);
        videoGrabber.setDeviceID(whichCameraID);
        videoGrabber.setup(camW, camH);
    } else {
        videoGrabber.setDeviceID(0); // Fallback to default device
        videoGrabber.setup(camW, camH);
    }
        
    // Also load player
    videoPlayer.load("video/golan2.mov");
    videoPlayer.setLoopState(OF_LOOP_NORMAL);
    videoPlayer.setVolume(0.0);
    videoPlayer.play();
    
}

//--------------------------------------------------------------
void ofApp::setupSimulation(){
    PM.clear();
    VM.clear();
    UM.clear();
    
    randomFloats01A = new float[N_MOLASSOGRAPH_PARTICLES];
    randomFloats01B = new float[N_MOLASSOGRAPH_PARTICLES];
    randomFloats01G = new float[N_MOLASSOGRAPH_PARTICLES];
    for (int i=0; i<N_MOLASSOGRAPH_PARTICLES; i++){
        randomFloats01A[i] = ofRandomuf();
        randomFloats01B[i] = ofRandomuf();
        randomFloats01G[i] = myRandomGaussian(); //ofRandomf();
    }
    
    // have direction of travel based on which side has more light
    float baseOrientation = ofDegToRad(90);
    for (int i=0; i<N_MOLASSOGRAPH_PARTICLES; i++){
        float px = ofRandom(0, fboW);
        float py = ofRandom(0, fboH);
        ofVec3f pt3;
        pt3.set(px,py,0);
        PM.addVertex(pt3);
        
        ofVec3f op3;
        float r = ofMap(randomFloats01A[i],0,1, -1,1);
        float deviation = ofDegToRad(windDitherDeg)* r;
        float ori = baseOrientation + deviation;
        float wsStd = windSpeedStd * windSpeedAvg;
        float mag = windSpeedAvg + (randomFloats01G[i] * wsStd);
        mag = max(0.0f, mag);
        op3.set(ori, mag, 0);
        
        float vxa = mag*cos(ori);
        float vya = mag*sin(ori);
        ofVec3f vta;
        vta.set(vxa,vya,0);
        VM.addVertex(vta);
        ofVec3f uta;
        uta.set(vxa,vya,0);
        UM.addVertex(uta);
    }
}

// Function to approximate a Gaussian distribution
float ofApp::myRandomGaussian() {
    float sum = 0.0f;
    int n = 5;
    for (int i = 0; i < n; ++i) {
        sum += ofRandomf();
    }
    return sum / sqrt((float)(n) / 3.0f);
}

//--------------------------------------------------------------
void ofApp::incorporateFaceMetrics(){
    if (faceDataSource == FACE_FROM_OSC && bUseMetrics) {
        if (faces.size() > 0){
            
            float brows01 = faceMetrics[3];
            float smile01 = MAX(faceMetrics[44], faceMetrics[45]);
            float squint01 = MAX(faceMetrics[19], faceMetrics[20]);
            float blink01 = MAX(faceMetrics[9], faceMetrics[10]);
            float frown01 = MAX(faceMetrics[1], faceMetrics[2]);
            float assym01 = (faceMetrics[28] - faceMetrics[29]);
            float jawOpen = faceMetrics[25];
            float pucker  = faceMetrics[38];
            
            float A = 0.92;
            float B = 1.0-A;
            
            // link windSpeedAvg to brows01
            float wsa = (float)(ofMap(powf(brows01,1.5),  0,1, MIN_WIND_SPEED,MAX_WIND_SPEED));
            windSpeedAvg = A*windSpeedAvg + B*wsa;
            windSpeedStd = 0.2;
            
            float sp = ofMap(pucker, 0,1, 0,MAX_SPARKLE_PROB);
            sparkleProb = A*sparkleProb + B*sp;
            
            // link smile to faceDisplayPct
            float fp = (float) (ofMap(powf(smile01,0.5),  0,1, MIN_FACE_PCT, MAX_FACE_PCT));
            faceDisplayPct = A*faceDisplayPct + B*fp;
            
            // link pointSize to squint01
            float ps = (float)(ofMap(powf(squint01,0.5),  0,1, MIN_POINT_SIZE,MAX_POINT_SIZE));
            pointSize = A*pointSize + B*ps;
            
            // link eddyStrength to mouth assymetry
            float es = (float)(assym01 * 0.006);
            eddyStrength = A*eddyStrength + B*es;
                      
            // link gradStrength to frown01
            gradStrength = (float)(ofMap(powf(frown01,0.5),  0,1, 0,MAX_GRAD_STRENGTH));
            
            // link gamma to squint01
            gamma = (float)(ofMap(squint01,  0,1, MIN_GAMMA,MAX_GAMMA));
            
            windDitherDeg = ofMap(powf(jawOpen,0.5), 0,1, 20,0, true);
            
        }
    } else {
        // i.e. faceDataSource == FACE_FROM_HAAR
        windSpeedAvg = ofMap( sin(ofGetElapsedTimef()/11.0), -1,1, MIN_WIND_SPEED,MAX_WIND_SPEED);
        windSpeedStd = ofMap( sin(ofGetElapsedTimef()/17.0), -1,1, 0.05,0.20);
        gamma        = ofMap( sin(ofGetElapsedTimef()/7.0 ), -1,1, MIN_GAMMA,MAX_GAMMA);
        pointSize    = ofMap( sin(ofGetElapsedTimef()/19.0), -1,1, MIN_POINT_SIZE,MAX_POINT_SIZE);
        sparkleProb  = ofMap( sin(ofGetElapsedTimef()/31.0), -1,1, 0,MAX_SPARKLE_PROB/2);
        windDitherDeg= ofMap( sin(ofGetElapsedTimef()/23.0), -1,1, 12,18);
        eddyStrength = sin(ofGetElapsedTimef()/23.0) * 0.001;
        gradStrength = MAX_GRAD_STRENGTH*0.1;
        
        
    }
}


//--------------------------------------------------------------
void ofApp::updateWindOrientation(){

    float val = ofMap(lightingCentroid01, 0.3,0.7, 0,1,true);
    float valDeg = ofMap(val, 0,1,  90-windRangeDeg,90+windRangeDeg);
    float baseOrientation = ofDegToRad(valDeg);
    
    // The app slows down a lot when computing Haar,
    // so speed up the particles to compensate.
    float speedFactor = 1.0;
    if (faceDataSource == FACE_FROM_HAAR){
        float fps = max(fpsCounter.getFps(), 30.0);
        fpsBlur = 0.95*fpsBlur + 0.05*fps;
        fpsBlur = ofClamp(fpsBlur, 10,120);
        speedFactor = 120.0/fpsBlur;
    }
    
    glm::vec3* Uptr = UM.getVerticesPointer();
    for (int i=0; i<N_MOLASSOGRAPH_PARTICLES; i++){
        float r = ofMap(randomFloats01A[i],0,1, -1,1);
        float deviation = ofDegToRad(windDitherDeg)* r;
        float ori = baseOrientation + deviation;
        float wsStd = windSpeedStd * windSpeedAvg;
        float mag = windSpeedAvg + (randomFloats01G[i] * wsStd);
        mag = max(0.0f, mag);
        Uptr[i].x = mag*cos(ori);
        Uptr[i].y = mag*sin(ori);
    }
}

//--------------------------------------------------------------
void ofApp::update(){
    
    if (bToggledOscSource == false){
        if (ofGetElapsedTimef() > 10){
            toggleOSCSource();
            bToggledOscSource = true;
        }
    }
    
    // Acquire latest stored video frame. It might be paused.
    bool bNewPlayerFrame = false;
    if (videoPlayer.isInitialized()){
        videoPlayer.setPaused((bool)bPlayerPaused);
        if (!videoPlayer.isPaused()){
            videoPlayer.update();
            bNewPlayerFrame = videoPlayer.isFrameNew();
            if (bNewPlayerFrame){
                ofPixels vidPixelsC3 = videoPlayer.getPixels();
                vidImgC3.setFromPixels(vidPixelsC3);
            }
        }
    }
    
    // Acquire latest live camera image.
    bool bNewGrabberFrame = false;
    bool bNewGrabberFrameValid = false;
    if (videoGrabber.isInitialized()){
        videoGrabber.update();
        bNewGrabberFrame = videoGrabber.isFrameNew();
        if (bNewGrabberFrame){
            ofPixels camPixelsC3 = videoGrabber.getPixels();
            if((camPixelsC3.isAllocated()) &&
               (camPixelsC3.size() > 0)){
                camImgC3.setFromPixels(camPixelsC3);
                bNewGrabberFrameValid = true;
            } else {
                camImgC3.set(0,0,0);
            }
        }
    }
    
    if (bNewGrabberFrameValid){
        acquireOscData();
        float elapsedSinceLastOscFace = ofGetElapsedTimef() - lastOscCamFaceTimeSec;
        
        if (elapsedSinceLastOscFace > WAIT_FOR_OSC_FACE_DUR){
            // There's no face detected by OSC;
            // Switch to analyzing stored video with HAAR.
            faceDataSource = FACE_FROM_HAAR;
            bUsingLiveCamera = false;
            bPlayerPaused = false;
            //videoPlayer.setPaused(false);
            
            camImgC1 = vidImgC3;
            if (bFlipHorizontal){ camImgC1.mirror(false,true);}
            doHaarDetection();
            
        } else {
            // OSC reports that faces exist.
            faceDataSource = FACE_FROM_OSC;
            bUsingLiveCamera = true;
            bPlayerPaused = true;
            //videoPlayer.setPaused(true);
            
            computeHull();
            camImgC1 = camImgC3;
            if (bFlipHorizontal){ camImgC1.mirror(false,true);}
        }
        
        incorporateFaceMetrics();
        createFaceComposite();
        computeVerticalSum();
        updateWindOrientation();
    }
    
    updateSimulation();
    updateGui();
}



//--------------------------------------------------------------
void ofApp::doHaarDetection(){
    
    if (faceDataSource == FACE_FROM_HAAR){
        
        // Adjust haarScale, our primary tool for affecting framerate in FACE_FROM_HAAR mode.
        float targetFPS = 30.0;
        float actualFPS = fpsSlider;
        if ((actualFPS - targetFPS) < -1.0) {
            haarScale = (float)(haarScale + 0.0001);
        } else if ((actualFPS - targetFPS) > 1.0) {
            haarScale = (float)(haarScale - 0.0001);
        } haarScale = ofClamp(haarScale, 1.05, 1.35);
         
        // Do the actual detection.
        haarFinder.setNeighbors(haarNeigbors);
        haarFinder.setScaleHaar(haarScale);
        
        haarUpdateCount++;
        haarFinder.findHaarObjects(camImgC1);
        nHaarFaces = haarFinder.blobs.size();
        if (nHaarFaces > 0){
            lastHaarFaceFrameCount = haarUpdateCount;
        }
        
    } else {
        haarFinder.blobs.clear();
        nHaarFaces = 0;
    }
}


//--------------------------------------------------------------
void ofApp::computeHull(){
    hull.clear();
    if (faceDataSource == FACE_FROM_OSC){
        if (faces.size() > 0){
            hullInputPoints.clear();
            for (int i=0; i<N_FACE_LANDMARKS; i++){
                ofVec2f vec = faces[0].keypoints[i];
                ofPoint pt;
                pt.set(vec.x, vec.y);
                hullInputPoints.push_back(pt);
            }
            hull = convexHull.getConvexHull(hullInputPoints);
            
            // Compute bounding box of hull
            int nHullPts = hull.size();
            if (nHullPts > 0){
                float bx = 99999;
                float by = 99999;
                float br = -99999;
                float bb = -99999;
                for (int i=0; i<nHullPts; i++){
                    ofPoint pt = hull[i];
                    if (pt.x < bx){ bx = pt.x; }
                    if (pt.y < by){ by = pt.y; }
                    if (pt.x > br){ br = pt.x; }
                    if (pt.y > bb){ bb = pt.y; }
                }
                faceBbox.x = bx;
                faceBbox.y = by;
                faceBbox.width = (br-bx);
                faceBbox.height = (bb-by);
            }
        }
    }
}


//--------------------------------------------------------------
void ofApp::drawVideoDebug(){
    if (bDrawVideoDebug){
        
        float cw = 320.0f;
        float ch = cw * ((float)camH/(float)camW);
        ofFill();
        ofSetColor(255);
        
        ofPushMatrix();
        ofTranslate(0,0);
        videoGrabber.draw(0, 0,   cw,ch);
        maskImgC1.draw   (cw,0,   cw,ch);
        camImgC1.draw    (0, ch,  cw,ch);
        camImgA1.draw    (cw,ch,  cw,ch);
        grayImgC1.draw   (0, ch*2,cw,ch);
        maskedCamC1.draw (cw,ch*2,cw,ch);
        maskInvC1.draw   (0, ch*3,cw,ch);
        vidImgC3.draw    (0, ch*4,cw,ch);
        
        float tx = 10;
        float ty = ch-10;
        ofPushMatrix();
        ofTranslate(tx,ty);
        ofSetColor(255,160,0);
        ofDrawBitmapString("videoGrabber",  0,   0);
        ofDrawBitmapString("maskImgC1",     cw,  0);
        ofDrawBitmapString("camImgC1",      0,   ch);
        ofDrawBitmapString("camImgA1",      cw,  ch);
        ofDrawBitmapString("grayImgC1",     0,   ch*2);
        ofDrawBitmapString("maskedCamC1",   cw,  ch*2);
        ofDrawBitmapString("maskInvC1",     0,   ch*3);
        ofPopMatrix();
        
        // mskW
        ofPushMatrix();
        ofTranslate(cw,ch*2);
        ofScale(cw/camW);
        ofNoFill();
        ofSetColor(255,160,0);
        ofDrawRectangle(faceBbox);
        drawDebugHull();

        ofSetColor(255,160,0);
        for (int x=0; x<camW; x++){
            float val = verticalSum[x]*255.0;
            ofDrawLine(x,0,x,val);
        }
        
        ofPopMatrix();
        ofPopMatrix();
    }
}

//--------------------------------------------------------------
void ofApp::createFaceComposite(){
    
    int blurDim = 17; //1 + 2*((int)(mouseX/10));
    float faceDisplayPercent = 0.55;
    bool bMadeFaceMask = false;
    
    if (faceDataSource == FACE_FROM_OSC){
        
        // Use the convex hull to create a mask image.
        maskFbo.begin();
        ofClear(0,0,0);
        ofPushMatrix();
        ofScale(1.0/maskImgDivisor);
        int nHullPts = hull.size();
        if (nHullPts > 0){
            bMadeFaceMask = true;
            faceDisplayPercent = faceDisplayPct;
            float hullSpacing = mskW/40.0;
            float hullCircR = 3.0;
            
            // Draw the filled hull
            ofFill();
            ofSetColor(255);
            ofBeginShape();
            for (int i=0; i<nHullPts; i++){
                ofVertex(hull[i].x, hull[i].y);
            } ofEndShape();
            
            // Compute resampled hull poly
            ofPolyline hullPoly;
            for (int i=0; i<nHullPts; i++){
                hullPoly.addVertex(hull[i].x, hull[i].y);
            } hullPoly = hullPoly.getResampledBySpacing(hullSpacing);
            
            // Draw resampled hull poly with circles.
            for (int i=0; i<hullPoly.size(); i++){
                ofDrawCircle(hullPoly[i].x, hullPoly[i].y, hullCircR);
            }
            
            // Compute centroid from resampled hull poly
            float tx = 0;
            float ty = 0;
            for (int i=0; i<hullPoly.size(); i++){
                tx += hullPoly[i].x;
                ty += hullPoly[i].y;
            }
            tx /= hullPoly.size();
            ty /= hullPoly.size();
            faceTx = 0.8*faceTx + 0.2*tx;
            faceTy = 0.8*faceTy + 0.2*ty;
            
            // Get scale
            float hx = faces[0].keypoints[10].x;
            float hy = faces[0].keypoints[10].y;
            float bx = faces[0].keypoints[152].x;
            float by = faces[0].keypoints[152].y;
            float len = ofDist(hx,hy,bx,by);
            faceSc = (imgH*faceDisplayPercent)/len;
            
            // Get blurDim
            facePercent = MIN(1.0, len/camH);
            blurDim = ((int)(facePercent * 16.0 * (camH/720.0) ))*2+1;
            blurDim = MAX(3,blurDim);
        }
        ofPopMatrix();
        maskFbo.end();
        
    } else if (faceDataSource == FACE_FROM_HAAR){
        maskFbo.begin();
        ofClear(0,0,0);
        ofPushMatrix();
        ofScale(1.0/maskImgDivisor);
        nHaarFaces = haarFinder.blobs.size();
        if (nHaarFaces > 0){
            bMadeFaceMask = true;
            faceDisplayPercent = faceDisplayPct * 1.2;
            
            int largestHaarIndex = 0;
            int largestHaarWidth = 0;
            for (int i = 0; i < nHaarFaces; i++) {
                ofRectangle hr = haarFinder.blobs[i].boundingRect;
                if (hr.width > largestHaarWidth){
                    largestHaarWidth = hr.width;
                    largestHaarIndex = i;
                }
            }
            
            ofRectangle hr = haarFinder.blobs[largestHaarIndex].boundingRect;
            float haarFactorH = 1.20;
            float haarFactorW = 0.70;
            float haarFaceCenterY = 0.50;
            
            float tx = hr.x + hr.width*0.50;
            float ty = hr.y + hr.height*haarFaceCenterY;
            
            float A = haarRectBlur;
            float B = 1.0-A;
            faceTx = A*faceTx + B*tx;
            faceTy = A*faceTy + B*ty;
            float hw = hr.width * haarFactorW;
            float hh = hr.height * haarFactorH;
            haarW = A*haarW + B*hw;
            haarH = A*haarH + B*hh;
            float fs = (imgH*faceDisplayPercent)/haarH;
            faceSc = A*faceSc + B*fs;
            facePercent = MIN(1.0, haarH/camH);
            blurDim = ((int)(facePercent * 16.0 * (camH/720.0) ))*2+1;
            blurDim = MAX(3,blurDim);
            
            faceBbox.x = (faceTx - haarW*0.50);
            faceBbox.y = (faceTy - haarH*haarFaceCenterY);
            faceBbox.width = haarW;
            faceBbox.height = haarH;
            
            ofFill();
            ofSetColor(255);
            ofPushMatrix();
            ofTranslate(faceTx,faceTy);//tx,ty);
            ofDrawEllipse(0,0,haarW,haarH);
            ofPopMatrix();
        }
        ofPopMatrix();
        maskFbo.end();
    }

    maskFbo.readToPixels(maskFboPixels);
    maskImgC3.setFromPixels(maskFboPixels);
    maskImgC1 = maskImgC3;
    maskImgC1.blur(blurDim);
    
    
    // Alter gamma of mask image
    ofPixels& minvc1p = maskImgC1.getPixels();
    unsigned char *minvc1pBuf = minvc1p.getData();
    int nBytes = maskImgC1.width * maskImgC1.height;
    for (int i=0; i<nBytes; i++){
        int b = minvc1pBuf[i];
        if (b > 0){
            minvc1pBuf[i] = (int)(255.0 * sqrtf(b/255.0));
        }
    }

    maskInvC1 = maskImgC1;
    maskInvC1.invert();
    maskInvBigC1.scaleIntoMe(maskInvC1, CV_INTER_LINEAR);
    
    camImgA1.scaleIntoMe(maskImgC1, CV_INTER_LINEAR);
    camImgA1 *= camImgC1;
    if (bMadeFaceMask){
        modImageByHistogram (camImgA1, 0.4);
    }
    
    // Create composite image
    grayImgC1.set(MIDDLE_GRAY);
    grayImgC1 *= maskInvBigC1;
    maskedCamC1 = grayImgC1;
    maskedCamC1 += camImgA1;
    
    // Create centered/scaled composite
    compFboSm.begin();
    ofFill();
    ofPushMatrix();
    ofTranslate(imgW/2,imgH/2);
    ofScale(faceSc);
    ofTranslate(-faceTx,-faceTy);
    ofEnableBlendMode(OF_BLENDMODE_ALPHA);
    float alphaBase = 64;
    float faceAlpha = alphaBase;
    
    int nFaces = (faceDataSource==FACE_FROM_HAAR)?nHaarFaces:nOscFaces;
    if (nFaces == 0){
        float nFramesToFade = 120;
        int nfsf = (faceDataSource == FACE_FROM_HAAR) ?
        (haarUpdateCount - lastHaarFaceFrameCount) :
        (oscUpdateCount  - lastOscFaceFrameCount);
        nfsf = MIN(nfsf, nFramesToFade);
        faceAlpha = alphaBase * pow(nfsf/nFramesToFade, 2.0);
    }
    
    
    ofSetColor(255,255,255, faceAlpha);
    maskedCamC1.draw(0,0,camW,camH);
    ofSetColor(MIDDLE_GRAY); // fill in periphery
    ofDrawRectangle(0-camW,camH,camW*3,camH);
    ofDrawRectangle(0-camW,0,camW,camH);
    ofDrawRectangle(0-camW,0-camH,camW*3,camH);
    ofDrawRectangle(camW,0,camW,camH);
    ofPopMatrix();
    ofEnableBlendMode(OF_BLENDMODE_DISABLED);
    ofDisableBlendMode();
    compFboSm.end();
    compFboSm.readToPixels(compFboSmPixels);
    compC3.setFromPixels(compFboSmPixels);
    compC1 = compC3;
    compC1.blurGaussian(9);
    
    
    // Draw composite into final fbo
    fboOutput.begin();
    gradientShader.begin();
    float blurAmt = 1.5; //ofMap(mouseX, 0,ofGetWidth(), 0, 4.0, true);
    gradientShader.setUniform1f("blurAmnt", blurAmt);
    gradientShader.setUniform1f("texwidth", fboW);
    ofFill();
    ofSetColor(255);
    ofPushMatrix();
    ofTranslate(fboW/2,fboH/2);
    ofScale((float)fboH/(float)imgH);
    compC1.draw(0-imgW/2,0-imgH/2,imgW,imgW);
    ofPopMatrix();
    gradientShader.end();
    fboOutput.end();
    // long then = ofGetElapsedTimeMicros();
    fboOutput.readToPixels(fboOutputPixels);
    // fboOutput.getTexture().getTextureData();
    // long now = ofGetElapsedTimeMicros();
    // printf("elapsed = %d\n", (int) (now-then));
}

void ofApp::computeVerticalSum(){
    for (int i=0; i<camW; i++){ verticalSum[i] = 0.0f; }
    unsigned char* pix = maskedCamC1.getPixels().getData();
    
    int x0 = (int)(faceBbox.x);
    int x1 = (int)(faceBbox.x + faceBbox.width);
    int y0 = (int)(faceBbox.y);
    int y1 = (int)(faceBbox.y + faceBbox.height);
    x0 = ofClamp(x0, 0, camW-1); x1 = ofClamp(x1, 0, camW-1);
    y0 = ofClamp(y0, 0, camH-1); y1 = ofClamp(y1, 0, camH-1);
    if ((y1 > y0) && (x1 > x0)){

        // Calc vertical sum;
        for (int x=x0; x<x1; x++){
            verticalSum[x] = 0.0f;
            for (int y=y0; y<y1; y++){
                int index = y*camW + x;
                unsigned char val = pix[index];
                verticalSum[x] += (float) val;
            }
            verticalSum[x] /= (float)(y1-y0);
            verticalSum[x] /= 255.0;
            verticalSum[x] = powf(verticalSum[x],2.0);
        }
        
        // Find 1D weighted centroid
        float val = 0;
        float sum = 0;
        for (int x=x0; x<x1; x++){
            sum += verticalSum[x];
            val += x * verticalSum[x];
        }
        if (sum > 0){
            val /= sum;
            val = ofMap(val, x0,x1, 0,1);
            val = ofClamp(val, 0,1);
            lightingCentroid01 = (float) val;
        }
    }
    
    
}


//----------------------------------------------------------------------
void ofApp::setupHistogramEqualizer(){
    nHistogramBuckets = 256;
    srcHistogram32s = new int[nHistogramBuckets];
    distr           = new int[nHistogramBuckets];
    transform       = new unsigned char[nHistogramBuckets];
    lutLevels       = new unsigned char[nHistogramBuckets];
    finalLut        = new unsigned char[nHistogramBuckets];
    for (int i=0; i<nHistogramBuckets; i++){
        srcHistogram32s[i]      = 0;
        distr[i]                = 0;
        transform[i]            = i;
        lutLevels[i]            = i;
        finalLut[i]             = i;
    }
}

//----------------------------------------------------------------------
void ofApp::computeHistogram(ofxCvGrayscaleImage &img) {
    // Convert ofxCvGrayscaleImage to cv::Mat
    IplImage* iplImg = img.getCvImage();
    cv::Mat matImg = cv::cvarrToMat(iplImg);

    // Parameters for histogram
    float range[] = {0, 256}; // the upper boundary is exclusive
    const float* histRange = { range };
    bool uniform = true, accumulate = false;

    // Compute the histogram
    cv::Mat hist;
    // Because our input image has mostly black pixels, 
    // we can use it as a mask to speed things up!
    // Else use cv::Mat() in the fourth argument.
    cv::calcHist(&matImg, 1, 0, matImg, hist, 1, &nHistogramBuckets, &histRange, uniform, accumulate);
    
    // Extract the histogram values
    for (int i=0; i<nHistogramBuckets; i++) {
        float binVal = hist.at<float>(i);
        srcHistogram32s[i] = (int)binVal;
    }
    
    // Clamp the histogram values
    for (int i=0; i<nHistogramBuckets; i++){
        srcHistogram32s[i] = MAX(0,MIN(32767, srcHistogram32s[i]));
    }
    
    // Clobber (ramp) the far ends of the histograms, which are causing solarization!
    int rampLen = 3;
    for (int j=0; j<=rampLen; j++){
        float frac = MAX(0,MIN(1, (float)(j)/(float)(rampLen)));
        srcHistogram32s[j]     = (int)((    frac) * srcHistogram32s[    j]);
        srcHistogram32s[255-j] = (int)((1.0-frac) * srcHistogram32s[255-j]);
    }
}

//----------------------------------------------------------------------
void ofApp::applyLUTToImage(ofxCvGrayscaleImage &inputImage, unsigned char *myLut) {
    IplImage* inputIplImg = inputImage.getCvImage();
    cv::Mat matImage = cv::cvarrToMat(inputIplImg);
    cv::Mat lut(1, 256, CV_8UC1, myLut);
    cv::Mat outputMat;
    cv::LUT(matImage, lut, outputMat);
    inputImage.setFromPixels(outputMat.data, outputMat.cols, outputMat.rows);
}

//----------------------------------------------------------------------
void ofApp::modImageByHistogram (ofxCvGrayscaleImage &inputImg,float amount01){
    float constant;
    float intercept;            // histogram 0-intercept
    float slope = 0.0;          // histogram slope
    float z;
    int maxBinVal = 255;        // maximum value of histogram
    long ntotal = 0;
    
    computeHistogram (inputImg);
    
    // construct cumumlative distribution, based on the smoothed histogram
    histdistr (srcHistogram32s, nHistogramBuckets, distr);
    
    // total summation under cumulative distribution omits
    // 1/2 of lowest and highest occupied bins.
    ntotal = distr[nHistogramBuckets - 1];
    
    // histogram equalization
    constant = ((float) maxBinVal) / (float) ntotal;
    for (int i=0; i<=maxBinVal; i++){
        transform[i] = (unsigned char) (constant * distr[i] + 0.5);
    }
    for (int i=0; i<256; i++){
        float val = (amount01)*(float)transform[i] + (1.0-amount01)*(float)lutLevels[i];
        finalLut[i] = (int)(val);
    }
    
    applyLUTToImage(inputImg, finalLut);
}

//----------------------------------------------------------------------
void ofApp::histdistr (int *hist, int nBins, int *distr) {
    int binLow;          // lowest and highest occupied bins
    int binHigh, bin;    // histogram bin incrementor
    float total = 0.0;   // floating point cumulative distr.

    // find lowest and highest occupied bins
    for (binLow=0; binLow < nBins; binLow++)
        if (hist[binLow] != 0)
            break;
    for (binHigh = nBins-1; binHigh >= 0; binHigh--)
        if (hist[binHigh] != 0)
            break;
    // compute cumulative distribution
    for (bin = 0; bin <= binLow; bin++){ distr[bin] = 0;}
    for (bin = binLow+1; bin <= binHigh; bin++) {
        total += ((hist[bin-1] + hist[bin]) / 2.0);
        distr[bin] = (long) (total + 0.5);
    }
    for (bin = binHigh+1; bin<nBins; bin++){
        distr[bin] = distr[bin-1];
    }
}


//--------------------------------------------------------------
void ofApp::drawHistogram(){
    float maxVal = 0;
    for (int i=0; i<nHistogramBuckets; i++){
        float val = (float) srcHistogram32s[i];
        if (val > maxVal){ maxVal = val;}
    }
    ofSetColor(160);
    for (int i=0; i<nHistogramBuckets; i++){
        float val = (float) srcHistogram32s[i];
        ofDrawLine(i,0, i, 10 + 256 * val/maxVal);
    }
}

//--------------------------------------------------------------
void ofApp::drawDebugHull(){
    int nHullPts = (int) hull.size();
    if (nHullPts > 0){
        ofNoFill();
        ofSetLineWidth(1.0);
        ofSetColor(0,255,0);
        ofBeginShape();
        for (int i=0; i<nHullPts; i++){
            ofPoint pt = hull[i];
            ofVertex(pt.x, pt.y);
        }
        ofEndShape();
    }
}

//--------------------------------------------------------------
void ofApp::updateGui(){
    fpsSlider = (float) fpsCounter.getFps();
    float now = ofGetElapsedTimef();
    float elapsed = now - guiStartTime;
    if ((bHideGui == false) && (elapsed > DISPLAY_GUI_DUR_S)){
        bHideGui = true;
    }
    
    if ((bHideGui == false) || (bDrawVideoDebug == true)){
        ofShowCursor();
    } else { /*  if (bFullScreen ){  */
        ofHideCursor();
    }
}

//--------------------------------------------------------------
// Save some configs of different params
// When there's lots of motion, or face metric change, switch

void ofApp::updateSimulation(){
    if (!bSimPaused){
        
        glm::vec3* Pptr = PM.getVerticesPointer();
        glm::vec3* Vptr = VM.getVerticesPointer();
        glm::vec3* Uptr = UM.getVerticesPointer();
        
        const int nVerts = PM.getNumVertices();
        const int W = fboW;
        const int H = fboH;
        
        for (int i=0; i<256; i++){
            gammaArray[i] = powf(1.0f - i/255.0, gamma);
        }
        
        for (int i=0; i<nVerts; i++){
            int px = (int) ofClamp(roundf(Pptr[i].x),0,W-1);
            int py = (int) ofClamp(roundf(Pptr[i].y),0,H-1);
            int pIndex = (py*fboW + px) * 3;
            float gx = fboOutputPixels[pIndex  ]-128;
            float gy = fboOutputPixels[pIndex+1]-128;
            float gm = gammaArray[ fboOutputPixels[pIndex+2] ];
            
            Vptr[i].x = (Uptr[i].x * gm) + gx*gradStrength - gy*eddyStrength;
            Vptr[i].y = (Uptr[i].y * gm) + gy*gradStrength + gx*eddyStrength;
            
            // Integrate
            Pptr[i] += Vptr[i];
            
            // Loop around
            if (Pptr[i].x >= W){
                Pptr[i].x -= W;
            } else if (Pptr[i].x < 0){
                Pptr[i].x += W;
            }
            if (Pptr[i].y >= H){
                Pptr[i].y -= H;
            } else if (Pptr[i].y < 0){
                Pptr[i].y += H;
            }
        }
    } else if (bSimPaused){
        float now = ofGetElapsedTimef();
        float elapsed = now - pauseStartTime;
        if (elapsed > PAUSE_DUR_S){
            bSimPaused = false;
        }
    }
}



//--------------------------------------------------------------
void ofApp::acquireOscData(){
    if (!oscReceiver.isListening()) {return;}
    while(oscReceiver.hasWaitingMessages()){
        ofxOscMessage m;
        if (oscReceiver.getNextMessage(m)) {
            int nData = (int)m.getNumArgs();
            if (nData > 0){
                
                if (m.getAddress() == "/oscUpdateCount"){
                    oscUpdateCount = m.getArgAsInt(0);
                    lastOscUpdateTimeMs = ofGetElapsedTimeMillis();
                }
                
                if (m.getAddress() == "/nOscFaces"){
                    faces.clear();
                    nOscFaces = m.getArgAsInt(0);
                    if (nOscFaces > 0){
                        lastOscFaceFrameCount = oscUpdateCount;
                        lastOscCamFaceTimeSec = ofGetElapsedTimef();
                    }
                }
                    
                if (m.getAddress() == "/faceLandmarks"){
                    if (nData == (N_FACE_LANDMARKS*2)){
                        // faces.clear();
                        Face aFace;
                        for (int i=0; i<N_FACE_LANDMARKS; i++){
                            ofVec2f pt;
                            float px = m.getArgAsFloat(i*2);
                            float py = m.getArgAsFloat(i*2+1);
                            if (bFlipHorizontal){
                                pt.x = (1.0-px) * camW;
                            } else {
                                pt.x = px * camW;
                            }
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
                }
            }
        }
    }
}


//--------------------------------------------------------------
void ofApp::draw(){
    fpsCounter.newFrame();
    ofBackground(0);
    
    ofSetColor(255);
    scaledFboRect = ofRectangle(0,0, fboW, fboH);//ofGetWidth(), ofGetHeight()); //fboW/2,fboH/2);
    
    drawSimulation();
    drawVideoDebug();
    drawDebugOSC();
    
    ofSetColor(255);
    // fboOutput.draw(0, 0);
    

    
    // ofSetColor(255);
    // camImgC1.draw(0,0, camW/2, camH/2);
    // compC1.draw(0,camH/2, imgW, imgH);
    // drawHistogram();
    
    
    
    
    if(!bHideGui){
        gui.draw();
    }
      
}

//--------------------------------------------------------------
void ofApp::drawSimulation(){
    
    fboDisplay.begin();
    // ofClear(0,0,40, 10);
    ofSetColor(0,0,0, 96);
    ofFill();
    ofDrawRectangle(0,0, dispW, dispH);
    float sc = dispW/fboW;
    
    ofNoFill();
    glPointSize(pointSize);
    ofEnableAntiAliasing();
    glEnable(GL_POINT_SMOOTH);
    glHint(GL_POINT_SMOOTH_HINT, GL_NICEST);
    ofEnableBlendMode(OF_BLENDMODE_ADD);
    ofSetColor(255,128);
    ofPushMatrix();
    ofScale(sc);
    PM.drawVertices();
    ofPopMatrix();
    ofEnableBlendMode(OF_BLENDMODE_DISABLED);
    
    bool bDoSparkles = true;
    if (bDoSparkles){
        ofFill();
        ofSetColor(255);
        ofSetLineWidth(1.0);
        glm::vec3* Pptr = PM.getVerticesPointer();
        glm::vec3* Vptr = VM.getVerticesPointer();
        int nVerts = PM.getNumVertices();
        int nVertsFrac = (int)(nVerts * sparkleProb);
        float sparkLength = 10.0;
        
        for (int i=0; i<nVerts; i++){
            bool bDo = false;
            int ri = i;
            if (i < nVertsFrac){
                bDo = true;
            } else if (ofRandom(1.0) < 0.0001){
                ri = (int) ofRandom(nVertsFrac, nVerts);
                bDo = true;
            }
            if (bDo){
                float px = sc*Pptr[ri].x;
                float py = sc*Pptr[ri].y;
                float dx = Vptr[ri].x;
                float dy = Vptr[ri].y;
                float dh = sqrt(dx*dx+dy*dy);
                dx = sparkLength*dx/dh;
                dy = sparkLength*dy/dh;
                ofDrawLine(px-dx,py-dy, px+dx,py+dy);
            }
        }
    }
    
    
    
    fboDisplay.end();
    float dispWf = ofGetHeight() * (float)dispW/(float)dispH;
    scaledFboRect = ofRectangle(0,0,dispWf,ofGetHeight());
    
    ofSetColor(255,255,255,particleFboAlpha); 
    fboDisplay.draw( scaledFboRect );
    
    

    /*
    fboOutput.begin();
     
     OF_BLENDMODE_DISABLED
     ///     OF_BLENDMODE_ALPHA
     ///     OF_BLENDMODE_ADD
     ///     OF_BLENDMODE_SUBTRACT
     ///     OF_BLENDMODE_MULTIPLY
     ///     OF_BLENDMODE_SCREEN
     ///

    // ofDisableAlphaBlending();
     // ofDisableAntiAliasing();
     // ofDisableDepthTest();
     // ofDisablePointSprites();
     // ofDisableSmoothing();
    
    ofClear(0,0,0);
    ofSetLineWidth(1);
    ofSetColor(255);
    ofNoFill();
    int then = ofGetElapsedTimeMicros();
    // PM.drawVertices();
    int now = ofGetElapsedTimeMicros();
    // printf("elapsed: %d\n", (now-then));
    fboOutput.end();
    
    ofSetColor(255);
    scaledFboRect = ofRectangle(0,0,fboW/2,fboH/2);
    fboOutput.draw( scaledFboRect );
     */
    
}

//--------------------------------------------------------------
void ofApp::drawDebugOSC(){
    if (bShowMicroOSCFace){
        
        bool bShowFacePoints = true;
        
        ofNoFill();
        ofSetColor(255);
        ofSetLineWidth(1);
        
        if (bShowFacePoints){
            // Draw face landmarks. Somehow, drawing these landmarks
            // (even if they're offscreen) speeds up everything by 10fps
            ofFill();
            ofSetColor(255,255,255,128);
            for (int f=0; f<faces.size(); f++){
                for (int j = 0; j < N_FACE_LANDMARKS; j++){
                    ofVec2f p = faces[f].keypoints[j];
                    float px = p.x - faceTx;
                    float py = p.y - faceTy;
                    ofDrawRectangle(20 + 0.05*px, 20 +0.05*py, 1,1);
                    //  ofDrawRectangle(px,py, 1,1);
                }
            }
        }
    }
        
    if (bShowFaceMetrics){
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
                ofSetColor(64);
                ofDrawLine(vx0, ty-2, vx1, ty-2);
                ofSetColor(255);
                ofDrawLine(vx0, ty-2, vx, ty-2);
                ty+=dy;
            }
        }
    }
}

//--------------------------------------------------------------
void ofApp::keyPressed(int key){

    if ((key == 'D') || (key == 'd')){
        bDrawVideoDebug = !bDrawVideoDebug;
        if (bDrawVideoDebug){
            bHideGui = false;
            guiStartTime = ofGetElapsedTimef();
        }
    } else if (key == 'X'){
        toggleOSCSource();
    } else if (key == 'F'){
        bFullScreen = !bFullScreen;
        ofSetFullscreen(bFullScreen);
    } else if (key == 'S'){
        gui.saveToFile("settings.xml");
    } else if(key == 'L'){
        gui.loadFromFile("settings.xml");
    } else if ((key == 'G') || (key == 'g')){
        bHideGui = !bHideGui;
        if (bHideGui == false){
            guiStartTime = ofGetElapsedTimef();
        }
    } else if (key == ' '){
        bSimPaused = !bSimPaused;
        if (bSimPaused){
            pauseStartTime = ofGetElapsedTimef();
        }
    } else if (key == 'O'){
        bShowMicroOSCFace = !bShowMicroOSCFace;
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
void ofApp::mouseMoved(int x, int y ){
    if (bHideGui == false){
        guiStartTime = ofGetElapsedTimef();
    }
}
void ofApp::mouseDragged(int x, int y, int button){
}
void ofApp::mousePressed(int x, int y, int button){
}
void ofApp::mouseReleased(int x, int y, int button){
}


void ofApp::mouseEntered(int x, int y){}
void ofApp::mouseExited(int x, int y){}
void ofApp::windowResized(int w, int h){}
void ofApp::gotMessage(ofMessage msg){}
void ofApp::dragEvent(ofDragInfo dragInfo){}
void ofApp::keyReleased(int key){}

