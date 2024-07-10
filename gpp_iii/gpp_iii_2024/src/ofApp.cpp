#include "ofApp.h"

using namespace ofxCv;
using namespace cv;


//--------------------------------------------------------------
void ofApp::setup() {
	ofSetFrameRate(30);
	ofSetVerticalSync(true);
	ofSetWindowTitle("Ghost Pole Propagator III (2024)");
    ofSetCircleResolution(16);
    
    bFullscreen = false;
    bShowGui = true;
    bShowDebugView = true;
    bShowDiagnosticSkeletons = false;
    bPausePlayback = false;
    bColorState = false;
    lastInteractionTimeMs = ofGetElapsedTimeMillis();
    displayX = 0;
    displayY = 0;
    displayScale = 1;
    averageVideoColor.set(0,0,0);
    
    initializeFbos();
    
    ofxGuiSetDefaultWidth(256);
    guiVision.setup("Vision");
    guiVision.setPosition(10, 520);
    guiVision.add(currFPS.setup("currFPS", 30, 10, 120));
    guiVision.add(whichVT.setup("whichVideoType", 0, 0,1)); // 0 videofile, 1 camera
    guiVision.add(whichCameraID.setup("whichCameraID", 0, 0,3));
    guiVision.add(bLoadRecordingsOnStart.setup("bLoadRecordingsOnStart", true));
    guiVision.add(downsampleRatio.setup("downsampleRatio", 0.4375, 0.0, 1.0)); // smaller is faster, less accurate.
    guiVision.add(batchSize.setup("batchSize", 4,1,8));
    guiVision.add(procW.setup("processW", 512, 128, 768));
    guiVision.add(procH.setup("processH", 224, 128, 768));
    guiVision.add(sourceW.setup("sourceW", 768, 120, 1080));
    guiVision.add(sourceH.setup("sourceH", 336, 120, 1080));
    guiVision.add(sourceX.setup("sourceX", 192, 0, 1920));
    guiVision.add(sourceY.setup("sourceY", 692, 0, 1080));
    guiVision.add(maskThreshold.setup("maskThreshold", 50, 0,255));
    guiVision.add(bDoContrastStretch.setup("bDoContrastStretch", true));
    guiVision.add(targetAvgVal.setup("targetAvgVal", 112, 96, 160));
    guiVision.add(contrastPow.setup("contrastPow", 0.5, 0.25, 1.5));
    guiVision.add(bDoMedianFilter.setup("bDoMedianFilter", true));
    guiVision.add(medianW.setup("medianW", 3, 0, 9));
    guiVision.add(resampDist.setup("resampDist", 2.5, 1.0, 10.0));
    guiVision.add(contourKern.setup("contourKern", 3, 1, 5));
    guiVision.add(trackerMaxDist.setup("trackerMaxDist", 50, 1, 100));
    guiVision.add(trackerPersistence.setup("trackerPersistence", 40, 1, 100));
    guiVision.add(minBlobAreaPct.setup("minBlobAreaPct", 0.014, 0.001, 0.05));
    guiVision.add(maxBlobAreaPct.setup("maxBlobAreaPct", 0.045, 0.001, 0.20));
    guiVision.add(leastAcceptableMovement.setup("leastAcceptableMovement", 0.5, 0.1, 2.0));

    guiDisplay.setup("Display");
    guiDisplay.setPosition(280, 520);
    guiDisplay.add(bShowLiveSkeletons.setup("bShowLiveSkeletons", true));
    guiDisplay.add(bShowRecordedSkeletons.setup("bShowRecordedSkeletons", true));
    guiDisplay.add(bFullscreenAtStart.setup("bFullscreenAtStart", true));
    guiDisplay.add(minAgeToKeep.setup("minAgeToKeep", 30, 0, 100));
    guiDisplay.add(fboAlpha.setup("fboAlpha", 16, 0, 255));
    guiDisplay.add(displayGray.setup("displayGray", 255, 0, 255));
    guiDisplay.add(bFancyLineSkels.setup("bFancyLineSkels", true));
    guiDisplay.add(fancySkelTh.setup("fancySkelTh", (1.0/3.0), 0.0, 2.0));
    guiDisplay.add(strokeWeightScaleMix.setup("strokeWeightScaleMix", 0.80, 0.0, 1.0));
    
    guiDisplay.add(cullPeriod.setup("cullPeriod", 300, 20, 500));
    guiDisplay.add(bCullLongestRecordings.setup("bCullLongestRecordings", true));
    guiDisplay.add(bCullStillestRecordings.setup("bCullStillestRecordings", true));
    guiDisplay.add(liveContourAlpha.setup("liveContourAlpha", 0, 0, 255));
    guiDisplay.add(maxPlaybacks.setup("maxPlaybacks", 10, 1, 32));
    guiDisplay.add(playbackProbability.setup("playbackProbability", 0.075, 0.001, 0.5));
    
    guiDisplay.add(skeletonFboAlphaFreq.setup("skeletonFboAlphaFreq", 0.17, 0.0, 1.0));
    guiDisplay.add(skeletonFboAlphaSigA.setup("skeletonFboAlphaSigA", 0.80, 0.0, 1.0));
    guiDisplay.add(skeletonFboAlphaSigB.setup("skeletonFboAlphaSigB", 0.25, 0.0, 1.0));
    guiDisplay.add(bCompositeMiniDisplay.setup("bCompositeMiniDisplay", true));
    guiDisplay.add(miniDisplayAlpha.setup("miniDisplayAlpha", 0.5, 0.0, 1.0));
    guiDisplay.add(miniDisplayPowLo.setup("miniDisplayPowLo", 2.0, 0.0, 8.0));
    guiDisplay.add(miniDisplayPowHi.setup("miniDisplayPowHi", 6.0, 0.0, 8.0));
    guiDisplay.add(miniDisplayPowFreq.setup("miniDisplayPowFreq", 0.23, 0.0, 5.0));
    guiDisplay.add(miniDisplayWigglePow.setup("miniDisplayWigglePow", 0.30, 0.0, 2.0));
    guiDisplay.add(bCalcPersonColors.setup("bCalcPersonColors", false));
    guiDisplay.add(colorSwitchFreq.setup("colorSwitchFreq", 0.02, 0.0, 0.2));
    guiDisplay.add(whichPalette.setup("whichPalette", 0, 0, 7));
    
    fboAlphaFreq         = 0.023;
    miniDisplayAlphaFreq = 0.007;
    hsvModModFrq         = 0.011;
    hsvModFrq            = 0.059;
    feedbackTwiddleFrq   = 0.047;

    // --- LOAD SETTINGS HERE ---
    guiVision.loadFromFile("settings/settingsVision.xml");
    guiDisplay.loadFromFile("settings/settingsDisplay.xml");
    
    if (bFullscreenAtStart){
        bFullscreen = true;
        ofSetFullscreen(bFullscreen);
    }
    
    whichVideoType = (int) whichVT;
    if (whichVideoType == 0){
        videoPlayer.load("video/location.mp4");
        videoPlayer.setVolume(0.0);
        videoPlayer.play();
        videoPlayer.setSpeed(1.0);
        
    } else { // } if (whichVideoType == 1){
        videoGrabber.setVerbose(true);
        std::vector<ofVideoDevice> devices = videoGrabber.listDevices();
        videoGrabber.setDesiredFrameRate(30);
        videoGrabber.setDeviceID(whichCameraID);
        videoGrabber.setup(camWidth, camHeight);
    }
    
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
    processFrame = 0;
    if (whichVideoType == 0){
        captureW = videoPlayer.getWidth();
        captureH = videoPlayer.getHeight();
    } else { // } if (whichVideoType == 1){
        captureW = videoGrabber.getWidth();
        captureH = videoGrabber.getHeight();
    }
    cout << "captureW: " << captureW << endl;
    cout << "captureH: " << captureH << endl;
    
    processW = (int)procW; //512; //448;
    processH = (int)procH; //224; //196;
    debugItemW = 384;
    processVideoC3.allocate(processW,processH);
    
	
    // parameters for the neural network
    float numChannels = 3.0f;
    tfInputs = {
		cppflow::tensor({ (float)downsampleRatio }),
		cppflow::tensor({0.0f}),                         // r1i
		cppflow::tensor({0.0f}),                         // r2i
		cppflow::tensor({0.0f}),                         // r3i
		cppflow::tensor({0.0f}),                         // r4i
		cppflow::tensor({ (float)batchSize, (float)processH, (float)processW, numChannels})
	};
    
    contourFinderInput.allocate(processW, processH);
    videoCvImage.allocate(captureW,captureH);
    imgMask.allocate(processW, processH, OF_IMAGE_GRAYSCALE);
    imgCvMaskC1.allocate(processW, processH); 
    imgCvFilteredMaskC1.allocate(processW, processH);
    processBlobsOnlyC1.allocate(processW, processH);

    bComputeMiniDisplay = true;
    miniDisplayW = FBOW / 8;
    miniDisplayH = FBOH / 8;
    miniDisplayC1.allocate(miniDisplayW,miniDisplayH);
    miniDisplayRemappedC1.allocate(miniDisplayW,miniDisplayH);
    miniDisplayC1.set(0);
    miniDisplayRemappedC1.set(0);
    miniDisplayLut = cv::Mat(1, 256, CV_8U);
    for (int i=0; i<256; i++) {
        miniDisplayLut.at<unsigned char>(i) = (unsigned char)(255.0 * powf(i/255.0, 2.0));
    }
    
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
    boneDrawer = new SkeletonBoneDrawer();
    personContours.clear();
    skeletonRecordingCollection.clear();
    nReplayingSkeletonRecordings = 0;
    
    
    //-------------------
    recordings = new Recording[MAX_N_SKELETON_RECORDINGS];
    for (int i=0; i<MAX_N_SKELETON_RECORDINGS; i++){
        for (int j=0; j<MAX_N_SKELETONS_PER_RECORDING; j++){
            for (int k=0; k<MAX_N_BONES_PER_SKELETON; k++){
                for (int l=0; l<MAX_POINTS_PER_BONE; l++){
                    recordings[i].frames[j].bones[k].points[l].set(0,0);
                }
            }
        }
    }
    clearRecordingsStatic();
    if (bLoadRecordingsOnStart){
        importSkeletonRecordingCollectionStatic("settings/skeletonRecordingCollection.xml");
    }
}

//--------------------------------------------------------------
void ofApp::clearRecordingsStatic(){
    for (int i=0; i<MAX_N_SKELETON_RECORDINGS; i++){
        clearStaticRecording(i);
    }
}

