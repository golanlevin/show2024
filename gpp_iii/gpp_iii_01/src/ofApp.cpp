#include "ofApp.h"

using namespace ofxCv;
using namespace cv;

/*
 * Todo:
 * Consider integrating Lingdong's skeletonization
 * Add skeletons with long histories.
 */

//--------------------------------------------------------------
void ofApp::setup() {
	ofSetFrameRate(60);
	ofSetVerticalSync(true);
	ofSetWindowTitle("Ghost Pole Propagator III (2024)");
    
    bShowGui = true;
    bShowDebugView = true;
    debugItemW = 384;
    displayX = 0;
    displayY = 0;
    displayScale = 1;
    
    // uint64_t mils = ofGetSystemTimeMillis();
    // printf("Mils = %llu\n", mils);
    
    initializeFbos();
    
    ofxGuiSetDefaultWidth(256);
    gui.setup();
    gui.add(currFPS.setup("currFPS", 30, 10, 120));
    gui.add(videoRate.setup("videoRate", 1.0, 0.01, 1.0));
    gui.add(maskThreshold.setup("maskThreshold", 50, 0,255));
    gui.add(sourceW.setup("sourceW", 768, 120, 1080));
    gui.add(sourceH.setup("sourceH", 384, 120, 1080));
    gui.add(sourceX.setup("sourceX", 192, 0, 1920));
    gui.add(sourceY.setup("sourceY", 680, 0, 1080));
    gui.add(bDoContrastStretch.setup("bDoContrastStretch", true));
    gui.add(targetAvgVal.setup("targetAvgVal", 112, 96, 160));
    gui.add(contrastPow.setup("contrastPow", 0.5, 0.25, 1.5));
    gui.add(bDoMedianFilter.setup("bDoMedianFilter", true));
    gui.add(medianW.setup("medianW", 3, 0, 9));
    gui.add(resampDist.setup("resampDist", 2.25, 1.0, 10.0));
    gui.add(contourKern.setup("contourKern", 3, 1, 5));
    
    gui.add(contourPersistence.setup("persistence", 20, 1, 60));
    gui.add(contourMaxDist.setup("contourMaxDist", 50, 1, 100));
    gui.add(minBlobAreaPct.setup("minBlobAreaPct", 0.014, 0.001, 0.05));
    gui.add(maxBlobAreaPct.setup("maxBlobAreaPct", 0.045, 0.001, 0.20));
    gui.add(minAge.setup("minAge", 5, 0, 20));
    gui.add(fboAlpha.setup("fboAlpha", 32, 0, 255));
    gui.add(liveContourAlpha.setup("liveContourAlpha", 32, 0, 255));
    gui.add(myButton.setup("butty"));
    
    #ifdef USE_LIVE_VIDEO
        video.setDesiredFrameRate(30);
        video.setup(camWidth, camHeight);
    #else
        video.load("video/locationFullSilent.mp4");
        video.setVolume(0.0);
        video.play();
        video.setSpeed(videoRate);
    #endif
    

    
    // use only a portion of the GPU memory & grow as needed
    if(!ofxTF2::setGPUMaxMemory(ofxTF2::GPU_PERCENT_70, true)) {
        ofLogError() << "Failed to set GPU Memory options!";
    }
	if (!model.load("model")) {
		std::exit(EXIT_FAILURE);
	}

	std::vector<std::string> inputNames = {
		"serving_default_downsample_ratio:0",
		"serving_default_r1i:0",
		"serving_default_r2i:0",
		"serving_default_r3i:0",
		"serving_default_r4i:0",
		"serving_default_src:0"
	};
	std::vector<std::string> outputNames = {
		"StatefulPartitionedCall:0",
		"StatefulPartitionedCall:1",
		"StatefulPartitionedCall:2",
		"StatefulPartitionedCall:3",
		"StatefulPartitionedCall:4",
		"StatefulPartitionedCall:5"
	};
	model.setup(inputNames, outputNames);

    
    bReceivedFirstFrame = false;
	captureW = video.getWidth();
	captureH = video.getHeight();
    cout << "captureW: " << captureW << endl;
    cout << "captureH: " << captureH << endl;
    processW = 512;
    processH = 256;
    processVideoC3.allocate(processW,processH);
    
	
    // parameters for the neural network
    float downsampleRatio = 0.375; //0.34375; //0.3125; //0.1875; //0.375f;// smaller is faster and less accurate.
    float batchSize = 1.0f;
    float numChannels = 3.0f; //3.0f;
    tfInputs = {
		cppflow::tensor({ downsampleRatio }),
		cppflow::tensor({0.0f}),                         // r1i
		cppflow::tensor({0.0f}),                         // r2i
		cppflow::tensor({0.0f}),                         // r3i
		cppflow::tensor({0.0f}),                         // r4i
		cppflow::tensor({batchSize, (float)processH, (float)processW, numChannels})
	};
    
    contourFinderInput.allocate(processW, processH);
    videoCvImage.allocate(captureW,captureH);
    imgMask.allocate(processW, processH, OF_IMAGE_GRAYSCALE);
    imgCvMaskC1.allocate(processW, processH); 
    imgCvFilteredMaskC1.allocate(processW, processH);
    processBlobsOnlyC1.allocate(processW, processH);
    
    // Create skeletonizer, computes (pixel) skeletons
    skeletonBufW = processW;
    skeletonBufH = processH;
    mySkeletonizer.initialize(skeletonBufW, skeletonBufH);
    filledContourMat.create    (skeletonBufH, skeletonBufW, CV_8UC(1));
    filledContourImage.allocate(skeletonBufW, skeletonBufH, OF_IMAGE_GRAYSCALE);
    
    // Create skeletonTracer, computes vector skeletons
    mySkeletonTracer = new SkeletonTracer();
    mySkeletonTracer->initialize(skeletonBufW, skeletonBufH);
    mySkeletonTracer->boneResampling     = 1.5; //(float) boneResampling;
    mySkeletonTracer->boneSmoothSigma    = 0.9; //(float) boneSmoothSigma;
    mySkeletonTracer->boneSmoothKernW    = 2;   //(int) boneSmoothKernW;
    mySkeletonTracer->bDoMergeBones      = true;
    personContours.clear();
    peopleContourIndices.clear();
}

