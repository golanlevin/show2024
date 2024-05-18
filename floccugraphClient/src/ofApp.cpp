#include "ofApp.h"

/*
 
 Todo:
 - Add ofGUI for easy prototyping
 - Create settings file with camera name, Electron app filepath
 - Connect particle system to face metrics
 - Add floccular hair system
 - Make saved settings; switch when something 'happens'
 - Have preloaded faces when none are in view
 - Have particle wind affected by orientation of head
 - Have OF app launch electron app via command line
 
 Related to Snow Mirror (2006) Danny Rozin
 https://www.smoothware.com/danny/snowmirror.html
 
 Related to Gold (2008) Memo Akten
 https://www.memo.tv/works/gold/
 
 */
/*
 defaults write com.apple.VideoEffectCamera ReactionsEnabled -bool false
 */

//--------------------------------------------------------------
void ofApp::setup(){
    ofLogLevel(OF_LOG_ERROR);
    lastOscUpdateTimeMs = ofGetElapsedTimeMillis();
    setup2ndMonitor();
    
    ofBackground(0,0,0,0);
    
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
    bDrawFaceDebug = true;
    bDrawVideoDebug = false;
    handyBool = true;
    
    faceSc = 0.0;
    faceTx = faceTy = 0;
    lastOscFaceFrameCount = 0;
    setupImageBuffers();
    
    faceDataSource = FACE_FROM_OSC;
    haarFinder.setup("haarcascade_frontalface_default.xml");
    haarFinder.setNeighbors(6);
    haarFinder.setScaleHaar(1.2);
    haarUpdateCount = 0;
    nHaarFaces = 0;
    lastHaarFaceFrameCount = 0;
    haarW = camW/6;
    haarH = camH/4;
    
    setupSimulation();
    setupHistogramEqualizer();
}

//--------------------------------------------------------------
void ofApp::setup2ndMonitor(){
    bFullScreen = false;
    ofAppGLFWWindow* win = dynamic_cast<ofAppGLFWWindow*>(ofGetWindowPtr());
    if (win) {
        int monitorCount = 0;
        GLFWmonitor** monitors = glfwGetMonitors(&monitorCount);
        
        // Check if more than one monitor is available and the pointer is valid
        if ((monitorCount>1) && monitors) {
            GLFWwindow* glfwWindow = win->getGLFWWindow();
            
            int m0x, m0y;
            const GLFWvidmode* monitor0Mode = glfwGetVideoMode(monitors[0]);
            glfwGetMonitorPos(monitors[0], &m0x, &m0y);
            int m1x, m1y;
            const GLFWvidmode* monitor1Mode = glfwGetVideoMode(monitors[1]);
            glfwGetMonitorPos(monitors[1], &m1x, &m1y);
            
            // Get the video mode of the second monitor
            if (monitor1Mode) {
                // Move the window to the second monitor
                if (monitor1Mode->width < monitor1Mode->height){
                    glfwSetWindowPos(glfwWindow, m1x, m1y);
                    ofSetFrameRate(60.0);
                    bFullScreen = true;
                    ofSetFullscreen(bFullScreen);
                    ofHideCursor();
                }
            }
        }
    }
}

//--------------------------------------------------------------
void ofApp::setupImageBuffers(){
    // See: https://openprocessing.org/sketch/2219047
    
    camImgC3.allocate(camW, camH);
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
    fboSettings.numSamples = 4;
    fboSettings.width = dispW;
    fboSettings.height = dispH;
    fboSettings.internalformat = GL_RGB;
    fboDisplay.allocate(fboSettings);
    fboDisplay.begin();
    ofClear(0,0,0);
    fboDisplay.end();
    
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
    vidGrabber.setVerbose(true);
    vidGrabberFrameCount = 0;
    
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
        camW = 1280;
        camH = 720;
        vidGrabber.setDeviceID(0); // Fallback to default device
        vidGrabber.setup(camW, camH);
    }
}