//--------------------------------------------------------------
void ofApp::clearStaticRecording(int i){
    if ((i >=0 ) && (i < MAX_N_SKELETON_RECORDINGS)){
        recordings[i].nFrames = 0;
        recordings[i].bAvailable = true;
        recordings[i].bPlaying = false;
        recordings[i].bApproved = false;
        recordings[i].label = 0;
        recordings[i].birthday = 0;
        recordings[i].deathday = 0;
        recordings[i].dxAvg = 0.0f;
        recordings[i].dyAvg = 0.0f;
        recordings[i].cxAvg = 0.0f;
        recordings[i].cyAvg = 0.0f;
        recordings[i].playbackCx = 0.0f;
        recordings[i].playbackCy = 0.0f;
        recordings[i].playbackScale = 1.0f;
        
        for (int j=0; j<MAX_N_SKELETONS_PER_RECORDING; j++){
            recordings[i].frames[j].nBones = 0;
            for (int k=0; k<MAX_N_BONES_PER_SKELETON; k++){
                recordings[i].frames[j].bones[k].nPoints = 0;
                for (int l=0; l<MAX_POINTS_PER_BONE; l++){
                    recordings[i].frames[j].bones[k].points[l].set(0.0f,0.0f);
                }
            }
        }
        
        // bubbleSortRecordingsByLabel();
    }
}


void ofApp::bubbleSortRecordingsByLabel() {
    Recording temp; // Temporary Recording structure for swapping
    for (int i = 0; i < MAX_N_SKELETON_RECORDINGS - 1; ++i) {
        for (int j = 0; j < MAX_N_SKELETON_RECORDINGS - i - 1; ++j) {
            if (recordings[j].label > recordings[j+1].label) {
                // Swap recordings[j] and recordings[j + 1]
                temp = recordings[j];
                recordings[j] = recordings[j + 1];
                recordings[j + 1] = temp;
            }
        }
    }
}
 

//--------------------------------------------------------------
void ofApp::initializeFbos(){
    
    ofFbo::Settings displayFboSettings;
    displayFboSettings.width = FBOW;
    displayFboSettings.height = FBOH;
    displayFboSettings.internalformat = GL_RGBA16F;
    displayFboSettings.numSamples = 1; // MSAA
    displayFboSettings.useStencil = false;
    displayFboSettings.useDepth = false;
    displayFboSettings.minFilter = GL_LINEAR;
    displayFboSettings.maxFilter = GL_LINEAR;
    displayFbo.allocate(displayFboSettings);
    displayFbo.getTexture().setTextureMinMagFilter(GL_LINEAR, GL_LINEAR);
    displayFbo.begin();
    ofFill();
    ofSetColor(255,255,255,255);
    ofDrawRectangle(0,0,FBOW,FBOH);
    displayFbo.end();
    
    ofFbo::Settings skeletonFboSettings;
    skeletonFboSettings.width = FBOW;
    skeletonFboSettings.height = FBOH;
    skeletonFboSettings.internalformat = GL_RGBA;
    skeletonFboSettings.numSamples = 4; // MSAA
    skeletonFboSettings.useStencil = false;
    skeletonFboSettings.useDepth = false;
    skeletonFboSettings.minFilter = GL_LINEAR;
    skeletonFboSettings.maxFilter = GL_LINEAR;
    skeletonFbo.allocate(skeletonFboSettings);
    skeletonFbo.getTexture().setTextureMinMagFilter(GL_LINEAR, GL_LINEAR);
    
    ofFbo::Settings poissonInputFboSettings;
    poissonInputFboSettings.width = FBOW;
    poissonInputFboSettings.height = FBOH;
    poissonInputFboSettings.internalformat = GL_RGBA16F;
    poissonInputFboSettings.numSamples = 1; // MSAA
    poissonInputFboSettings.useStencil = false;
    poissonInputFboSettings.useDepth = false;
    poissonInputFboSettings.minFilter = GL_LINEAR;
    poissonInputFboSettings.maxFilter = GL_LINEAR;
    poissonInputFbo.allocate(poissonInputFboSettings);
    poissonInputFbo.getTexture().setTextureMinMagFilter(GL_LINEAR, GL_LINEAR);
    
    poissonFiller.init(FBOW,FBOH);
}

//--------------------------------------------------------------
void ofApp::update() {
    currFPS = (int) ofGetFrameRate();

    bool bNewFrame = false;
    if (whichVideoType == 0){
        videoPlayer.update();
        if (videoPlayer.isFrameNew()){
            bNewFrame = true;
        }
    } else { // } if (whichVideoType == 1){
        videoGrabber.update();
        if (videoGrabber.isFrameNew()){
            bNewFrame = true;
        }
    }

    if (bNewFrame) {
        processFrame++;
        detectPeopleAndComputeMask();
    }
    extractAndTrackContours();
    processSkeletons();
    updateDebugView();
}

//--------------------------------------------------------------
void ofApp::updateDebugView(){
    int elapsed = (int) (ofGetElapsedTimeMillis() - lastInteractionTimeMs);
    if (elapsed > 120000){
        if (bShowDebugView){
            bShowDebugView = false;
            bShowGui = false;
            ofHideCursor();
        }
    }
}

//--------------------------------------------------------------
void ofApp::detectPeopleAndComputeMask(){
    
    // Copy camera into ofxCv image
    ofPixels *capturePixels = nullptr;
    if (whichVideoType == 0) {
        capturePixels = &videoPlayer.getPixels();
    } else { // if (whichVideoType == 1) {
        capturePixels = &videoGrabber.getPixels();
    }
    
    videoCvImage.setFromPixels(*capturePixels);
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
        
        // Apply contrast table while also calculating average color
        int nProcessPixels = processW*processH;
        int nProcessBytes = nProcessPixels * 3;
        unsigned char* pixC3 = processVideoC3.getPixels().getData();
        float avgR = 0; 
        float avgG = 0;
        float avgB = 0;
        for (int i=0; i<nProcessBytes; i+=3){
            avgR += (pixC3[i  ] = contrastLookupTable[pixC3[i  ]]);
            avgG += (pixC3[i+1] = contrastLookupTable[pixC3[i+1]]);
            avgB += (pixC3[i+2] = contrastLookupTable[pixC3[i+2]]);
        }
        processVideoC3.setFromPixels(pixC3, processW, processH);
        
        // Update contrastPow based on average color
        avgR /= nProcessPixels;
        avgG /= nProcessPixels;
        avgB /= nProcessPixels;
        averageVideoColor.set(avgR,avgG,avgB);
        float averageVal = (avgR+avgG+avgB)/3.0;
        
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
        kmContourFinder.getTracker().setPersistence(trackerPersistence);
        kmContourFinder.getTracker().setMaximumDistance(trackerMaxDist);
        kmContourFinder.setSortBySize(true);
        kmContourFinder.setFindHoles(true);
        kmContourFinder.findContours(contourFinderInput);
        RectTracker& tracker = kmContourFinder.getTracker();
        
        // Identify and pixel-render just the people-blobs (...we hope)
        personContours.clear();
    
        int roiMinX = INT_MAX;int roiMaxX = INT_MIN;
        int roiMinY = INT_MAX;int roiMaxY = INT_MIN;
        processBlobsOnlyC1.set(0); // helpfully, this calls flagImageChanged();
        
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
                        
                        int personContourLabel = kmContourFinder.getLabel(i);
                        aPersonContour.polyline = aPolyline;
                        aPersonContour.label = personContourLabel;
                        aPersonContour.age = tracker.getAge(personContourLabel);
                        aPersonContour.bbox = ithRect;
                        // aPersonContour.timestamp = ofGetSystemTimeMillis();
                        
                        cv::Point2f contourCentroid = kmContourFinder.getCentroid(i);
                        aPersonContour.cx = contourCentroid.x;
                        aPersonContour.cy = contourCentroid.y;
                        
                        if (bCalcPersonColors){
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
                            
                        } else {
                            aPersonContour.r = 128;
                            aPersonContour.g = 128;
                            aPersonContour.b = 128;
                        }
                    
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
        int nPeopleBlobs = (int)personContours.size();
        if (nPeopleBlobs > 0){
            IplImage* blobIplImage = processBlobsOnlyC1.getCvImage();
            cv::Mat blobMat = cv::cvarrToMat(blobIplImage);
            mySkeletonizer.computeSkeleton2024(blobMat,roiMinX,roiMaxX,roiMinY,roiMaxY,nPeopleBlobs);
        }
    }
}