//--------------------------------------------------------------
void ofApp::initializeFbos(){
    // glDisable(GL_DITHER);
    
    ofFbo::Settings displayFboSettings;
    displayFboSettings.width = FBOW;
    displayFboSettings.height = FBOH;
    displayFboSettings.internalformat = GL_RGBA16F;
    displayFboSettings.numSamples = 4; // MSAA
    displayFboSettings.useStencil = false;
    displayFboSettings.useDepth = false;
    displayFbo.allocate(displayFboSettings);
    displayFbo.begin();
    ofFill();
    ofSetColor(255,255,255,255);
    ofDrawRectangle(0,0,FBOW,FBOH);
    displayFbo.end();
    
    ofFbo::Settings poissonInputFboSettings;
    poissonInputFboSettings.width = FBOW;
    poissonInputFboSettings.height = FBOH;
    poissonInputFboSettings.internalformat = GL_RGBA16F;
    poissonInputFboSettings.numSamples = 4; // MSAA
    poissonInputFboSettings.useStencil = false;
    poissonInputFboSettings.useDepth = false;
    poissonInputFbo.allocate(poissonInputFboSettings);
    poissonInputFbo.getTexture().setTextureMinMagFilter(GL_LINEAR, GL_LINEAR);
    
    poissonFiller.init(FBOW,FBOH);
}

//--------------------------------------------------------------
void ofApp::update() {
    currFPS = (int) ofGetFrameRate();
    video.update();
    if(video.isFrameNew()) {
        detectPeopleAndComputeMask();
    }
    extractAndTrackContours();
}