//--------------------------------------------------------------
void ofApp::setupSimulation(){
    PM.clear();
    VM.clear();
    UM.clear();
    OM.clear();
    
    float baseOrientation = ofDegToRad(40); //ofRandom(TWO_PI);
    for (int i=0; i<20000; i++){
        float px = ofRandom(0, fboW);
        float py = ofRandom(0, fboH);
        ofVec3f pt3;
        pt3.set(px,py,0);
        PM.addVertex(pt3);
        
        ofVec3f op3;
        float deviation = ofDegToRad(15)*ofRandom(-1,1);
        float ori = baseOrientation + deviation;
        float mag = ofRandom(1,3);
        op3.set(ori, mag, 0);
        
        float vxa = mag*cos(ori); //ofRandom(1.0);
        float vya = mag*sin(ori); //ofRandom(1.0);
        ofVec3f vta;
        vta.set(vxa,vya,0);
        VM.addVertex(vta);
        ofVec3f uta;
        uta.set(vxa,vya,0);
        UM.addVertex(uta);
    }
}

//--------------------------------------------------------------
void ofApp::update(){
    bool bNewFrame = false;
    if(vidGrabber.isInitialized()){
       
        vidGrabber.update();
        bNewFrame = vidGrabber.isFrameNew();
        if (bNewFrame){
            processOSC();
            handleFailure();
            processHaar();
            
            computeHull();
            createFaceComposite();
            vidGrabberFrameCount++;
        }
    }
    updateSimulation();
}