//--------------------------------------------------------------
void ofApp::processSkeletons(){
    if (bReceivedFirstFrame){
        
        unsigned char* skeletonPixelBuffer = mySkeletonizer.skeletonBuffer;
        mySkeletonTracer->computeVectorSkeletons (skeletonPixelBuffer, personContours);
        
        //----------------
        // Identify newly-appeared contour labels.
        int nCurrPeople = (int)personContours.size();
        if (nCurrPeople > 0){
            
            // Collate the labels of all current recordings
            std::set<int> prevLabelSet;
            for (int i=0; i<MAX_N_SKELETON_RECORDINGS; i++){
                if (recordings[i].bAvailable == false){
                    int ithRecordingLabel = recordings[i].label;
                    prevLabelSet.insert(recordings[i].label);
                }
            }
            
            // For each person in personContours, check if its label is in prevLabelSet.
            for (int i=0; i<(int)personContours.size(); i++){
                PersonContour ithCurrContour = personContours[i];
                int ithCurrContourLabel = ithCurrContour.label;
                
                // Find the corresponding skeleton for this contour.
                PersonSkeleton ithSkeleton = mySkeletonTracer->currentSkeletons[i];
                
                if (prevLabelSet.find(ithCurrContour.label) == prevLabelSet.end()) {
                    // We haven't seen this label before; a new person has appeared.
                    // Make a new PersonSkeletonRecording; add it to skeletonRecordingCollection
                    // Search through recordings for one in which bAvailable is true
                    int R = -1;
                    for (int j=0; j<MAX_N_SKELETON_RECORDINGS; j++){
                        if (recordings[j].bAvailable){
                            R = j; break;
                        }
                    }
                    // We anticipate that some recordings will be available due to culling.
                    // If truly none is available, then clobber the oldest recording that isn't playing.
                    if (R < 0){
                        int oldestBirthday = INT_MAX;
                        for (int j=0; j<MAX_N_SKELETON_RECORDINGS; j++){
                            if (recordings[j].bPlaying == false){
                                if (recordings[j].birthday < oldestBirthday){
                                    oldestBirthday = recordings[j].birthday;
                                    R = j;
                                }
                            }
                        }
                    }
                    clearStaticRecording(R);
    
                    int nBones = (int) ithSkeleton.bones.size();
                    nBones = min(nBones, MAX_N_BONES_PER_SKELETON);
                    recordings[R].frames[0].nBones = nBones;
                    for (int b=0; b<nBones; b++){
                        ofPolyline bthBone = ithSkeleton.bones[b];
                        int nPoints = (int) bthBone.size();
                        nPoints = min(nPoints, MAX_POINTS_PER_BONE);
                        recordings[R].frames[0].bones[b].nPoints = nPoints;
                        for (int p=0; p<nPoints; p++){
                            float x = bthBone[p].x; float y = bthBone[p].y;
                            recordings[R].frames[0].bones[b].points[p].set(x,y);
                        }
                    }
                    recordings[R].frames[0].bbox = ofRectangle(
                        ithSkeleton.bbox.x,ithSkeleton.bbox.y,ithSkeleton.bbox.width,ithSkeleton.bbox.height);
                    recordings[R].frames[0].contourIndex = ithSkeleton.contourIndex;
                    recordings[R].frames[0].label = ithSkeleton.label;
                    recordings[R].frames[0].age   = ithSkeleton.age;
                    recordings[R].frames[0].r     = ithSkeleton.r;
                    recordings[R].frames[0].g     = ithSkeleton.g;
                    recordings[R].frames[0].b     = ithSkeleton.b;
                    recordings[R].frames[0].cx    = ithSkeleton.cx;
                    recordings[R].frames[0].cy    = ithSkeleton.cy;
                    
                    recordings[R].label = ithCurrContourLabel;
                    recordings[R].birthday = processFrame;
                    recordings[R].deathday = processFrame;
                    recordings[R].bAvailable = false; // CRUCIALLY
                    recordings[R].bApproved = false;
                    recordings[R].bPlaying = false;
                    recordings[R].playbackIndex = 0;
                    recordings[R].dxAvg = 0;
                    recordings[R].dyAvg = 0;
                    recordings[R].cxAvg = ithSkeleton.cx;
                    recordings[R].cyAvg = ithSkeleton.cy;
                    recordings[R].nFrames = 1;
                    
                } else {
                    // A current person was also in the recording collection.
                    // Find the active recording in skeletonRecordingCollection
                    // whose label is ithCurrContourLabel; add the ithSkeleton to it.
                    
                    for (int j=0; j<MAX_N_SKELETON_RECORDINGS; j++){
                        if (recordings[j].label == ithCurrContourLabel){
                            
                            // Set the data in recordings[j].frames[nFrames] from ithSkeleton
                            int nFrames = recordings[j].nFrames;
                            
                            // If necessary, shift the data down (overwrite oldest frames)
                            if (nFrames == MAX_N_SKELETONS_PER_RECORDING){
                                for (int s=1; s<MAX_N_SKELETONS_PER_RECORDING; s++){
                                    // recordings[j].frames[s-1] = recordings[j].frames[s]; // move it down
                                    recordings[j].frames[s-1].nBones = recordings[j].frames[s].nBones;
                                    recordings[j].frames[s-1].r      = recordings[j].frames[s].r;
                                    recordings[j].frames[s-1].g      = recordings[j].frames[s].g;
                                    recordings[j].frames[s-1].b      = recordings[j].frames[s].b;
                                    recordings[j].frames[s-1].cx     = recordings[j].frames[s].cx;
                                    recordings[j].frames[s-1].cy     = recordings[j].frames[s].cy;
                                    recordings[j].frames[s-1].label  = recordings[j].frames[s].label;
                                    recordings[j].frames[s-1].age    = recordings[j].frames[s].age;
                                    recordings[j].frames[s-1].contourIndex= recordings[j].frames[s].contourIndex;
                                    recordings[j].frames[s-1].bbox.x = recordings[j].frames[s].bbox.x;
                                    recordings[j].frames[s-1].bbox.y = recordings[j].frames[s].bbox.y;
                                    recordings[j].frames[s-1].bbox.width = recordings[j].frames[s].bbox.width;
                                    recordings[j].frames[s-1].bbox.height = recordings[j].frames[s].bbox.height;

                                    for (int b=0; b<MAX_N_BONES_PER_SKELETON; b++){
                                        // recordings[j].frames[s-1].bones[b] = recordings[j].frames[s].bones[b];
                                        recordings[j].frames[s-1].bones[b].nPoints =
                                        recordings[j].frames[s  ].bones[b].nPoints;
                                        
                                        for (int p=0; p<MAX_POINTS_PER_BONE; p++){
                                            recordings[j].frames[s-1].bones[b].points[p].x =
                                            recordings[j].frames[s  ].bones[b].points[p].x;
                                            recordings[j].frames[s-1].bones[b].points[p].y =
                                            recordings[j].frames[s  ].bones[b].points[p].y;
                                        }
                                    }
                                }
                                nFrames--;
                                recordings[j].nFrames = nFrames;
                            }
                            
                            
                            if (nFrames < MAX_N_SKELETONS_PER_RECORDING){
                                int nBones = (int) ithSkeleton.bones.size();
                                nBones = min(nBones, MAX_N_BONES_PER_SKELETON);
                                recordings[j].frames[nFrames].nBones = nBones;
                                for (int b=0; b<nBones; b++){
                                    ofPolyline bthBone = ithSkeleton.bones[b];
                                    int nPoints = (int) bthBone.size();
                                    nPoints = min(nPoints, MAX_POINTS_PER_BONE);
                                    recordings[j].frames[nFrames].bones[b].nPoints = nPoints;
                                    
                                    for (int p=0; p<nPoints; p++){
                                        float x = bthBone[p].x;
                                        float y = bthBone[p].y;
                                        recordings[j].frames[nFrames].bones[b].points[p].set(x,y);
                                    }
                                }
                                recordings[j].frames[nFrames].bbox = ofRectangle(
                                    ithSkeleton.bbox.x,ithSkeleton.bbox.y,ithSkeleton.bbox.width,ithSkeleton.bbox.height);
                                recordings[j].frames[nFrames].contourIndex = ithSkeleton.contourIndex;
                                recordings[j].frames[nFrames].label = ithSkeleton.label;
                                recordings[j].frames[nFrames].age   = ithSkeleton.age;
                                recordings[j].frames[nFrames].r     = ithSkeleton.r;
                                recordings[j].frames[nFrames].g     = ithSkeleton.g;
                                recordings[j].frames[nFrames].b     = ithSkeleton.b;
                                recordings[j].frames[nFrames].cx    = ithSkeleton.cx;
                                recordings[j].frames[nFrames].cy    = ithSkeleton.cy;
                                
                                // And meanwhile, calculate its movement statistics.
                                float cxAvg = 0;
                                float cyAvg = 0;
                                float dxAvg = 0;
                                float dyAvg = 0;
                                int nFramesm1 = nFrames-1;
                                if (nFramesm1 > 1){
                                    for (int k=0; k<nFramesm1; k++){
                                        float cx0 = recordings[j].frames[k].cx;
                                        float cy0 = recordings[j].frames[k].cy;
                                        float cx1 = recordings[j].frames[k+1].cx;
                                        float cy1 = recordings[j].frames[k+1].cy;
                                        float dx = cx1 - cx0;
                                        float dy = cy1 - cy0;
                                        dxAvg += dx;
                                        dyAvg += dy;
                                        cxAvg += cx0;
                                        cyAvg += cy0;
                                    }
                                    recordings[j].dxAvg = dxAvg/nFramesm1; // average motion
                                    recordings[j].dyAvg = dyAvg/nFramesm1;
                                    recordings[j].cxAvg = cxAvg/nFramesm1; // average centroid position
                                    recordings[j].cyAvg = cyAvg/nFramesm1;
                                }
                                
                                // And last but not least:
                                recordings[j].bAvailable = false; // paranoid
                                recordings[j].deathday = processFrame;
                                recordings[j].nFrames++;
                            }
                        }
                        
                    }
                    
                    
                }
            }
        }
    
        // Approve good ones; erase failed ones:
        // If enough time has passed since the most recently added frame,
        // and if length is less than minAgeToKeep, erase the recording.
        // but if length is adequate, then approve the recording for playback.
        int nFramesToWaitBeforeDeletion = trackerPersistence+3;
        for (int i=0; i<MAX_N_SKELETON_RECORDINGS; i++) {
            int deathday = recordings[i].deathday;
            int elapsedSinceDeathday = processFrame - deathday;
            if (elapsedSinceDeathday > nFramesToWaitBeforeDeletion) {
                int recordingLength = recordings[i].nFrames;
                if (recordingLength < minAgeToKeep) {
                    clearStaticRecording(i);
                } else {
                    recordings[i].bApproved = true;
                }
            }
        }

        cullSkeletonRecordings();
        updateReplayingSkeletonRecordings();
        updateMiniDisplay();
    }
}


//--------------------------------------------------------------
void ofApp::updateReplayingSkeletonRecordings(){
    
    if (!bPausePlayback){
        nReplayingSkeletonRecordings = 0;
        for (int j=0; j<MAX_N_SKELETON_RECORDINGS; j++) {
            if (recordings[j].bPlaying == true) {
                nReplayingSkeletonRecordings++;
                
                int nFrames = recordings[j].nFrames;
                int playbackIndex = recordings[j].playbackIndex;
                if (playbackIndex < (nFrames - 1)) {
                    // If we're playing, advance the playback head.
                    recordings[j].playbackIndex++;
                    
                } else {
                    // If we've reached the end, turn it off
                    if (recordings[j].deathday != processFrame){
                        recordings[j].playbackIndex = 0;
                        recordings[j].bPlaying = false;
                    } else {
                        recordings[j].playbackIndex = nFrames-1;
                    }
                    // break; // why the heck was this here?
                }
            }
        }
        
        // With some small likelihood, choose and initiate the playback of a suitable recording
        if (nReplayingSkeletonRecordings < maxPlaybacks){
            
            // Identify which items in skeletonRecordingCollection may be suitable; store their indices
            std::vector<int> indicesOfSuitableRecordings;
            indicesOfSuitableRecordings.clear();
            for (int i=0; i<MAX_N_SKELETON_RECORDINGS; i++){
                if ((recordings[i].bApproved == true) &&
                    (recordings[i].bPlaying == false)){
                    indicesOfSuitableRecordings.push_back(i);
                }
            }
            
            // With a low probability,
            int nSuitableRecordings = (int) indicesOfSuitableRecordings.size();
            if (nSuitableRecordings > 0){
                bool bKickoffNewPlayback = (ofRandomuf() < playbackProbability);
                if (bKickoffNewPlayback){
                    
                    // Select a suitable random recording and start it.
                    bool bDidIt = false;
                    while (bDidIt == false){
                        int whichIndex = (int) floor(ofRandom(nSuitableRecordings));
                        if (whichIndex < nSuitableRecordings){
                            int whichRecording = indicesOfSuitableRecordings[whichIndex];
                            if ((recordings[whichRecording].bApproved == true) &&
                                (recordings[whichRecording].bPlaying == false)){
                                
                                // The choreographer picks a dark place in miniDisplayC1
                                ofVec2f loc = getBestRecordingLocation();
                                float locx = loc.x; // Must be in 0...1
                                float locy = loc.y; // Must be in 0...2 (i.e. miniDisplayH/miniDisplayW)
                                float cx01 = recordings[whichRecording].cxAvg / skeletonBufW;
                                float cy01 = recordings[whichRecording].cyAvg / skeletonBufH;
                                float skelBufRatio = (float)skeletonBufH/(float)skeletonBufW;
                                
                                float playbackScale = ofMap(loc.y, 0,2, 0.5,1.5);
                                recordings[whichRecording].playbackScale = playbackScale;
                                recordings[whichRecording].playbackCx = locx + playbackScale*(0.5 - cx01);
                                recordings[whichRecording].playbackCy = locy + playbackScale*(0.5 - cy01)*skelBufRatio;
                                recordings[whichRecording].playbackIndex = 0;
                                recordings[whichRecording].bPlaying = true;
                                
                                bDidIt = true;
                            }
                        }
                    }
                }
            }
        }
        
    }
}