//--------------------------------------------------------------
void ofApp::detectPeopleAndComputeMask(){
    
    // Copy camera into ofxCv image
    ofPixels &capturePixels = video.getPixels();
    videoCvImage.setFromPixels(capturePixels);
    bReceivedFirstFrame = true;
    
    // Extract source region into process-buffer
    ofPoint src[4];
    src[0] = ofPoint(sourceX+0,       sourceY+0);
    src[1] = ofPoint(sourceX+sourceW, sourceY+0);
    src[2] = ofPoint(sourceX+sourceW, sourceY+sourceH);
    src[3] = ofPoint(sourceX+0,       sourceY+sourceH);
    ofPoint dst[4];
    dst[0] = ofPoint(0,        0);
    dst[1] = ofPoint(processW, 0);
    dst[2] = ofPoint(processW, processH);
    dst[3] = ofPoint(0,        processH);
    processVideoC3.warpIntoMe(videoCvImage, src, dst);
    
    if (bDoContrastStretch){
        for (int i=0; i<256; ++i) {
            contrastLookupTable[i] = (unsigned char)(255.0 * powf(i/255.0, contrastPow));
        }
        int nProcessPixels = processW*processH*3;
        unsigned char* pixC3 = processVideoC3.getPixels().getData();
        float averageVal = 0;
        for (int i=0; i<nProcessPixels; i++){
            averageVal += (pixC3[i] = contrastLookupTable[pixC3[i]]);
        }
        averageVal /= nProcessPixels;
        processVideoC3.setFromPixels(pixC3, processW, processH);
        
        // Update contrastPow
        if ((averageVal - targetAvgVal) < -1) {
            contrastPow = (float)(contrastPow - 0.0005);
        } else if ((averageVal - targetAvgVal) > 1) {
            contrastPow = (float)(contrastPow + 0.0005);
        }
        contrastPow = ofClamp(contrastPow, 0.25, 1.5);
    }

    // Prepare inputs for body detection
    ofPixels &processPixels = processVideoC3.getPixels();
    auto input = ofxTF2::pixelsToTensor(processPixels);
    auto inputCast = cppflow::cast(input, TF_UINT8, TF_FLOAT);
    inputCast = cppflow::mul(inputCast, cppflow::tensor({1/255.0f}));
    inputCast = cppflow::expand_dims(inputCast, 0);
    tfInputs[5] = inputCast;
    
    // Run model
    auto outputs = model.runMultiModel(tfInputs);
    
    // Process outputs, copy results into imgMask
    tfInputs[1] = outputs[2];
    tfInputs[2] = outputs[3];
    tfInputs[3] = outputs[4];
    tfInputs[4] = outputs[5];
    auto foreground = outputs[1];
    foreground = cppflow::mul(foreground, cppflow::tensor({255.0f}));
    auto foregroundMod = cppflow::cast(foreground, TF_FLOAT, TF_UINT8);
    ofxTF2::tensorToImage(foreground, imgMask);
    imgMask.update();
}