//--------------------------------------------------------------
void ofApp::processHaar(){
    if (faceDataSource == FACE_FROM_HAAR){
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
    if (faces.size() > 0){
        hullInputPoints.clear();
        for (int i=0; i<N_FACE_LANDMARKS; i++){
            ofVec2f vec = faces[0].keypoints[i];
            ofPoint pt;
            pt.set(vec.x, vec.y);
            hullInputPoints.push_back(pt);
        }
        hull = convexHull.getConvexHull(hullInputPoints);
    }
}


//--------------------------------------------------------------
void ofApp::drawVideoDebug(){
    if (bDrawVideoDebug){
        
        float cw = 320;
        float ch = cw * ((float)camH/(float)camW);
        ofSetColor(255);
        
        ofPushMatrix();
        ofTranslate(0,0);
        vidGrabber.draw(0,0,cw,ch);
        maskImgC1.draw(cw,0,cw,ch);
        camImgC1.draw(0,ch, cw,ch);
        camImgA1.draw(cw,ch, cw,ch);
        grayImgC1.draw(0,ch*2, cw,ch);
        maskedCamC1.draw(cw,ch*2, cw,ch);
        maskInvC1.draw(0,ch*3,cw,ch);
        ofPopMatrix();
    }
}

//--------------------------------------------------------------
void ofApp::createFaceComposite(){
    
    int blurDim = 17; //1 + 2*((int)(mouseX/10));
    float faceDisplayPercent = 0.55; //1.15;
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
            faceDisplayPercent = 0.55; //ofMap(mouseX,0,ofGetWidth(),0,1);//0.55 * 
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
            faceDisplayPercent = 0.66;
            
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
            float tx = hr.x + hr.width*0.5;
            float ty = hr.y + hr.height*0.4;
            faceTx = 0.9*faceTx + 0.1*tx;
            faceTy = 0.9*faceTy + 0.1*ty;
            float hw = hr.width * haarFactorW;
            float hh = hr.height * haarFactorH;
            haarW = 0.9*haarW + 0.1*hw;
            haarH = 0.9*haarH + 0.1*hh;
            float fs = (imgH*faceDisplayPercent)/haarH;
            faceSc = 0.9*faceSc + 0.1*fs;
            facePercent = MIN(1.0, haarH/camH);
            blurDim = ((int)(facePercent * 16.0 * (camH/720.0) ))*2+1;
            blurDim = MAX(3,blurDim);
            
            ofFill();
            ofSetColor(255);
            ofPushMatrix();
            ofTranslate(tx,ty);
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
    
    // Create a masked image of the camera
    ofPixels& camPixelsC3 = vidGrabber.getPixels();
    if(camPixelsC3.isAllocated() && (camPixelsC3.size() > 0)){
        camImgC3.setFromPixels(camPixelsC3);
    } else { camImgC3.set(0,0,0); }
    camImgC1 = camImgC3;
    if (bFlipHorizontal){
        camImgC1.mirror(false,true);
    }
    // camImgC1.blurGaussian(7);
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
        int nFramesSinceFace = (faceDataSource == FACE_FROM_HAAR) ?
        (haarUpdateCount - lastHaarFaceFrameCount) :
        (oscUpdateCount  - lastOscFaceFrameCount);
        nFramesSinceFace = MIN(nFramesSinceFace, nFramesToFade);
        faceAlpha = alphaBase * pow(nFramesSinceFace/nFramesToFade, 2.0);
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
    int nHullPts = hull.size();
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
// Save some configs of different params
// When there's lots of motion, or face metric change, switch

void ofApp::updateSimulation(){
    glm::vec3* Pptr = PM.getVerticesPointer();
    glm::vec3* Vptr = VM.getVerticesPointer();
    glm::vec3* Uptr = UM.getVerticesPointer();
    
    const int nVerts = PM.getNumVertices();
    const int W = fboW;
    const int H = fboH;
    
    float my = 2.2; //ofMap(mouseY, 0,ofGetHeight(), 0,4); //4);
    
    float smile01 = 0;
    float squint01 = 0;
    float brows01 = 0;
    float blink01 = 0;
    if (faceDataSource == FACE_FROM_OSC){
        smile01 = MAX(faceMetrics[44], faceMetrics[45]);
        squint01 = MAX(faceMetrics[19], faceMetrics[20]);
        blink01 = MAX(faceMetrics[9], faceMetrics[10]);
        brows01 = faceMetrics[3];
    }
    // my = 3.0*(1-brows01);
   // my += 1.0*squint01;
   // my -= 2.0*pow(blink01, 0.5);
  
    for (int i=0; i<nVerts; i++){
        int px = (int) ofClamp(roundf(Pptr[i].x),0,W-1);
        int py = (int) ofClamp(roundf(Pptr[i].y),0,H-1);
        int pIndex = (py*fboW + px) * 3;
        float gx = fboOutputPixels[pIndex  ]-MIDDLE_GRAY;
        float gy = fboOutputPixels[pIndex+1]-MIDDLE_GRAY;
        float gm = fboOutputPixels[pIndex+2];
        
        // gm = 2*MAX(0,gm-MIDDLE_GRAY);
        gm = pow(1-gm/255.0,my);
        
        Vptr[i].x = Uptr[i].x * gm ;//+ gx*my - gy*my*0.1;
        Vptr[i].y = Uptr[i].y * gm ;//+ gy*my + gx*my*0.1;
        
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

    
}

//--------------------------------------------------------------
void ofApp::handleFailure(){
    
    
    // HANDLE LACK OF OSC MESSAGES
    // If no OSC messages have been received for a while,
    //    The sender may have died, disconnected or failed to launch;
    //    -> Try using a local facetracker.
    // Else if an OSC message has been received very recently,
    //    -> Switch back to using the OSC face tracker
    uint64_t now = ofGetElapsedTimeMillis();
    const int durationToAbandonOSC = (1000*2); // milliseconds
    int elapsedSinceLastOscMsg = (int)(now - lastOscUpdateTimeMs);
    if (elapsedSinceLastOscMsg > durationToAbandonOSC){
        faceDataSource = FACE_FROM_HAAR;
        faces.clear();
    } else {
        faceDataSource = FACE_FROM_OSC;
    }
    
    // HANDLE LACK OF FACES
    // If faces were found in this frame
    //    -> Use the current face data
    // If no faces have been found in a while (by any method)
    //    -> Use a stored video
    // Else if faces were found a few frames ago,
    //    -> Continue to use the most recent face data
    int nFramesSinceOscFace  = oscUpdateCount - lastOscFaceFrameCount;
    int nFramesSinceHaarFace = haarUpdateCount - lastHaarFaceFrameCount;
    
    
}

//--------------------------------------------------------------
void ofApp::processOSC(){
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
    ofBackground(0); //MIDDLE_GRAY);
    
    ofSetColor(255);
    scaledFboRect = ofRectangle(0,0, fboW, fboH);//ofGetWidth(), ofGetHeight()); //fboW/2,fboH/2);
    if (handyBool){
        //fboOutput.draw( scaledFboRect );
    }
    
    
    // ofSetColor(255);
    // camImgC1.draw(0,0, camW/2, camH/2);
    // compC1.draw(0,camH/2, imgW, imgH);
    drawVideoDebug();
    
    drawSimulation();
    
    if (bDrawFaceDebug){
        drawDebugOSC();
        
        ofNoFill();
        ofSetColor(255);
        for(int i = 0; i < haarFinder.blobs.size(); i++) {
            ofRectangle cur = haarFinder.blobs[i].boundingRect;
            ofDrawRectangle(cur.x, cur.y, cur.width, cur.height);
        }
        
        // drawHistogram();
        // drawDebugHull();
    }
    
    ofFill();
    ofSetColor(255);
    ofDrawBitmapStringHighlight("FPS: " + ofToString(fpsCounter.getFps()),50,20);
    
}

//--------------------------------------------------------------
void ofApp::drawSimulation(){
    
    float squint01 = 0;
    if (faceDataSource == FACE_FROM_OSC){
        squint01 = MAX(faceMetrics[19],faceMetrics[20]);
    }
    squint01 = ofMap(mouseX,0,ofGetWidth(),0,1);
    
    fboDisplay.begin();
    // ofClear(0,0,40, 10);
    ofSetColor(0,0,0, 96);
    ofFill();
    ofDrawRectangle(0,0, dispW, dispH);
    float sc = dispW/fboW;
    
    ofNoFill();
    glPointSize(2.5); //ofMap(mouseX,0,ofGetWidth(),0,4));
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
        int nVertsFrac = (int)(nVerts * 0.1);
        
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
                dx = 3*dx/dh;
                dy = 3*dy/dh;
                ofDrawLine(px-dx,py-dy, px+dx,py+dy);
            }
        }
    }
    
    
    
    fboDisplay.end();
    float dispWf = ofGetHeight() * (float)dispW/(float)dispH;
    scaledFboRect = ofRectangle(0,0,dispWf,ofGetHeight());
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
    bool bShowFacePoints = true;
    bool bShowFaceMetrics = false;
    
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
                ofDrawLine(vx0, ty-2, vx, ty-2);
                ty+=dy;
            }
        }
    }
}

//--------------------------------------------------------------
void ofApp::keyPressed(int key){
    if (key == 'b'){
        handyBool = !handyBool;
    } else if ((key == 'D') || (key == 'd')){
        bDrawFaceDebug = !bDrawFaceDebug;
    } else if ((key == 'V') || (key == 'v')){
        bDrawVideoDebug = !bDrawVideoDebug;
    } else if (key == 'X'){
        toggleOSCSource();
    } else if (key == 'F'){
        bFullScreen = !bFullScreen;
        ofSetFullscreen(bFullScreen);
        if (bFullScreen){
            ofHideCursor();
        } else {
            ofShowCursor();
        }
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
void ofApp::mouseDragged(int x, int y, int button){}
void ofApp::mousePressed(int x, int y, int button){}
void ofApp::mouseReleased(int x, int y, int button){}
void ofApp::mouseEntered(int x, int y){}
void ofApp::mouseExited(int x, int y){}
void ofApp::windowResized(int w, int h){}
void ofApp::gotMessage(ofMessage msg){}
void ofApp::dragEvent(ofDragInfo dragInfo){}
void ofApp::keyReleased(int key){}