//--------------------------------------------------------------
ofVec2f ofApp::getBestRecordingLocation(){

    // Choose 50 random locations (within a 9:16 rect), pick the place which is darkest.
    // Returns a position in 0..1 for x
    // Returns a position in 0..2 for y (assuming that miniDisplayH:miniDisplayW = 2:1)!!!!
    unsigned char* miniDisplayPix = miniDisplayC1.getPixels().getData();
    int nTries = 50;
    int darkestX = miniDisplayW/2;
    int darkestY = miniDisplayH/2;
    int darkestVal = 255;
    int margin = 13;
    for (int t=0; t<nTries; t++){
        int rx = (int)(ofRandom(margin,  miniDisplayW           -margin));
        int ry = (int)(ofRandom(margin, (miniDisplayH * 8.0/9.0)-margin));
        // This 8.0/9.0 thing is just establishing a 9:16 ROI within a 1:2 rect
        int val = miniDisplayPix[ ry*miniDisplayW + rx ];
        if (val < darkestVal){
            darkestVal = val;
            darkestX = rx;
            darkestY = ry;
        }
    }
    
    float px = (float)darkestX / (float)(miniDisplayW);
    float py = (float)darkestY / (float)(miniDisplayW); // Note, 2:1
    ofVec2f location(px,py);
    return location;
}



//--------------------------------------------------------------
void ofApp::cullSkeletonRecordings(){
    
    // If no recording spots are available, clobber the oldest.
    int nAvailableRecordings = 0;
    for (int i=0; i<MAX_N_SKELETON_RECORDINGS; i++){
        if (recordings[i].bAvailable){
            nAvailableRecordings++;
        }
    }
    if (nAvailableRecordings == 0){
        //  Make the oldest recording available if it's not playing.
        int oldestBirthday = INT_MAX;
        int oldestBirthdayIndex = -1;
        for (int i=0; i<MAX_N_SKELETON_RECORDINGS; i++){
            if (recordings[i].bPlaying == false){
                if (recordings[i].birthday < oldestBirthday){
                    oldestBirthday = recordings[i].birthday;
                    oldestBirthdayIndex = i;
                }
            }
        }
        if (oldestBirthdayIndex >= 0){
            clearStaticRecording(oldestBirthdayIndex);
        }
    }
    
    // Periodically cull the shortest and/or longest approved skeletonRecordings
    if (processFrame%cullPeriod == 0){
        
        // Only cull if we have less than 25% space remaining;
        if (nAvailableRecordings < (MAX_N_SKELETON_RECORDINGS*0.25)){
            
            // Cull recordings whose average movement is less than some threshold
            if (bCullStillestRecordings){
                int indexOfStillestRecording = -1;
                float movementInStillestRecording = 999999;
                for (int i=0; i<MAX_N_SKELETON_RECORDINGS; i++){
                    if ((recordings[i].bApproved == true) &&
                        (recordings[i].bPlaying == false) &&
                        ((processFrame - recordings[i].deathday) > trackerPersistence*2)) {
                        float dxAvg = recordings[i].dxAvg;
                        float dyAvg = recordings[i].dyAvg;
                        float dhAvg = sqrtf(dxAvg*dxAvg + dyAvg*dyAvg);
                        if (dhAvg < movementInStillestRecording){
                            movementInStillestRecording = dhAvg;
                            indexOfStillestRecording = i;
                        }
                    }
                }
                if (indexOfStillestRecording != -1){
                    // Only cull ones that move less than leastAcceptableMovement
                    if (movementInStillestRecording < leastAcceptableMovement){
                        clearStaticRecording(indexOfStillestRecording);
                    }
                }
            }
            
            if (bCullLongestRecordings){
                int indexOfLongestRecording = -1;
                int longestRecordingLength = 0;
                for (int i=0; i<MAX_N_SKELETON_RECORDINGS; i++){
                    if ((recordings[i].bApproved == true) &&
                        (recordings[i].bPlaying == false) &&
                        ((processFrame - recordings[i].deathday) > trackerPersistence*2)) {
                        int len = recordings[i].nFrames;
                        if (len > longestRecordingLength){
                            longestRecordingLength = len; 
                            indexOfLongestRecording = i;
                        }
                    }
                }
                if (indexOfLongestRecording != -1){
                    int tooLong = (int)(MAX_N_SKELETONS_PER_RECORDING * 0.75);
                    if (longestRecordingLength > tooLong){
                        clearStaticRecording(indexOfLongestRecording);
                    }
                }
            }
        }
    }
}