//--------------------------------------------------------------
void ofApp::extractAndTrackContours(){
    if (bReceivedFirstFrame){
        imgCvMaskC1.setFromPixels(imgMask.getPixels());
        imgCvMaskC1.threshold(maskThreshold);
        imgCvMaskC1.dilate();
        imgCvMaskC1.erode();
        
        if (bDoMedianFilter){
            IplImage* iplImg = imgCvMaskC1.getCvImage();
            cv::Mat mat = cv::cvarrToMat(iplImg);
            cv::Mat medianFilteredMat;
            cv::medianBlur(mat, medianFilteredMat, medianW*2+1);
            IplImage medianFilteredIplImg = cvIplImage(medianFilteredMat);
            imgCvFilteredMaskC1.setFromPixels((unsigned char*)medianFilteredIplImg.imageData,
                medianFilteredIplImg.width, medianFilteredIplImg.height);
            contourFinderInput.setFromPixels(imgCvFilteredMaskC1.getPixels());
        } else {
            contourFinderInput.setFromPixels(imgCvMaskC1.getPixels());
        }
        
        // Find blobs in the filtered mask image.
        kmContourFinder.setMinAreaNorm(minBlobAreaPct);
        kmContourFinder.setMaxAreaNorm(maxBlobAreaPct);
        kmContourFinder.setThreshold(maskThreshold);
        kmContourFinder.getTracker().setPersistence(contourPersistence);
        kmContourFinder.getTracker().setMaximumDistance(contourMaxDist);
        kmContourFinder.setSortBySize(true);
        kmContourFinder.setFindHoles(true);
        kmContourFinder.findContours(contourFinderInput);
        RectTracker& tracker = kmContourFinder.getTracker();
        
        // Identify and pixel-render just the people-blobs (we hope)
        int nPeopleBlobs = 0;
        personContours.clear();
        peopleContourIndices.clear();
        int roiMinX = INT_MAX;int roiMaxX = INT_MIN;
        int roiMinY = INT_MAX;int roiMaxY = INT_MIN;
        processBlobsOnlyC1.set(0); // helpfully, calls flagImageChanged();
        
        // obtain cv::Mat version of processVideoC3, for average color calculation
        cv::Mat matC3 = cv::cvarrToMat(processVideoC3.getCvImage());
        
        for (int i=0; i<kmContourFinder.size(); i++) {
            cv::Rect ithRect = kmContourFinder.getBoundingRect(i);
            int rw = ithRect.width;
            int rh = ithRect.height;
            float ithRectAspect = (float)rw/(float)rh;
            if (ithRectAspect < 0.8){ // people are taller than wide.
                std::vector<cv::Point> ithContourPts = kmContourFinder.getContour(i);
                int nPts = (int) ithContourPts.size();
                if (nPts > 0) {
                    int ithIsHole = (int) kmContourFinder.getHole(i);
                    if (ithIsHole == 0){
                        
                        int personContourLabel = kmContourFinder.getLabel(i);
                        int personContourAge = tracker.getAge(personContourLabel);
                    
                        nPeopleBlobs++;
                        peopleContourIndices.push_back(i);
                        
                        // Copy contourFinder's blobs to personContours vector.
                        // We'll use these contours to identify which person skeletons belong to.
                        PersonContour aPersonContour;
                        ofPolyline aPolyline;
                        aPolyline.clear();
                        for (int j=0; j<nPts; j++) {
                            float jfx = (int)ithContourPts[j].x;
                            float jfy = (int)ithContourPts[j].y;
                            aPolyline.addVertex(jfx,jfy);
                        }
                        aPolyline = aPolyline.getResampledBySpacing(resampDist);
                        aPolyline = aPolyline.getSmoothed(contourKern, 0.25);
                        
                        aPersonContour.polyline = aPolyline;
                        aPersonContour.age = personContourAge;
                        aPersonContour.label = personContourLabel;
                        aPersonContour.bbox = ithRect;
                        aPersonContour.timestamp = ofGetSystemTimeMillis();
                        
                        // Calculate average color of processVideoC3 within bbox
                        ithRect &= cv::Rect(0, 0, matC3.cols, matC3.rows);
                        cv::Mat roiMat = matC3(ithRect);
                        cv::Scalar meanColor = cv::mean(roiMat);
                        
                        // Calculate brightest color in bbox.
                        std::vector<cv::Mat> channels;
                        cv::split(roiMat, channels);
                        double minVal, maxVal;
                        cv::Point minLoc, maxLoc;
                        cv::Scalar brightestColor;
                        for (int i = 0; i < 3; ++i) {
                            cv::minMaxLoc(channels[i], &minVal, &maxVal, &minLoc, &maxLoc);
                            brightestColor[i] = maxVal;
                        }
                        
                        float mA = 0.6;
                        float mB = 1.0-mA;
                        float r = (mA*meanColor[0] + mB*brightestColor[0]);
                        float g = (mA*meanColor[1] + mB*brightestColor[1]);
                        float b = (mA*meanColor[2] + mB*brightestColor[2]);
                        ofColor bboxOfCol(r,g,b);
                        float s = bboxOfCol.getSaturation();
                        bboxOfCol.setSaturation( 255 * powf(s/255.0, 0.90) );
                        aPersonContour.r = bboxOfCol.r;
                        aPersonContour.g = bboxOfCol.g;
                        aPersonContour.b = bboxOfCol.b;
                    
                        personContours.push_back(aPersonContour);
                        
                        // Fill CvPoint[] array with smoothed polyline,
                        // in order to render pixel-blob for skeletonization.
                        int nPolylinePts = (int)aPolyline.size();
                        CvPoint* pts = new CvPoint[nPolylinePts];
                        for (int j=0; j<nPolylinePts; j++ ) {
                            int jx = (int)roundf(aPolyline[j].x);
                            int jy = (int)roundf(aPolyline[j].y);
                            pts[j].x = jx;
                            pts[j].y = jy;
                            roiMinX = MIN(roiMinX, jx);
                            roiMaxX = MAX(roiMaxX, jx);
                            roiMinY = MIN(roiMinY, jy);
                            roiMaxY = MAX(roiMaxY, jy);
                        }
                        
                        cvFillPoly( processBlobsOnlyC1.getCvImage(), &pts,&nPolylinePts,1, cvScalar(255,255,255) );
                        delete[] pts;
                    }
                }
            }
        }
        mySkeletonizer.clear();
        if (nPeopleBlobs > 0){
            IplImage* blobIplImage = processBlobsOnlyC1.getCvImage();
            cv::Mat blobMat = cv::cvarrToMat(blobIplImage);
            mySkeletonizer.computeSkeleton2024(blobMat,roiMinX,roiMaxX,roiMinY,roiMaxY,nPeopleBlobs);
        }
        
        unsigned char* skeletonPixelBuffer = mySkeletonizer.skeletonBuffer;
        mySkeletonTracer->computeVectorSkeletons (skeletonPixelBuffer, personContours);
    }
}


//--------------------------------------------------------------
void ofApp::draw() {
    ofBackground(64,64,64);
    if (bShowDebugView){
        drawDebugView();
        
        displayScale = (float)ofGetHeight()/FBOH;
        displayX = debugItemW*2;
        displayY = 0;
        
    } else {
        displayX = 0;
        displayY = 0;
        displayScale = 1.0;
    }

    calculatePoissonFields();
    drawPoissonDisplay();

    glEnable(GL_BLEND);
    if (bShowGui){gui.draw();}
}

//--------------------------------------------------------------
void ofApp::calculatePoissonFields(){
    poissonInputFbo.begin();
    ofPushStyle();
    ofClear(0,0,0,0);
    ofNoFill();
    mySkeletonTracer->drawCurrentSkeletons(0,0, FBOW, true);
    ofPopStyle();
    
    ofSetColor(0,0,0);
    ofDrawLine(0,1,FBOW,1);
    ofSetColor(255,255,255);
    ofDrawLine(FBOW/2,FBOH-1,FBOW/2,FBOH-2);
    poissonInputFbo.end();
    
    ofFill(); // necessary somehow
    poissonFiller.process(poissonInputFbo.getTexture());
}

//--------------------------------------------------------------
void ofApp::drawPoissonDisplay(){
    
    ofPushMatrix();
    ofTranslate(displayX,displayY);
    ofScale(displayScale);
    
    // Render poissonFiller into displayFbo accumulator
    displayFbo.begin();
    ofPushStyle();
    ofFill();
    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    ofSetColor(255,255,255,fboAlpha*1.0);
    poissonFiller.getTexture().draw(0,0, FBOW,FBOH);
    ofPopStyle();
    displayFbo.end();

    // Render displayFbo accumulator
    ofFill();
    glDisable(GL_BLEND);
    ofSetColor(255,255,255);
    displayFbo.draw(0,0);
    drawLiveDisplayPeopleContours(0,0, FBOW);
    mySkeletonTracer->drawCurrentSkeletons(0,0, FBOW, !true);
    
    ofPopMatrix();
    
    // Not drawn:
    // poissonFiller.getTexture().draw(0, 0, FBOW, FBOH);
    // poissonInputFbo.draw(FBOW, 0);
}