//--------------------------------------------------------------
void ofApp::updateMiniDisplay(){
    
    if (bComputeMiniDisplay){
        unsigned char* miniDisplayPix = miniDisplayC1.getPixels().getData();
        const float shw = 0.5 * ((float)skeletonBufH/skeletonBufW);
        
        for (int j=0; j<MAX_N_SKELETON_RECORDINGS; j++) {
            Recording& jthRecording = recordings[j];
            
            bool bIsAPlayingRecording = ((jthRecording.bAvailable == false) &&
                                         (jthRecording.bApproved == true) &&
                                         (jthRecording.bPlaying == true) &&
                                         (bShowRecordedSkeletons == true));
            bool bIsALiveSkeleton     = ((jthRecording.bAvailable == false) &&
                                         (jthRecording.bApproved == false) &&
                                         (jthRecording.bPlaying == false) &&
                                         (bShowLiveSkeletons == true));
            
            // Turn off live skeletons if they're too deep into purgatory.
            float purgatoryDur = trackerPersistence/2.0;
            if (bIsALiveSkeleton){
                float purgatoryFrac = (float)(processFrame - jthRecording.deathday) / purgatoryDur;
                if (purgatoryFrac > 1.0){bIsALiveSkeleton = false;}
                purgatoryFrac = ofClamp(purgatoryFrac, 0,1);
            }
            
            // TODO Remember to re-enable bIsAPlayingRecording
            if (bIsAPlayingRecording || bIsALiveSkeleton){
                
                int nFrames = jthRecording.nFrames;
                int playbackIndex = jthRecording.playbackIndex;
                if ((playbackIndex >= 0) && (playbackIndex < nFrames)){
                    Skeleton& currentSkeleton = jthRecording.frames[playbackIndex];
                    int label = currentSkeleton.label; // only used for bogus positioning at the moment.
                    float frac = ofClamp((float)playbackIndex/(float)nFrames, 0,1);
                    float shapedFrac = function_TukeyWindow(frac, 0.35);
                    
                    if (bIsALiveSkeleton){
                        shapedFrac = 1.0;
                        float purgatoryFrac = (float)(processFrame - jthRecording.deathday) / purgatoryDur;
                        purgatoryFrac = ofClamp(purgatoryFrac, 0,1);
                        shapedFrac = powf(1.0-purgatoryFrac,4.0);
                    }
                    
                    // Get data from the Choreographer
                    float playbackCx    = jthRecording.playbackCx; // 0...1
                    float playbackCy    = jthRecording.playbackCy; // 0...2
                    float playbackScale = jthRecording.playbackScale;
                    float mx01 = playbackCx;
                    float my01 = playbackCy;
                    float mxScreen = playbackCx;
                    float myScreen = playbackCy;
                    
                    // Place the live Skeletons at the bottom of the screen.
                    // This same code needs to exist in renderSkeletons, line ~1523
                    if (bIsALiveSkeleton){
                        float cx01 = jthRecording.cxAvg / skeletonBufW;
                        float cy01 = jthRecording.cyAvg / skeletonBufH;
                        float locx = cx01;  // Must be in 0...1
                        float locy = 1.5;   // Must be in 0...2 (i.e. miniDisplayH/miniDisplayW)
                        float skelBufRatio = (float)skeletonBufH/(float)skeletonBufW;
                        playbackScale = 1.5;
                        playbackCx = locx + playbackScale*(0.5 - cx01);
                        playbackCy = locy + playbackScale*(0.5 - cy01)*skelBufRatio;
                        mx01 = playbackCx;
                        my01 = playbackCy;
                        mxScreen = mx01;
                        myScreen = my01;
                    }
                    
                    // vector<ofPolyline> bones = currentSkeleton.bones;
                    int nBones = currentSkeleton.nBones;
                    for (int b=0; b<nBones; b++){
                        Bone& bthBone = currentSkeleton.bones[b];
                        int nPoints = bthBone.nPoints;
                        
                        if (shapedFrac < 0.99){
    
                            // Calculate centroid of bone.
                            float bcx = 0;
                            float bcy = 0;
                            for (int k=0; k<nPoints; k++){
                                bcx += bthBone.points[k].x;
                                bcy += bthBone.points[k].y;
                            } 
                            bcx /= (float)nPoints;
                            bcy /= (float)nPoints;
                    
                            if ((bcx > 0)&&(bcx < 1)&&(bcy > 0)&&(bcy < 1)){
                                for (int k=0; k<nPoints; k++){
                                    float bdx = bthBone.points[k].x - bcx;
                                    float bdy = bthBone.points[k].y - bcy;
                                    float px = bcx + shapedFrac*bdx;
                                    float py = bcy + shapedFrac*bdy;
                                    int pxi = (int)roundf( (((px - 0.5)*playbackScale)+mxScreen)*miniDisplayW );
                                    int pyi = (int)roundf( (((py - shw)*playbackScale)+myScreen)*miniDisplayW );
                                    if ((pxi >= 0) && (pxi < miniDisplayW) && (pyi >= 0) && (pyi < miniDisplayH)){
                                        int pindex = pyi*miniDisplayW + pxi;
                                        miniDisplayPix[pindex] =   MAX(miniDisplayPix[pindex], (unsigned char)(255.0*shapedFrac));
                                    }
                                }
                            }
                            
                        } else {
                            for (int k=0; k<nPoints; k++){
                                int pxi = (int)( (((bthBone.points[k].x - 0.5)*playbackScale)+mxScreen)*miniDisplayW );
                                int pyi = (int)( (((bthBone.points[k].y - shw)*playbackScale)+myScreen)*miniDisplayW );
                                if ((pxi >= 0) && (pxi < miniDisplayW) && (pyi >= 0) && (pyi < miniDisplayH)){
                                    int pindex = pyi*miniDisplayW + pxi;
                                    miniDisplayPix[pindex]=255;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        miniDisplayC1.setFromPixels(miniDisplayPix, miniDisplayW, miniDisplayH);
        miniDisplayC1.blurGaussian(11);
        cv::Mat mat = cv::cvarrToMat(miniDisplayC1.getCvImage());
        cv::subtract(mat, cv::Scalar(1), mat);
        miniDisplayC1.flagImageChanged();
        // Choose darkest pixel within a margin'ed ROI
        
        // Create a remapped version, for display purposes.
        float wiggleT = ofGetElapsedTimef() * miniDisplayPowFreq;
        float wiggleFunction01 = ofMap(sin(wiggleT), -1,1, 0,1);
        wiggleFunction01 = powf(wiggleFunction01, miniDisplayWigglePow);
        float miniDisplayPow = ofMap(wiggleFunction01, 0,1,  miniDisplayPowLo,miniDisplayPowHi); // 3.5;
        for (int i=0; i<256; i++){
            miniDisplayLut.at<unsigned char>(i) = (unsigned char)(roundf(255.0 * powf(i/255.0, miniDisplayPow)));
        }
        cv::Mat imgMat = cv::cvarrToMat(miniDisplayC1.getCvImage());
        cv::Mat remappedMat = cv::cvarrToMat(miniDisplayRemappedC1.getCvImage());
        cv::LUT(imgMat, miniDisplayLut, remappedMat);
        miniDisplayRemappedC1.flagImageChanged();
    }
}


//--------------------------------------------------------------
void ofApp::draw() {
    
    
    if (bShowDebugView){
        ofBackground(40,40,40);
        drawDebugView();
        drawSkeletonRecordingData();
        
        displayScale = (float)ofGetHeight()/FBOH;
        displayX = debugItemW*2;
        displayY = 0;
        
    } else {
        ofBackground(0,0,0);
        displayX = 0;
        displayY = 0;
        
        float displayAspect = (float)ofGetWidth()/ofGetHeight();
        if (displayAspect > 1){ // wide
            displayScale = (float)ofGetHeight()/FBOH;
        } else {
            displayScale = 1080.0/FBOW;
        }
    }

    calculatePoissonFields2();
    drawPoissonDisplay2();
    drawFancySkeletonFbo();
    
    drawDiagnosticSkeletons();
    drawMiniDisplayOverlay();
    

    /*
    // Diagnostic; works.
    float fboDrawW = FBOW * (float)ofGetHeight()/(float)FBOH;
    float fboDrawH = ofGetHeight();
    poissonFiller.getTexture().draw(0, 0, fboDrawW, fboDrawH);
    poissonInputFbo.draw    (fboDrawW, 0, fboDrawW, fboDrawH);
    */
    

    glEnable(GL_BLEND);
    if (bShowGui){
        guiVision.draw();
        guiDisplay.draw();
    }
}

//--------------------------------------------------------------
void ofApp::drawMiniDisplayOverlay(){
    if (bCompositeMiniDisplay){
        ofPushMatrix();
        ofPushStyle();
        
        float mda = miniDisplayAlpha + 0.15*cosf(ofGetElapsedTimef()*miniDisplayAlphaFreq);
        mda = ofClamp(mda, 0,1);
        
        huntForBlendFunc(6000, 2,1); // 2,1 or 5,1
        ofTranslate(displayX,displayY);
        ofScale(displayScale);
        ofSetColor(255*mda);
        miniDisplayRemappedC1.draw(0,0, FBOW,FBOH);
        ofPopStyle();
        ofPopMatrix();
    }

    if (bShowDebugView){
        ofSetColor(255,255,255);
        miniDisplayC1.draw        (386,             520, miniDisplayW,miniDisplayH);
        miniDisplayRemappedC1.draw(386+miniDisplayW,520, miniDisplayW,miniDisplayH);
    }
}

//--------------------------------------------------------------
void ofApp::drawDiagnosticSkeletons(){
    if (bShowDiagnosticSkeletons){
        ofPushMatrix();
        ofPushStyle();
        ofTranslate(displayX,displayY);
        ofScale(displayScale);
        
        renderSkeletonRecordings(METHOD_DIAGNOSTIC);
        
        ofPopStyle();
        ofPopMatrix();
    }
}

//--------------------------------------------------------------
void ofApp::calculatePoissonFields2(){
    poissonInputFbo.begin();
    ofPushStyle();
    ofClear(0,0,0,0);
    ofNoFill();
    glDisable(GL_LINE_SMOOTH);
    
    renderSkeletonRecordings(METHOD_LINES_INTO_POISSON_FBO);
    ofPopStyle();

    /*
    // put some color at the top of the field (it's "artistic")
    if (bCalcPersonColors){
        ofSetColor(255,255,255);
    } else {
        ofSetColor(100,0,0);
    }
    ofDrawLine(0,0,FBOW,0);
     */
    
    poissonInputFbo.end();

    ofFill(); // necessary somehow
    float unif = ofNoise(ofGetElapsedTimef()*0.00123); // used to generate 'dither' noise
    
    float feedbackTwiddleSin = sinf(ofGetElapsedTimef()*feedbackTwiddleFrq);
    float f = ofMap(feedbackTwiddleSin, -1,1, 0,1);
    f = f-1.0;
    f = (f*f*f*f*f + 1.0); // Penner's EaseOut Quintic
    f = ofMap(f, 0,1, -0.01,0.03);
    poissonFiller.feedbackTwiddle = f;
    poissonFiller.process(poissonInputFbo.getTexture(), unif);
}

//--------------------------------------------------------------
void ofApp::drawPoissonDisplay2(){
    ofPushMatrix();
    ofPushStyle();
    ofTranslate(displayX,displayY);
    ofScale(displayScale);
    
    // fboAlpha is 16
    float fboa = fboAlpha + 8.0*sinf(ofGetElapsedTimef()*fboAlphaFreq);
    
    // Render poissonFiller into displayFbo accumulator
    displayFbo.begin();
    ofPushStyle();
    ofFill();
    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    ofSetColor(255,255,255,fboa);
    poissonFiller.getTexture().draw(0,0, FBOW,FBOH);
    ofPopStyle();
    displayFbo.end();

    // Render displayFbo accumulator
    ofFill();
    glEnable(GL_BLEND);
    huntForBlendFunc(1000, 3,4);
    ofSetColor(displayGray);
    displayFbo.draw(0,0);
    
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    drawLiveDisplayPeopleContours(0,0, FBOW);
    
    ofPopStyle();
    ofPopMatrix();
}

//--------------------------------------------------------------
void ofApp::drawFancySkeletonFbo(){
    ofPushMatrix();
    ofPushStyle();
    ofTranslate(displayX,displayY);
    ofScale(displayScale);
    
    if (!bFancyLineSkels){
        renderSkeletonRecordings(METHOD_PLAIN_LINES);
        
    } else {
        // Render fat skeletons into skeletonFbo
        skeletonFbo.begin();
        ofPushStyle();
        ofClear(0,0,0,0); //255,255,255,0);
        ofEnableSmoothing();
        ofEnableAntiAliasing();
        renderSkeletonRecordings(METHOD_FATBONES_INTO_FBO);
        ofPopStyle();
        skeletonFbo.end();
        
        float wiggleT = ofGetElapsedTimef() * skeletonFboAlphaFreq;
        float wiggleFunction01 = ofMap(cos(wiggleT), -1,1, 0,1);
        wiggleFunction01 = adjustableCenterDoubleExponentialSigmoid(wiggleFunction01, skeletonFboAlphaSigA, skeletonFboAlphaSigB);
        float skeletonFboAlpha = (float)(255.0*wiggleFunction01);
        
        // Render skeletonFbo over everything.
        ofPushStyle();
        ofFill();
        glEnable(GL_BLEND);
        huntForBlendFunc(1000, 2,5);
        ofSetColor(255,255,255, 255-skeletonFboAlpha);
        skeletonFbo.draw(0,0,FBOW,FBOH);
        ofPopStyle();
        
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    }

    ofPopStyle();
    ofPopMatrix();
}



//--------------------------------------------------------------
void ofApp::renderSkeletonRecordings(int whichMethod){
    int renderMethod = whichMethod;
    
    bool bNormalize = mySkeletonTracer->bNormalizeTheRawDrawing;
    bool bDrawSkeletons         = true;
    bool bDrawProcessRects      = false;
    bool bDrawScreenRect        = false;
    bool bDrawBboxes            = false;
    bool bDrawRecordingCentroids= false;
    
    bool bUseShapedAlpha        = true;
    bool bUseShapedRGB          = false;
    bool bUseShapedStrokeWeight = true;
    
    const int BONE_NOSHAPING = 0;
    const int BONE_SHRINK = 1; // use math to pull points toward bone centroid, has more charm
    const int BONE_RETRACT = 2; // draw fewer points on bones, starting from the ends
    int boneContractionMode = BONE_RETRACT;
    float baseStrokeWeight = 2.0;
    
    const int USE_COLORS_WHITE  = 0;
    const int USE_COLORS_VIDEO  = 1;
    const int USE_COLORS_PALET  = 2;
    int colorMode = USE_COLORS_WHITE;
    const int nPaletteCols = 5;
    const int nPalettes = 7;

    // from https://coolors.co/palettes/popular/5%20colors
    const int palettes[nPalettes][nPaletteCols] = {
        {0x22577A,0x38A3A5,0x57CC99,0x80ED99,0xC7F9CC},
        {0x264653,0x2A9D8F,0xE9C46A,0xF4A261,0xE76F51},
        {0x335C67,0xFFF3B0,0xE09F3E,0x9E2A2B,0x540B0E},
        {0x04283F,0x005B52,0x9EC131,0xDBF226,0xD6D48E},
        {0x003049,0xd62828,0xf77f00,0xfcbf49,0xeae2b7},
        {0x001524,0x15616d,0xffecd1,0xff7d00,0x78290f},
        {0x001427,0x708d81,0xf4d58d,0xbf0603,0x8d0801}
    };
    
    // Use a slowly-changing noise function to determine when to pick a new palette.
    bool bColorStatePrev = bColorState;
    float cNoi = ofNoise(ofGetElapsedTimef()*colorSwitchFreq);
    bColorState = (cNoi < 0.5);
    if (bColorStatePrev != bColorState){ // if it passes through 0.5, it's time to pick a new palette.
        int rp = (int)ofRandom(nPalettes+1); // +1 extra choice, for the live video colors; it's a hack
        if (rp >= nPalettes){
            bCalcPersonColors = true;
        } else if (rp < nPalettes){
            bCalcPersonColors = false;
            whichPalette = rp;
        }
    }

    // Assume that we've already scaled/translated prior to calling this function
    float DX = 0; //displayX;
    float DY = 0; //displayY;
    float DS = 1; //displayScale;
    
    switch(renderMethod){
        case METHOD_FATBONES_INTO_FBO:
            colorMode = USE_COLORS_WHITE;
            boneContractionMode = BONE_SHRINK;
            bUseShapedAlpha = false;
            baseStrokeWeight = fancySkelTh;
            break;
        
        case METHOD_DIAGNOSTIC:
            bDrawProcessRects = true;
            bDrawScreenRect = true;
            bDrawBboxes = true;
            bDrawRecordingCentroids = true;
            boneContractionMode = BONE_NOSHAPING;
            colorMode = USE_COLORS_WHITE;
            bUseShapedAlpha = false;
            bUseShapedRGB = false;
            bUseShapedStrokeWeight = false;
            baseStrokeWeight = 1.0;
            break;
            
        case METHOD_PLAIN_LINES:
            boneContractionMode = BONE_RETRACT;
            colorMode = USE_COLORS_WHITE;
            bUseShapedAlpha = true;
            bUseShapedRGB = false;
            bUseShapedStrokeWeight = true;
            baseStrokeWeight = 1.0;
            break;
            
        case METHOD_LINES_INTO_POISSON_FBO:
            boneContractionMode = BONE_SHRINK;
            colorMode = (bCalcPersonColors) ? USE_COLORS_VIDEO : USE_COLORS_PALET;
            bUseShapedAlpha = false; //wow, truly
            bUseShapedRGB = false;
            bUseShapedStrokeWeight = true;
            baseStrokeWeight = 1.0;
            break;
    }

    ofPushStyle();
    ofPushMatrix();
    ofTranslate(DX,DY);
    ofScale(DS);
    
    float scaleFactor = (bNormalize) ? FBOW : (FBOW/(float)skeletonBufW);
    ofScale(scaleFactor,scaleFactor);
    
    if (bDrawScreenRect){
        ofNoFill();
        ofSetLineWidth(5.0);
        ofSetColor(0,180,255);
        ofDrawRectangle(0,0,1, (16.0/9.0));
    }
    
    // For each PersonSkeletonRecording
    int playbackCounter = 0;
    for (int i=0; i<MAX_N_SKELETON_RECORDINGS; i++){
        Recording& ithRecording = recordings[i];
        
        bool bIsAPlayingRecording = ((ithRecording.bAvailable == false) &&
                                     (ithRecording.bApproved == true) &&
                                     (ithRecording.bPlaying == true) &&
                                     (bShowRecordedSkeletons == true));
        bool bIsALiveSkeleton     = ((ithRecording.bAvailable == false) &&
                                     (ithRecording.bApproved == false) &&
                                     (ithRecording.bPlaying == false) &&
                                     (bShowLiveSkeletons == true));
        
        // Purgatory is a brief duration after a Skeleton hasn't received fresh data,
        // during which it's waiting for possible new data to appear.
        // Turn off (and fade out) live skeletons if they're too deep into purgatory.
        float purgatoryDur = trackerPersistence/2.0;
        if (bIsALiveSkeleton){
            float purgatoryFrac = (float)(processFrame - ithRecording.deathday) / purgatoryDur;
            if (purgatoryFrac > 1.0){ bIsALiveSkeleton = false; }
            purgatoryFrac = ofClamp(purgatoryFrac, 0,1);
        }
        
        // Remember to re-enable this bIsA
        if (bIsAPlayingRecording || bIsALiveSkeleton){
            playbackCounter++;
            
            // Get the current Skeleton frame
            int nFrames = ithRecording.nFrames;
            int playbackIndex = ithRecording.playbackIndex;
            if (bIsALiveSkeleton){ playbackIndex = ithRecording.nFrames-1; }
            
            if ((playbackIndex >= 0) && (playbackIndex < nFrames)){
                Skeleton& currentSkeleton = ithRecording.frames[playbackIndex];
                int label = currentSkeleton.label;
                float frac = ofClamp((float)playbackIndex/(float)nFrames, 0,1);
                float shapedFrac = function_TukeyWindow(frac, 0.35);
                if (bIsALiveSkeleton){
                    shapedFrac = 1.0;
                    float purgatoryFrac = (float)(processFrame - ithRecording.deathday) / purgatoryDur;
                    purgatoryFrac = ofClamp(purgatoryFrac, 0,1);
                    shapedFrac = powf(1.0-purgatoryFrac,4.0);
                }
                
                // Get data from the Choreographer
                float playbackCx    = ithRecording.playbackCx; // 0...1
                float playbackCy    = ithRecording.playbackCy; // 0...2
                float playbackScale = ithRecording.playbackScale;
                float mx01 = playbackCx;
                float my01 = playbackCy;
                float mxScreen = playbackCx;
                float myScreen = playbackCy;
                
                // Place the live Skeletons at the bottom of the screen.
                // This same code needs to exist in miniDisplayUpdater, line ~1066
                if (bIsALiveSkeleton){
                    float cx01 = ithRecording.cxAvg / skeletonBufW;
                    float cy01 = ithRecording.cyAvg / skeletonBufH;
                    float locx = cx01;  // Must be in 0...1
                    float locy = 1.5;   // Must be in 0...2 (i.e. miniDisplayH/miniDisplayW)
                    float skelBufRatio = (float)skeletonBufH/(float)skeletonBufW;
                    playbackScale = 1.5;
                    playbackCx = locx + playbackScale*(0.5 - cx01);
                    playbackCy = locy + playbackScale*(0.5 - cy01)*skelBufRatio;
                    mx01 = playbackCx;
                    my01 = playbackCy;
                    mxScreen = mx01;
                    myScreen = my01;
                }
                
                ofPushMatrix();
                ofTranslate(mxScreen, myScreen);
                ofScale(playbackScale);
                
                // Center the containing process rectangle
                ofTranslate(-0.5, -0.5*((float)skeletonBufH/skeletonBufW));
                
                if (bDrawRecordingCentroids){
                    ofNoFill();
                    ofSetColor(255);
                    ofSetLineWidth(1.0);
                    float cx = ithRecording.cxAvg / skeletonBufW;
                    float cy = ithRecording.cyAvg / skeletonBufW;
                    ofDrawCircle(cx,cy, 0.01);
                }
                
                if (bDrawProcessRects){
                    // The rectangles of the entire processed region for a given skeleton
                    ofNoFill();
                    ofSetColor(127);
                    ofSetLineWidth(1.0);
                    float rw = 1; // units are skeletonBufW's
                    float rh = (float)skeletonBufH/skeletonBufW;
                    ofDrawRectangle(0,0,rw,rh);
                }
                
                if (bDrawBboxes){
                    ofNoFill();
                    ofSetColor(255);
                    ofSetLineWidth(1.0);
                    float bx = currentSkeleton.bbox.x;
                    float by = currentSkeleton.bbox.y;
                    float bw = currentSkeleton.bbox.width;
                    float bh = currentSkeleton.bbox.height;
                    ofDrawRectangle(bx,by,bw,bh);
                }
                
                if (bDrawSkeletons){
                    // Set the visual properties of currentSkeleton:
                    // color, alpha, strokeweight
                    float r=255,g=255,b=255,a=255;
                    if (colorMode == USE_COLORS_WHITE){
                        r = g = b = 255;
                        
                    } else if (colorMode == USE_COLORS_VIDEO){
                        r = currentSkeleton.r;
                        g = currentSkeleton.g;
                        b = currentSkeleton.b;
                        
                    } else if (colorMode == USE_COLORS_PALET){
                        int paletIndex = whichPalette % nPalettes;
                        int colorIndex = label % nPaletteCols;
                        
                        int theColor = palettes[paletIndex][colorIndex];
                        r = (float) ((theColor >> 16) & 0xFF);
                        g = (float) ((theColor >>  8) & 0xFF);
                        b = (float) ((theColor      ) & 0xFF);
                        
                        // Alter saturation and value periodically
                        r /= 255.0;
                        g /= 255.0;
                        b /= 255.0;
                        float h,s,v;
                        rgbToHsv(r,g,b, h,s,v);

                        float hsvModAmp = doubleExponentialSigmoid( ofMap(cosf(ofGetElapsedTimef()*hsvModModFrq),-1,1,  0,1), 0.8);
                        float hsvModulation = ofMap(hsvModAmp*sinf(ofGetElapsedTimef()*hsvModFrq), -1,1, 0,1);
                        hsvModulation = doubleExponentialSigmoid(hsvModulation, 0.8);
                        float del = 0.7;
                        float mx = ofMap(hsvModulation, 0,1, 1-del,1+del);
                        float my = ofMap(hsvModulation, 0,1, 1+del,1-del);
                        s = ofLerp(s, powf(s,mx), 1.0-my01); // change saturation
                        v = ofLerp(v, powf(v,my), 1.0-my01); // change brightness
                        hsvToRgb(h,s,v, r,g,b);
                        r *= 255.0;
                        g *= 255.0;
                        b *= 255.0;
                    }
                    
                    float sw = baseStrokeWeight;
                    if (bIsALiveSkeleton){
                        if (renderMethod == METHOD_FATBONES_INTO_FBO){
                            sw = baseStrokeWeight*3.0;
                        }
                    }
                    
                    if (bUseShapedAlpha){
                        a *= shapedFrac;
                    }
                    if (bUseShapedRGB){
                        r *= shapedFrac;
                        g *= shapedFrac;
                        b *= shapedFrac;
                    }
                    
                    if (bUseShapedStrokeWeight){ sw *= shapedFrac; }
                    if (bNormalize){ sw /= (float)skeletonBufW; }
                    sw = strokeWeightScaleMix*sw + (1-strokeWeightScaleMix)*(sw/playbackScale);
                    
                    ofSetColor(r,g,b,a);
                    ofSetLineWidth(sw);
                    ofNoFill();
                    
                    //---------------------
                    int nBones = currentSkeleton.nBones;
                    for (int j=0; j<nBones; j++){
                        Bone& jthBone = currentSkeleton.bones[j];
                        int nPoints = jthBone.nPoints;
                        if (nPoints > 1){
                            
                            if (renderMethod == METHOD_FATBONES_INTO_FBO){
                                // Use SkeletonBoneDrawer
                                ofFill();
                                
                                if ((shapedFrac > 0.99) || (boneContractionMode == BONE_NOSHAPING)){
                                    if (bIsALiveSkeleton){
                                        boneDrawer->drawScaledDottedBone(jthBone, sw);
                                    } else {
                                        boneDrawer->drawScaledBone (jthBone, sw);
                                    }
                                    
                                } else if (boneContractionMode == BONE_RETRACT){
                                    ofPolyline jthBoneRetracted;
                                    jthBoneRetracted.clear();
                                    int indexC = (int)(nPoints/2.0);
                                    float delta = shapedFrac*indexC;
                                    int indexA = MAX(0,         MIN(indexC, (int)round(indexC - delta)));
                                    int indexB = MIN(nPoints-1, MAX(indexC, (int)round(indexC + delta)));
                                    if ((indexB - indexA) > 0){
                                        for (int k=indexA; k<=indexB; k++){
                                            float x = jthBone.points[k].x;
                                            float y = jthBone.points[k].y;
                                            jthBoneRetracted.addVertex(x,y);
                                        }
                                        boneDrawer->drawScaled(jthBoneRetracted, sw);
                                    }
                                    
                                } else if (boneContractionMode == BONE_SHRINK){
                                    ofPolyline jthBoneShrunk;
                                    jthBoneShrunk.clear();
                                    
                                    float bcx = 0; float bcy = 0;
                                    for (int k=0; k<nPoints; k++){ // Calculate centroid of bone.
                                        bcx += jthBone.points[k].x; bcy += jthBone.points[k].y;
                                    } bcx /= (float)nPoints; bcy /= (float)nPoints;
                                    
                                    if ((bcx > 0)&&(bcx < 1)&&(bcy > 0)&&(bcy < 1)){
                                        // There are rare, spurious outlier errors...
                                        for (int k=0; k<nPoints; k++){
                                            float x = jthBone.points[k].x;
                                            float y = jthBone.points[k].y;
                                            float bdx = x - bcx;
                                            float bdy = y - bcy;
                                            float px = bcx + shapedFrac*bdx;
                                            float py = bcy + shapedFrac*bdy;
                                            jthBoneShrunk.addVertex(px,py);
                                        } 
                                        boneDrawer->drawScaled (jthBoneShrunk, sw);
                                    }
                                }
                                
                            } else {
                                // Use ofBeginShape/ofVertex/ofEndShape

                                if ((shapedFrac > 0.99) || (boneContractionMode == BONE_NOSHAPING)){
                                    ofBeginShape();
                                    for (int k=0; k<nPoints-1; k++){
                                        float x = jthBone.points[k].x;
                                        float y = jthBone.points[k].y;
                                        ofVertex(x,y);
                                    } ofEndShape(false);
                                    
                                } else if (boneContractionMode == BONE_SHRINK){
                                    
                                    float bcx = 0; float bcy = 0;
                                    for (int k=0; k<nPoints; k++){ // Calculate centroid of bone.
                                        bcx += jthBone.points[k].x; 
                                        bcy += jthBone.points[k].y;
                                    }
                                    bcx /= (float)nPoints;
                                    bcy /= (float)nPoints;
                                    
                                    ofBeginShape();
                                    for (int k=0; k<nPoints; k++){
                                        float x = jthBone.points[k].x;
                                        float y = jthBone.points[k].y;
                                        float bdx = x - bcx;
                                        float bdy = y - bcy;
                                        float px = bcx + shapedFrac*bdx;
                                        float py = bcy + shapedFrac*bdy;
                                        ofVertex(px,py);
                                    } ofEndShape(false);
                                    
                                } else if (boneContractionMode == BONE_RETRACT){
                                    int indexC = (int)(nPoints/2.0);
                                    float delta = shapedFrac*indexC;
                                    int indexA = MAX(0,         MIN(indexC, (int)round(indexC - delta)));
                                    int indexB = MIN(nPoints-1, MAX(indexC, (int)round(indexC + delta)));
                                    if ((indexB - indexA) > 0){
                                        ofBeginShape();
                                        for (int k=indexA; k<=indexB; k++){
                                            float x = jthBone.points[k].x;
                                            float y = jthBone.points[k].y;
                                            ofVertex(x,y);
                                        } ofEndShape(false);
                                    }
                                }
                            }
                            
                        }
                    }
                }
                
                
                
                ofPopMatrix();
                
            }
        }
    }
    
    ofPopMatrix();
    ofPopStyle();
}


//--------------------------------------------------------------
float ofApp::function_TukeyWindow (float x, float a) {
    // http://en.wikipedia.org/wiki/Window_function
    // The Tukey window, also known as the tapered cosine window,
    // can be regarded as a cosine lobe of width \tfrac{\alpha N}{2}
    // that is convolved with a rectangle window of width \left(1 -\tfrac{\alpha}{2}\right)N.
    // At alpha=0 it becomes rectangular, and at alpha=1 it becomes a Hann window.
    // Recommend a = 0.2-0.4

    float ah = a/2.0;
    float omah = 1.0 - ah;

    float y = 1.0;
    if (x <= ah) {
        y = 0.5 * (1.0 + cos(PI* ((2.0*x/a) - 1.0)));
    }
    else if (x > omah) {
        y = 0.5 * (1.0 + cos(PI* ((2.0*x/a) - (2.0/a) + 1.0)));
    }
    return y;
}




//--------------------------------------------------------------
void ofApp::drawSkeletonRecordingData(){
    ofPushStyle();
    
    float tx = 10; //1280;
    float ty = 520; //40;
    float tdy = 11;
    
    int nApprovedRecordings = 0;
    int nUnavailableRecordings = 0;
    for (int i=0; i<MAX_N_SKELETON_RECORDINGS; i++){
        if (recordings[i].bAvailable == false){
            nUnavailableRecordings++;
        }
        if (recordings[i].bApproved){
            nApprovedRecordings++;
        }
    }
    
    std::string plstr = "";
    plstr += ofToString(nUnavailableRecordings) + "; ";
    plstr += ofToString(nApprovedRecordings) + "; ";
    plstr += ofToString(nReplayingSkeletonRecordings);
    ofSetColor(255,255,0);
    ofDrawBitmapString(plstr, tx,ty);ty+=tdy;
    ofSetLineWidth(1.0);
    
    float y = ty;
    for (int i=0; i<MAX_N_SKELETON_RECORDINGS; i++){
        if (recordings[i].bAvailable == false){
            
            int label =   recordings[i].label;
            int nFrames = recordings[i].nFrames;
            float dxAvg = recordings[i].dxAvg;
            float dyAvg = recordings[i].dyAvg;
            float dhAvg = sqrtf(dxAvg*dxAvg + dyAvg*dyAvg);
            
            int hexCol = (recordings[i].bApproved) ? 0x00FF00 : 0xFF0000;
            ofSetHexColor(hexCol);
            ofDrawLine(tx+20, y-5, tx+20+nFrames, y-5);
            std::string str = ofToString(label) + "\t" + ofToString(nFrames);// + "\t" + ofToString(dhAvg);
            
            if (recordings[i].bPlaying){
                int playbackIndex = recordings[i].playbackIndex;
                float frac = playbackIndex/(float)nFrames;
                float px = tx+20 + frac*nFrames;
                ofSetColor(180,255,0);
                ofDrawCircle(px,y-5, 3);
                ofSetColor(255);
                ofDrawBitmapString(str, tx,y);
            } else {
                ofSetColor(140);
                ofDrawBitmapString(str, tx,y);
            }
            y += tdy;
        }
    }
    ofPopStyle();
}




//--------------------------------------------------------------
void ofApp::huntForBlendFunc(int period, int defaultSid, int defaultDid){
    // sets all possible combinations of blend functions,
    // changing modes every [period] milliseconds.
    
    int sfact[] = {
        GL_ZERO,
        GL_ONE,
        GL_DST_COLOR,
        GL_ONE_MINUS_DST_COLOR,
        GL_SRC_ALPHA,
        GL_ONE_MINUS_SRC_ALPHA,
        GL_DST_ALPHA,
        GL_ONE_MINUS_DST_ALPHA,
        GL_SRC_ALPHA_SATURATE
    };
        
    int dfact[] = {
        GL_ZERO,
        GL_ONE,
        GL_SRC_COLOR,
        GL_ONE_MINUS_SRC_COLOR,
        GL_SRC_ALPHA,
        GL_ONE_MINUS_SRC_ALPHA,
        GL_DST_ALPHA,
        GL_ONE_MINUS_DST_ALPHA
    };
    
    glEnable(GL_BLEND);
    
    if ((defaultSid == -1) && (defaultDid == -1)) {

        int sid =  (ofGetElapsedTimeMillis()/(8*period))%9;
        int did =  (ofGetElapsedTimeMillis()/period)%8;
        glBlendFunc(sfact[sid], dfact[did]);
        printf("SRC %d    DST %d\n", sid, did);
        
    } else if (defaultDid == -1){
    
        int did =  (ofGetElapsedTimeMillis()/period)%8;
        glBlendFunc(sfact[defaultSid], dfact[did]);
        printf("SRC %d    DST %d\n", defaultSid, did);
    
    } else if (defaultSid == -1){
    
        int sid =  (ofGetElapsedTimeMillis()/(8*period))%9;
        glBlendFunc(sfact[sid], dfact[defaultDid]);
        printf("SRC %d    DST %d\n", sid, defaultDid);
        
    } else {
        
        glBlendFunc(sfact[defaultSid], dfact[defaultDid]);
    
    }
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
        
        for (int j=0; j<MAX_N_SKELETON_RECORDINGS; j++){
            Recording& jthRecording = recordings[j];
            bool bIsALiveSkeleton     =  ((jthRecording.bAvailable == false) &&
                                          (jthRecording.bApproved == false) &&
                                          (jthRecording.bPlaying == false) &&
                                          (bShowLiveSkeletons == true));
            
            if (bIsALiveSkeleton){
                int recordingLabel = jthRecording.label;
                
                for (int i=0; i<nPersonContours; i++){
                    PersonContour ithPersonContour = personContours[i];
                    int personContourLabel = ithPersonContour.label;
                    if (personContourLabel == recordingLabel){
                        
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
                }
            }
            
        }
        
    
        ofPopMatrix();
        ofNoFill();
    }
}



//--------------------------------------------------------------
void ofApp::drawDebugView(){
    ofPushStyle();
    
    float dw = debugItemW;
    float dh = dw*((float)processH/processW);
    
    // Draw main video
    ofSetColor(255);
    float vy= dh - dw*((float)captureH/captureW);
    if (whichVideoType == 0){
        videoPlayer.draw(0,vy, dw,dw*((float)captureH/captureW));
    } else { // } if (whichVideoType == 1){
        videoGrabber.draw(0,vy, dw,dw*((float)captureH/captureW));
    }

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
    ofPopStyle();
}

//--------------------------------------------------------------
void ofApp::keyPressed(int key) {
    lastInteractionTimeMs = ofGetElapsedTimeMillis();
    
    if (whichVideoType == 0){
        if (key == ' '){
            bool bP = videoPlayer.isPaused();
            videoPlayer.setPaused(!bP);
        }
    }
    
    if (key == 'F'){
        bFullscreen = !bFullscreen;
        ofSetFullscreen(bFullscreen);
        if (!bShowGui && !bShowDebugView && bFullscreen){
            ofHideCursor();
        }
    } else if (key == 'g'){
        bShowGui = !bShowGui;
        if (bShowGui){
            ofShowCursor();
        } else if (!bShowGui && !bShowDebugView && bFullscreen){
            ofHideCursor();
        }
    } else if (key == 'D'){
        bShowDebugView = !bShowDebugView;
        if (!bShowDebugView){
            bShowGui = false;
            ofHideCursor();
        } else {
            ofShowCursor();
        }
    } else if (key == 'P'){
        bPausePlayback = !bPausePlayback;
    } else if (key == '?'){
        bShowDiagnosticSkeletons = !bShowDiagnosticSkeletons;
    } else if (key == 'S'){
        guiVision.saveToFile("settings/settingsVision.xml");
        guiDisplay.saveToFile("settings/settingsDisplay.xml");
    } else if (key == 'L'){
        guiVision.loadFromFile("settings/settingsVision.xml");
        guiDisplay.loadFromFile("settings/settingsDisplay.xml");
    } else if (key == 'X'){
        skeletonRecordingCollection.clear();
        clearRecordingsStatic();
    } else if (key == 'E'){ // export
        exportSkeletonRecordingCollectionStatic("settings/skeletonRecordingCollection.xml");
    } else if (key == 'I'){ // import
        importSkeletonRecordingCollectionStatic("settings/skeletonRecordingCollection.xml");
        
    } else if (key == OF_KEY_LEFT){
        if (bShowDebugView){ sourceX = (int)(sourceX-1);}
    } else if (key == OF_KEY_RIGHT){
        if (bShowDebugView){ sourceX = (int)(sourceX+1);}
    } else if (key == OF_KEY_UP){
        if (bShowDebugView){ sourceY = (int)(sourceY-1);}
    } else if (key == OF_KEY_DOWN){
        if (bShowDebugView){ sourceY = (int)(sourceY+1);}
    }
        
}



//--------------------------------------------------------------
void ofApp::keyReleased(int key) {
}
//--------------------------------------------------------------
void ofApp::mouseMoved(int x, int y) {
    lastInteractionTimeMs = ofGetElapsedTimeMillis();
}
//--------------------------------------------------------------
void ofApp::mouseDragged(int x, int y, int button) {
    lastInteractionTimeMs = ofGetElapsedTimeMillis();
}
//--------------------------------------------------------------
void ofApp::mousePressed(int x, int y, int button) {
    lastInteractionTimeMs = ofGetElapsedTimeMillis();
}
//--------------------------------------------------------------
void ofApp::mouseReleased(int x, int y, int button) {
    lastInteractionTimeMs = ofGetElapsedTimeMillis();
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
void ofApp::importSkeletonRecordingCollectionStatic(const std::string& filename) {
    // Clear the recordings array.
    clearRecordingsStatic();
    
    ofxXmlSettings xml;
    if (!xml.loadFile(filename)) {
        ofLogError() << "Failed to load file: " << filename;
        return;
    }
    
    xml.pushTag("SkeletonRecordingCollection");
    int numRecordings = xml.getNumTags("PSR");
    numRecordings = min(numRecordings, MAX_N_SKELETON_RECORDINGS);
    for (int i = 0; i < numRecordings; ++i) {
        xml.pushTag("PSR", i);
        
        recordings[i].bAvailable = false;
        recordings[i].bApproved = xml.getValue("bApproved", true);
        recordings[i].bPlaying = xml.getValue("bPlaying", false);
        recordings[i].label = xml.getValue("label", 0);
        recordings[i].birthday = xml.getValue("birthday", 0);
        recordings[i].deathday = xml.getValue("deathday", 0);
        recordings[i].dxAvg = xml.getValue("dxAvg", 0.0f);
        recordings[i].dyAvg = xml.getValue("dyAvg", 0.0f);
        recordings[i].cxAvg = xml.getValue("cxAvg", 0.0f);
        recordings[i].cyAvg = xml.getValue("cyAvg", 0.0f);
        recordings[i].playbackIndex = xml.getValue("playbackI", 0);
        recordings[i].playbackCx = xml.getValue("playbackCx", 0.0f);
        recordings[i].playbackCy = xml.getValue("playbackCy", 0.0f);
        recordings[i].playbackScale = xml.getValue("playbackS", 1.0f);

        xml.pushTag("F");
        int numFrames = xml.getNumTags("PS");
        numFrames = min(numFrames, MAX_N_SKELETONS_PER_RECORDING);
        recordings[i].nFrames = numFrames; // OR xml.getValue("nFrames", 0); // ????
        
        for (int j = 0; j < numFrames; ++j) {
            xml.pushTag("PS", j);
            
            recordings[i].frames[j].bbox.x = xml.getValue("bbX", 0.0f);
            recordings[i].frames[j].bbox.y = xml.getValue("bbY", 0.0f);
            recordings[i].frames[j].bbox.width = xml.getValue("bbW", 0.0f);
            recordings[i].frames[j].bbox.height = xml.getValue("bbH", 0.0f);
            recordings[i].frames[j].contourIndex = xml.getValue("contourI", 0);
            recordings[i].frames[j].label = xml.getValue("label", 0);
            recordings[i].frames[j].age = xml.getValue("age", 0);
            recordings[i].frames[j].r = xml.getValue("r", 0.0f);
            recordings[i].frames[j].g = xml.getValue("g", 0.0f);
            recordings[i].frames[j].b = xml.getValue("b", 0.0f);
            recordings[i].frames[j].cx = xml.getValue("cx", 0.0f);
            recordings[i].frames[j].cy = xml.getValue("cy", 0.0f);

            xml.pushTag("Bs");
            int numBones = xml.getNumTags("B");
            numBones = min(numBones, MAX_N_BONES_PER_SKELETON);
            recordings[i].frames[j].nBones = numBones; // OR xml.getValue("nBones", 0); // ????
            
            for (int k = 0; k < numBones; ++k) {
                xml.pushTag("B", k);
                int numVertices = xml.getNumTags("V");
                numVertices = min(numVertices, MAX_POINTS_PER_BONE);
                recordings[i].frames[j].bones[k].nPoints = numVertices; // OR xml.getValue("nPoints", 0); // ????
                
                for (int l = 0; l < numVertices; ++l) {
                    xml.pushTag("V", l);
                    float x = xml.getValue("x", 0.0f);
                    float y = xml.getValue("y", 0.0f);
                    recordings[i].frames[j].bones[k].points[l].set(x,y);
                    xml.popTag(); // V, Vertex
                }
                xml.popTag(); // B, Bone
            }
            xml.popTag(); // Bs, Bones
            xml.popTag(); // PersonSkeleton
        }
        xml.popTag(); // F, Frames
        xml.popTag(); // PSR, PersonSkeletonRecording
    }
    xml.popTag(); // SkeletonRecordingCollection
}


//--------------------------------------------------------------
void ofApp::exportSkeletonRecordingCollectionStatic (const std::string& filename) {
    // Note: const float floatPrecision = 5; changed in ofxXmlSettings.cpp, line 9
    // By default, has a value of 9.
    xml.addTag("SkeletonRecordingCollection");
    xml.pushTag("SkeletonRecordingCollection");

    int savedRecordingCount = 0;
    for (int i = 0; i < MAX_N_SKELETON_RECORDINGS; ++i) {
        if (recordings[i].bApproved){
            
            xml.addTag("PSR"); // PersonSkeletonRecording
            xml.pushTag("PSR", savedRecordingCount);
            savedRecordingCount++;
            
            xml.addValue("bAvailable", recordings[i].bApproved);
            xml.addValue("bPlaying",  recordings[i].bPlaying);
            xml.addValue("bApproved", recordings[i].bApproved);
            xml.addValue("nFrames",   recordings[i].nFrames);
            xml.addValue("label",     recordings[i].label);
            xml.addValue("birthday",  recordings[i].birthday);
            xml.addValue("deathday",  recordings[i].deathday);

            xml.addValue("dxAvg",     recordings[i].dxAvg);
            xml.addValue("dyAvg",     recordings[i].dyAvg);
            xml.addValue("cxAvg",     recordings[i].cxAvg);
            xml.addValue("cyAvg",     recordings[i].cyAvg);
            xml.addValue("playbackI", recordings[i].playbackIndex);
            xml.addValue("playbackCx",recordings[i].playbackCx);
            xml.addValue("playbackCy",recordings[i].playbackCy);
            xml.addValue("playbackS", recordings[i].playbackScale);
            
            xml.addTag("F"); // Frames
            xml.pushTag("F");
            int nFrames = recordings[i].nFrames;
            nFrames = min(nFrames, MAX_N_SKELETONS_PER_RECORDING);
            
            for (int j=0; j<nFrames; ++j) {
                xml.addTag("PS"); // PersonSkeleton
                xml.pushTag("PS", j);
                
                xml.addValue("nBones",   recordings[i].frames[j].nBones);
                xml.addValue("bbX",      recordings[i].frames[j].bbox.x);
                xml.addValue("bbY",      recordings[i].frames[j].bbox.y);
                xml.addValue("bbW",      recordings[i].frames[j].bbox.width);
                xml.addValue("bbH",      recordings[i].frames[j].bbox.height);
                xml.addValue("contourI", recordings[i].frames[j].contourIndex);
                xml.addValue("label",    recordings[i].frames[j].label);
                xml.addValue("age",      recordings[i].frames[j].age);
                xml.addValue("r",        recordings[i].frames[j].r);
                xml.addValue("g",        recordings[i].frames[j].g);
                xml.addValue("b",        recordings[i].frames[j].b);
                xml.addValue("cx",       recordings[i].frames[j].cx);
                xml.addValue("cy",       recordings[i].frames[j].cy);
                
                xml.addTag("Bs"); //  Bones
                xml.pushTag("Bs");
                int nBones = recordings[i].frames[j].nBones;
                nBones = min(nBones, MAX_N_BONES_PER_SKELETON);
                
                for (int k = 0; k < nBones; ++k) {
                    xml.addTag("B"); // Bone
                    xml.pushTag("B", k);
                    
                    int nPoints = recordings[i].frames[j].bones[k].nPoints;
                    for (int l = 0; l < nPoints; ++l) {
                        xml.addTag("V"); // Vertex
                        xml.pushTag("V", l);
                        xml.addValue("x", recordings[i].frames[j].bones[k].points[l].x);
                        xml.addValue("y", recordings[i].frames[j].bones[k].points[l].y);
                        xml.popTag();
                    }
                    xml.popTag(); // Bone
                }
                xml.popTag(); // Bones
                xml.popTag(); // PersonSkeleton
            }
            xml.popTag(); // Frames
            xml.popTag(); // PersonSkeletonRecording
        }
    }
    xml.popTag(); // SkeletonRecordingCollection
    xml.saveFile(filename);
}






//--------------------------------------------------------------
float ofApp::doubleExponentialSigmoid (float x, float a){
    float epsilon = 0.00001;
    float min_param_a = 0.0 + epsilon;
    float max_param_a = 1.0 - epsilon;
    a = min(max_param_a, max(min_param_a, a));
    a = 1.0-a; // for sensible results

    float y=0;
    if (x<=0.5){
        y = (powf(2.0*x, 1.0/a))/2.0;
    } else {
        y = 1.0 - (powf(2.0*(1.0-x), 1.0/a))/2.0;
    }
    return y;
}

//--------------------------------------------------------------
float ofApp::adjustableCenterDoubleExponentialSigmoid (float x, float a, float b){
    float epsilon = 0.00001;
    float min_param_a = 0.0 + epsilon;
    float max_param_a = 1.0 - epsilon;
    a = ofClamp(a, min_param_a, max_param_a);
    a = 1-a;
  
    float y = 0;
    float w = max(0.0, min(1.0, x-(b-0.5)));
    if (w<=0.5){
        y = (powf(2.0*w, 1.0/a))/2.0;
    }
    else {
        y = 1.0 - (powf(2.0*(1.0-w), 1.0/a))/2.0;
    }
    return y;
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