//--------------------------------------------------------------
void ofApp::drawLiveDisplayPeopleContours(float dx, float dy, float dw){
    int nPersonContours = (int) personContours.size();
    if ((nPersonContours > 0) && (liveContourAlpha > 0)){
        
        ofFill();
        ofPushMatrix();
        ofTranslate(dx,dy);
        ofScale(dw/processW, dw/processW);
        
        glEnable(GL_BLEND);
        ofSetColor(0,0,0, liveContourAlpha);
        
        for (int i=0; i<nPersonContours; i++){
            PersonContour ithPersonContour = personContours[i];
            ofPolyline ithPersonPolyline = ithPersonContour.polyline;
            int nPts = (int) ithPersonPolyline.size();
            ofBeginShape();
            for (int j=0; j<nPts; j++){
                float px = ithPersonPolyline[j].x;
                float py = ithPersonPolyline[j].y;
                ofVertex(px, py);
            }
            ofEndShape(true);
        }
        ofPopMatrix();
        ofNoFill();
    }
}



//--------------------------------------------------------------
void ofApp::drawDebugView(){
    float dw = debugItemW;
    float dh = dw*((float)processH/processW);
    
    // Draw main video
    ofSetColor(255);
    float vy= dh - dw*((float)captureH/captureW);
    video.draw(0,vy, dw,dw*((float)captureH/captureW));
    ofNoFill();
    ofSetColor(0,255,255);
    float sx = (float)sourceX/(float)captureW * dw;
    float sy = (float)sourceY/(float)captureW * dw;
    float sw = (float)sourceW/(float)captureW * dw;
    float sh = (float)sourceH/(float)captureW * dw;
    ofDrawRectangle(sx,sy+vy,sw,sh);

    // Draw contrast-boosted excerpt (processVideoC3)
    // Draw AI-detected people likelihoods (imgMask)
    ofSetColor(255);
    processVideoC3.draw            (dw,0 , dw,dh);
    imgMask.draw                   (0,dh, dw,dh);
    
    // Draw raw thresholded blob image (contourFinderInput)
    ofSetColor(128);
    contourFinderInput.draw        (dw,dh, dw,dh);
    
    // Draw blob contours (kmContourFinder)
    // Draw tracker labels (kmContourFinder.getTracker())
    ofPushMatrix();
    ofTranslate(dw,dh);
    ofScale(dw/processW,dh/processH);
    RectTracker& tracker = kmContourFinder.getTracker();
    bool bShowLabels = true;
    if(bShowLabels) {
        ofSetColor(255);
        kmContourFinder.draw(); // the contours
        for (int i=0; i<kmContourFinder.size(); i++) {
            ofPoint center = toOf(kmContourFinder.getCenter(i));
            ofPushMatrix();
            ofTranslate(center.x, center.y);
            int label = kmContourFinder.getLabel(i);
            string msg = ofToString(label) + ":" + ofToString(tracker.getAge(label));
            ofDrawBitmapString(msg, 0, 0);
            ofVec2f velocity = toOf(kmContourFinder.getVelocity(i));
            ofScale(5, 5);
            ofDrawLine(0, 0, velocity.x, velocity.y);
            ofPopMatrix();
        }
    }
    ofPopMatrix();
    
    // Draw selected (people-only) blobs
    ofSetColor(128);
    processBlobsOnlyC1.draw        (0,dh*2, dw,dh);
    
    // Draw skeleton pixels
    mySkeletonizer.draw(dw,dh*2, dw,dh);
    
}

//--------------------------------------------------------------
void ofApp::keyPressed(int key) {
    #ifdef USE_LIVE_VIDEO
        ;
    #else
        if (key == ' '){
            bool bP = video.isPaused();
            video.setPaused(!bP);
        }
    #endif
    
    
    if (key == '-'){
        //
    } else if (key == '='){
        //
    } else if (key == 'g'){
        bShowGui = !bShowGui;
    } else if (key == 'd'){
        bShowDebugView = !bShowDebugView;
    } else if (key == 'S'){
        gui.saveToFile("settings.xml");
    } else if (key == 'L'){
        gui.loadFromFile("settings.xml");
        
    } else if (key == OF_KEY_LEFT){
        sourceX = (int)(sourceX-1);
    } else if (key == OF_KEY_RIGHT){
        sourceX = (int)(sourceX+1);
    } else if (key == OF_KEY_UP){
        sourceY = (int)(sourceY-1);
    } else if (key == OF_KEY_DOWN){
        sourceY = (int)(sourceY+1);
    }
        
}

//--------------------------------------------------------------
void ofApp::keyReleased(int key) {

}
//--------------------------------------------------------------
void ofApp::mouseMoved(int x, int y) {

}
//--------------------------------------------------------------
void ofApp::mouseDragged(int x, int y, int button) {
    
}
//--------------------------------------------------------------
void ofApp::mousePressed(int x, int y, int button) {

}
//--------------------------------------------------------------
void ofApp::mouseReleased(int x, int y, int button) {

}
//--------------------------------------------------------------
void ofApp::mouseEntered(int x, int y) {

}
//--------------------------------------------------------------
void ofApp::mouseExited(int x, int y) {

}
//--------------------------------------------------------------
void ofApp::windowResized(int w, int h) {

}
//--------------------------------------------------------------
void ofApp::gotMessage(ofMessage msg) {

}
//--------------------------------------------------------------
void ofApp::dragEvent(ofDragInfo dragInfo) {

}



//--------------------------------------------------------------
void ofApp::rgbToHsv(float r, float g, float b, float& h, float& s, float& v) {
    float minVal = std::min({r, g, b});
    float maxVal = std::max({r, g, b});
    float delta = maxVal - minVal;
    
    v = maxVal; // value is the maximum of r, g, b

    if (maxVal != 0) {
        s = delta / maxVal; // saturation
    } else {
        s = 0;
        h = -1;
        return;
    }

    if (r == maxVal) {
        h = (g - b) / delta; // between yellow & magenta
    } else if (g == maxVal) {
        h = 2 + (b - r) / delta; // between cyan & yellow
    } else {
        h = 4 + (r - g) / delta; // between magenta & cyan
    }

    h *= 60; // degrees
    if (h < 0) {
        h += 360;
    }
}


//--------------------------------------------------------------
void ofApp::hsvToRgb(float h, float s, float v, float& r, float& g, float& b) {
    int i;
    float f, p, q, t;

    if (s == 0) {
        // achromatic (grey)
        r = g = b = v;
        return;
    }

    h /= 60; // sector 0 to 5
    i = floor(h);
    f = h - i; // fractional part of h
    p = v * (1 - s);
    q = v * (1 - s * f);
    t = v * (1 - s * (1 - f));

    switch (i) {
        case 0:
            r = v;
            g = t;
            b = p;
            break;
        case 1:
            r = q;
            g = v;
            b = p;
            break;
        case 2:
            r = p;
            g = v;
            b = t;
            break;
        case 3:
            r = p;
            g = q;
            b = v;
            break;
        case 4:
            r = t;
            g = p;
            b = v;
            break;
        default: // case 5:
            r = v;
            g = p;
            b = q;
            break;
    }
}







// GRAVEYARD

//ofDrawBitmapStringHighlight(ofToString((int)ofGetFrameRate()) + " fps", 4, 12);


// Process contours
/*
contours.clear();
for (int i = 0; i < contourFinder.nBlobs; i++) {
    aContour.clear();
    int nPoints = (int) contourFinder.blobs[i].pts.size();
    if (nPoints > 0){
        // Copy contourFinder's blobs to contours vector
        for (int j=0; j<nPoints; j++) {
            ofDefaultVec3 ptj = contourFinder.blobs[i].pts[j];
            aContour.addVertex(ptj.x,ptj.y);
        }
        ofDefaultVec3 pt0 = contourFinder.blobs[i].pts[0];
        aContour.addVertex(pt0.x,pt0.y);
        
        if (false){ // aContour.getPerimeter() > 100 ) {
            aContour = aContour.getResampledBySpacing( 10 );
            aContour = aContour.getSmoothed(2, 0.3);
        }
        contours.push_back(aContour);
    }
}
 */

/*
 
 aContour.clear();
 aContour = aContour.getResampledBySpacing( 10 );
 aContour = aContour.getSmoothed(2, 0.3);
 contours.push_back(aContour);
 */
