#include "ofApp.h"

using namespace ofxCv;
using namespace cv;

/*
 * Todo:
 * blur shader on skeletonFbo
 * make better placement algorithm ("choreographer"), try ofxOpenCv
 * have live skels occasionally get black body contours
 * propagate video colors & related GUI boolean; occasionally choose live colors
 * expose sinusoidal shader uniform to GUI, control with slow Perlin noise
 * re-introduce live skeletons into display
 * compute average centroid over entire recording; use to enhance placement
 * obtain more palettes, devise switching system.
 * export and load recordings
 * load GUI settings at start
 * test app on other machine
 * enable playback pause
 * expose swScaleMix to GUI
 * make colors fade (like fog)
 * use shrink or retract based on how many bones. Few bones = retract
 */

//--------------------------------------------------------------
void ofApp::setup() {
	ofSetFrameRate(30);
	ofSetVerticalSync(true);
	ofSetWindowTitle("Ghost Pole Propagator III (2024)");
    
    bFullscreen = false;
    bShowGui = true;
    bShowDebugView = true;
    bShowDiagnosticSkeletons = false;
    displayX = 0;
    displayY = 0;
    displayScale = 1;
    averageVideoColor.set(0,0,0);
    
    initializeFbos();
    
    ofxGuiSetDefaultWidth(256);
    guiVision.setup("Vision");
    guiVision.setPosition(10, 520);
    guiVision.add(currFPS.setup("currFPS", 30, 10, 120));
    guiVision.add(downsampleRatio.setup("downsampleRatio", 0.4375, 0.0, 1.0)); // smaller is faster, less accurate. 0.4375
    guiVision.add(maskThreshold.setup("maskThreshold", 50, 0,255));
    guiVision.add(sourceW.setup("sourceW", 768, 120, 1080));
    guiVision.add(sourceH.setup("sourceH", 336, 120, 1080));
    guiVision.add(sourceX.setup("sourceX", 192, 0, 1920));
    guiVision.add(sourceY.setup("sourceY", 692, 0, 1080));
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
    
    guiDisplay.setup("Display");
    guiDisplay.setPosition(280, 520);
    guiDisplay.add(minAgeToKeep.setup("minAgeToKeep", 30, 0, 100));
    guiDisplay.add(fboAlpha.setup("fboAlpha", 16, 0, 255));
    guiDisplay.add(displayGray.setup("displayGray", 216, 0, 255));
    guiDisplay.add(bLineEffect.setup("bLineEffect", !true));
    guiDisplay.add(skeletonFboAlpha.setup("skeletonFboAlpha", 255, 0, 255));
    guiDisplay.add(bFancyLineSkels.setup("bFancyLineSkels", true));
    guiDisplay.add(bCalcPersonColors.setup("bCalcPersonColors", true));
    guiDisplay.add(cullPeriod.setup("cullPeriod", 100, 20, 500));
    guiDisplay.add(cullBeyondSize.setup("cullBeyondSize", 32, 10, 100));
    guiDisplay.add(bCullLongestRecordings.setup("bCullLongestRecordings", true));
    guiDisplay.add(bCullStillestRecordings.setup("bCullStillestRecordings", true));
    guiDisplay.add(liveContourAlpha.setup("liveContourAlpha", 0, 0, 255));
    guiDisplay.add(maxPlaybacks.setup("maxPlaybacks", 10, 1, 32));
    guiDisplay.add(playbackProbability.setup("playbackProbability", 0.07, 0.001, 0.5));
    
    // gui.add(myButton.setup("butty"));
    
    #ifdef USE_LIVE_VIDEO
        video.setDesiredFrameRate(30);
        video.setup(camWidth, camHeight);
    #else
        video.load("video/locationFullSilent.mp4");
        video.setVolume(0.0);
        video.play();
        video.setSpeed(1.0);
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
    processFrame = 0;
    processW = 448; //512;
    processH = 196; //224;
    debugItemW = 384;
    processVideoC3.allocate(processW,processH);
    
	
    // parameters for the neural network
    float batchSize = 4.0f;
    float numChannels = 3.0f; //3.0f;
    tfInputs = {
		cppflow::tensor({ (float)downsampleRatio }),
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
    boneDrawer = new SkeletonBoneDrawer();
    personContours.clear();
    skeletonRecordingCollection.clear();
    labelsOfReplayingSkeletonRecordings.clear();
}

//--------------------------------------------------------------
void ofApp::initializeFbos(){
    // glDisable(GL_DITHER);
    
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
    // skeletonFboSettings.textureTarget = GL_TEXTURE_2D;
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
    video.update();
    if(video.isFrameNew()) {
        processFrame++;
        detectPeopleAndComputeMask();
    }
    extractAndTrackContours();
    processSkeletons();
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
                        aPersonContour.timestamp = ofGetSystemTimeMillis();
                        
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
            
            // Collate the labels of all PersonSkeletonRecording's in skeletonRecordingCollection.
            std::set<int> prevLabelSet;
            for (int i=0; i<(int)skeletonRecordingCollection.size(); i++){
                PersonSkeletonRecording ithRecordingInCollection = skeletonRecordingCollection[i];
                prevLabelSet.insert(ithRecordingInCollection.label);
            }
        
            // For each person in personContours, check if its label is in prevLabelSet.
            for (int i=0; i<(int)personContours.size(); i++){
                PersonContour ithCurrContour = personContours[i];
                int ithCurrContourLabel = ithCurrContour.label;
                
                // Find the corresponding skeleton for this contour.
                PersonSkeleton ithSkeleton = mySkeletonTracer->currentSkeletons[i];
                
                if (prevLabelSet.find(ithCurrContour.label) == prevLabelSet.end()) {
                    // A new person has appeared.
                    // Make a new PersonSkeletonRecording; add it to skeletonRecordingCollection
                    PersonSkeletonRecording newPersonSkeletonRecording;
                    newPersonSkeletonRecording.label = ithCurrContourLabel;
                    newPersonSkeletonRecording.birthday = processFrame;
                    newPersonSkeletonRecording.deathday = processFrame;
                    newPersonSkeletonRecording.bApproved = false;
                    newPersonSkeletonRecording.bPlaying = false;
                    newPersonSkeletonRecording.playbackIndex = 0;
                    newPersonSkeletonRecording.dxAvg = 0;
                    newPersonSkeletonRecording.dyAvg = 0;
                    newPersonSkeletonRecording.cxAvg = 0;
                    newPersonSkeletonRecording.cyAvg = 0;
                    newPersonSkeletonRecording.frames.push_back(ithSkeleton);
                    skeletonRecordingCollection.push_back (newPersonSkeletonRecording);
                    
                } else {
                    // A current person was also in the recording collection.
                    // Find the PersonSkeletonRecording in skeletonRecordingCollection
                    // whose label is ithCurrContourLabel; add the ithSkeleton to it.
                    int nRecordings = (int) skeletonRecordingCollection.size();
                    for (int j=0; j<nRecordings; j++){
                        if (skeletonRecordingCollection[j].label == ithCurrContourLabel){
                            skeletonRecordingCollection[j].frames.push_back(ithSkeleton);
                            skeletonRecordingCollection[j].deathday = processFrame;
                            
                            // And meanwhile, calculate its movement statistics.
                            float cxAvg = 0;
                            float cyAvg = 0;
                            float dxAvg = 0;
                            float dyAvg = 0;
                            int nFrames = ((int) skeletonRecordingCollection[j].frames.size() - 1);
                            if (nFrames > 1){
                                for (int k=0; k<nFrames; k++){
                                    float cx0 = skeletonRecordingCollection[j].frames[k].cx;
                                    float cy0 = skeletonRecordingCollection[j].frames[k].cy;
                                    float cx1 = skeletonRecordingCollection[j].frames[k+1].cx;
                                    float cy1 = skeletonRecordingCollection[j].frames[k+1].cy;
                                    float dx = cx1 - cx0;
                                    float dy = cy1 - cy0;
                                    dxAvg += dx;
                                    dyAvg += dy;
                                    cxAvg += cx0;
                                    cyAvg += cy0;
                                }
                                skeletonRecordingCollection[j].dxAvg = dxAvg/nFrames; // average motion
                                skeletonRecordingCollection[j].dyAvg = dyAvg/nFrames;
                                skeletonRecordingCollection[j].cxAvg = cxAvg/nFrames; // average centroid position
                                skeletonRecordingCollection[j].cyAvg = cyAvg/nFrames;
                            }
                        }
                    }
                    
                }
            }
        }
        
        // Prune skeletonRecordingCollection to remove recordings that are too-short.
        // If enough time has passed since the most recently added frame,
        // and if length is less than minAgeToKeep, erase the recording.
        // but if length is adequate, then approve the recording for playback.
        int nFramesToWaitBeforeDeletion = trackerPersistence+3;
        for (auto it = skeletonRecordingCollection.begin();
             it != skeletonRecordingCollection.end(); /* no increment here! */) {
            int deathday = it->deathday;
            int elapsedSinceDeathday = processFrame - deathday;
            if (elapsedSinceDeathday > nFramesToWaitBeforeDeletion) {
                int recordingLength = (int) it->frames.size();
                if (recordingLength < minAgeToKeep) {
                    it = skeletonRecordingCollection.erase(it);
                    continue;
                } else {
                    it->bApproved = true;
                }
            }
            ++it; // Increment the iterator
        }
        
        cullSkeletonRecordings();
        updateReplayingSkeletonRecordings();
        
    }
}


//--------------------------------------------------------------
void ofApp::cullSkeletonRecordings(){
    
    // Periodically cull the shortest and/or longest approved skeletonRecordings
    if (processFrame%cullPeriod == 0){
        if (skeletonRecordingCollection.size() > cullBeyondSize){
            
            // Cull recordings whose average movement is less than some threshold
            if (bCullStillestRecordings){
                int indexOfStillestRecording = -1;
                float movementInStillestRecording = 999999;
                float leastAcceptableMovement = 1.0; // Don't cull ones that move more than this
                for (int i=0; i<skeletonRecordingCollection.size(); i++){
                    if ((skeletonRecordingCollection[i].bApproved == true) &&
                        (skeletonRecordingCollection[i].bPlaying == false)) {
                        float dxAvg = skeletonRecordingCollection[i].dxAvg;
                        float dyAvg = skeletonRecordingCollection[i].dyAvg;
                        float dhAvg = sqrtf(dxAvg*dxAvg + dyAvg*dyAvg);
                        if (dhAvg < movementInStillestRecording){
                            movementInStillestRecording = dhAvg;
                            indexOfStillestRecording = i;
                        }
                    }
                }
                if (indexOfStillestRecording != -1){
                    if (movementInStillestRecording < leastAcceptableMovement){
                        skeletonRecordingCollection.erase(skeletonRecordingCollection.begin() + indexOfStillestRecording);
                    }
                }
            }
            
            
            if (bCullLongestRecordings){
                int indexOfLongestRecording = -1;
                int longestRecordingLength = 0;
                int leastLengthToCull = 240; // don't cull ones shorter than this.
                for (int i=0; i<skeletonRecordingCollection.size(); i++){
                    if ((skeletonRecordingCollection[i].bApproved == true) &&
                        (skeletonRecordingCollection[i].bPlaying == false)) {
                        int len = (int) skeletonRecordingCollection[i].frames.size();
                        if (len > longestRecordingLength){
                            longestRecordingLength = len; indexOfLongestRecording = i;}}}
                if (indexOfLongestRecording != -1){
                    if (longestRecordingLength > leastLengthToCull){
                        skeletonRecordingCollection.erase(skeletonRecordingCollection.begin() + indexOfLongestRecording);
                    }
                }
            }

        }
    }
    
}

//--------------------------------------------------------------
void ofApp::draw() {
    
    ofBackground(0,0,0); //64,64,64);
    if (bShowDebugView){
        drawDebugView();
        drawSkeletonRecordingData();
        
        displayScale = (float)ofGetHeight()/FBOH;
        displayX = debugItemW*2;
        displayY = 0;
        
    } else {
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

    ofSetColor(100,0,0);
    ofDrawLine(0,0,FBOW,0); // put red at top of the field (it's "artistic")
    poissonInputFbo.end();

    ofFill(); // necessary somehow
    float unif = mouseX/1600.0; // for noise
    poissonFiller.process(poissonInputFbo.getTexture(), unif);
}

//--------------------------------------------------------------
void ofApp::drawPoissonDisplay2(){
    ofPushMatrix();
    ofPushStyle();
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
    glEnable(GL_BLEND);
    huntForBlendFunc(1000, 3,4);
    ofSetColor(displayGray);//255,255,255,displayGray);
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
        
        // Render skeletonFbo over everything.
        ofPushStyle();
        ofFill();
        glEnable(GL_BLEND);
        huntForBlendFunc(1000, 2,5);
        ofSetColor(255,255,255, 255-skeletonFboAlpha);
        skeletonFbo.draw(0,0,FBOW,FBOH);
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
        ofSetColor(255,255,255, skeletonFboAlpha*0.25);
        ofPopStyle();
        // skeletonFbo.draw(0,0,FBOW,FBOH); // I think this shouldn't be here. ???!?
        
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
    static const unsigned char palette[nPaletteCols][3] = {
        {  4,  40,  63},
        {  0,  91,  82},
        {158, 193,  49},
        {219, 242,  38},
        {214, 212, 142}
    };
    
    // Assume that we've already scaled/translated prior to calling renderSkeletonRecordings
    float DX = 0; //displayX;
    float DY = 0; //displayY;
    float DS = 1; //displayScale;
    
    switch(renderMethod){
        case METHOD_FATBONES_INTO_FBO:
            colorMode = USE_COLORS_WHITE; // USE_COLORS_PALET also looks ok
            boneContractionMode = BONE_SHRINK;
            bUseShapedAlpha = false;
            baseStrokeWeight = 1.0;
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
            colorMode = USE_COLORS_PALET;
            bUseShapedAlpha = false; //wow, truly
            bUseShapedRGB = false;
            bUseShapedStrokeWeight = true;
            baseStrokeWeight = 2.0;
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
    int nRecordings = (int) skeletonRecordingCollection.size();
    for (int i=0; i<nRecordings; i++){
        PersonSkeletonRecording ithRecording = skeletonRecordingCollection[i];
        if (ithRecording.bPlaying){
            playbackCounter++;
            
            // Get the current PersonSkeleton frame
            int nFrames = (int) ithRecording.frames.size();
            int playbackIndex = ithRecording.playbackIndex;
            if ((playbackIndex >= 0) && (playbackIndex < nFrames)){
                PersonSkeleton currentSkeleton = ithRecording.frames[playbackIndex];
                int label = currentSkeleton.label;
                float frac = ofClamp((float)playbackIndex/(float)nFrames, 0,1);
                float shapedFrac = function_TukeyWindow(frac, 0.35);
                
                // my01 and mx01 represent incoming values from the choreographer, in the range 0...1.
                // this range is mapped to the display surface, 1=width, 1=height.
                // they will be coming in as ithRecording.playbackCx,etc, the centers of the rectangles.
                // switch up ofTranslate() below.
                float playbackCx = 0.5; //ithRecording.playbackCx; //(float)(mouseX-displayX)/(FBOW*displayScale);
                float playbackCy = (float)(label%maxPlaybacks)/maxPlaybacks; //ithRecording.playbackCy;
                float playbackScale = ofMap(playbackCy,0,1, 0.5,2.0); //    1.0; // ithRecording.playbackScale;
                float mx01 = playbackCx;
                float my01 = playbackCy;
                mx01 = ofMap(mx01, 0,1,  0.00,1.00); // adjust margins if we want
                my01 = ofMap(my01, 0,1,  0.00,1.00);
                float mxScreen = mx01;
                float myScreen = my01 * (16.0/9.0);
                
                ofPushMatrix();
                ofTranslate(mxScreen, myScreen);
                ofScale(playbackScale);
                
                // Center the containing process rectangle on (playbackCx,playbackCy)
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
                        int ci = label % nPaletteCols;
                        float amt = 0;//1 - (dy / FBOH);
                        r = ofLerp (palette[ci][0], 255, amt);
                        g = ofLerp (palette[ci][1], 255, amt);
                        b = ofLerp (palette[ci][2], 255, amt);
                    }
                    
                    if (bUseShapedAlpha){
                        a *= shapedFrac;
                    }
                    if (bUseShapedRGB){
                        r *= shapedFrac;
                        g *= shapedFrac;
                        b *= shapedFrac;
                    }
                    
                    float sw = baseStrokeWeight;
                    if (bUseShapedStrokeWeight){ sw *= shapedFrac; }
                    if (bNormalize){ sw /= (float)skeletonBufW; }
                    float swScaleMix = 0.75;
                    sw = swScaleMix*sw + (1-swScaleMix)*(sw/playbackScale);
                    
                    ofSetColor(r,g,b,a);
                    ofSetLineWidth(sw);
                    ofNoFill();
                    
                    //---------------------
                    int nBones = (int) currentSkeleton.bones.size();
                    for (int j=0; j<nBones; j++){
                        ofPolyline jthBone = currentSkeleton.bones[j];
                        int nPoints = (int) jthBone.size();
                        if (nPoints > 1){
                            
                            if (renderMethod == METHOD_FATBONES_INTO_FBO){ 
                                // Use SkeletonBoneDrawer
                                ofFill();
                                
                                if ((shapedFrac > 0.99) || (boneContractionMode == BONE_NOSHAPING)){
                                    boneDrawer->drawScaled (jthBone, sw);
                                    
                                } else if (boneContractionMode == BONE_RETRACT){
                                    ofPolyline jthBoneRetracted;
                                    jthBoneRetracted.clear();
                                    int indexC = (int)(nPoints/2.0);
                                    float delta = shapedFrac*indexC;
                                    int indexA = MAX(0,         MIN(indexC, (int)round(indexC - delta)));
                                    int indexB = MIN(nPoints-1, MAX(indexC, (int)round(indexC + delta)));
                                    if ((indexB - indexA) > 0){
                                        for (int k=indexA; k<=indexB; k++){
                                            jthBoneRetracted.addVertex(jthBone[k].x, jthBone[k].y);
                                        } boneDrawer->drawScaled (jthBoneRetracted, sw);
                                    }
                                    
                                } else if (boneContractionMode == BONE_SHRINK){
                                    ofPolyline jthBoneShrunk;
                                    jthBoneShrunk.clear();
                                    ofPoint jthBoneCentroid = jthBone.getCentroid2D();
                                    float bcx = jthBoneCentroid.x;
                                    float bcy = jthBoneCentroid.y;
                                    if ((bcx > 0)&&(bcx < 1)&&(bcy > 0)&&(bcy < 1)){
                                        // There are rare, spurious outlier errors...
                                        for (int k=0; k<nPoints; k++){
                                            float bdx = jthBone[k].x - bcx;
                                            float bdy = jthBone[k].y - bcy;
                                            float px = bcx + shapedFrac*bdx;
                                            float py = bcy + shapedFrac*bdy;
                                            jthBoneShrunk.addVertex(px,py);
                                        } boneDrawer->drawScaled (jthBoneShrunk, sw);
                                    }
                                }
                                
                                
                                
                            } else {
                                // Use ofBeginShape/ofVertex/ofEndShape
                                
                                if ((shapedFrac > 0.99) || (boneContractionMode == BONE_NOSHAPING)){
                                    ofBeginShape();
                                    for (int k=0; k<nPoints; k++){
                                        ofVertex(jthBone[k].x, jthBone[k].y);
                                    } ofEndShape();
                                    
                                } else if (boneContractionMode == BONE_SHRINK){
                                    ofPoint jthBoneCentroid = jthBone.getCentroid2D();
                                    float bcx = jthBoneCentroid.x;
                                    float bcy = jthBoneCentroid.y;
                                    ofBeginShape();
                                    for (int k=0; k<nPoints; k++){
                                        float bdx = jthBone[k].x - bcx;
                                        float bdy = jthBone[k].y - bcy;
                                        float px = bcx + shapedFrac*bdx;
                                        float py = bcy + shapedFrac*bdy;
                                        ofVertex(px,py);
                                    } ofEndShape();
                                    
                                } else if (boneContractionMode == BONE_RETRACT){
                                    int indexC = (int)(nPoints/2.0);
                                    float delta = shapedFrac*indexC;
                                    int indexA = MAX(0,         MIN(indexC, (int)round(indexC - delta)));
                                    int indexB = MIN(nPoints-1, MAX(indexC, (int)round(indexC + delta)));
                                    if ((indexB - indexA) > 0){
                                        ofBeginShape();
                                        for (int k=indexA; k<=indexB; k++){
                                            ofVertex(jthBone[k].x, jthBone[k].y);
                                        } ofEndShape();
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
    
    float tx = 1280;
    float ty = 40;
    float tdy = 12;

    std::string plstr = "";
    int nRecordings = (int) skeletonRecordingCollection.size();
    plstr += ofToString(nRecordings) + "; ";
    int nReplaying = (int) labelsOfReplayingSkeletonRecordings.size();
    plstr += ofToString(nReplaying) + ": ";
    for (int i=0; i<nReplaying; i++){
        plstr += ofToString(labelsOfReplayingSkeletonRecordings[i]) + ",";
    }
    ofSetColor(255,255,0);
    ofDrawBitmapString(plstr, tx,20);
    
    for (int i=0; i<nRecordings; i++){
        int label = skeletonRecordingCollection[i].label;
        int nFrames = (int) skeletonRecordingCollection[i].frames.size();
        
        float dxAvg = skeletonRecordingCollection[i].dxAvg;
        float dyAvg = skeletonRecordingCollection[i].dyAvg;
        float dhAvg = sqrtf(dxAvg*dxAvg + dyAvg*dyAvg);
        float laterality = (dhAvg > 0) ? abs(dxAvg/dyAvg) : 0;
        
        float y = ty+i*tdy;
        int hexCol = (skeletonRecordingCollection[i].bApproved) ? 0x00FF00 : 0xFF0000;
        ofSetHexColor(hexCol);
        ofDrawLine(tx+20, y-5, tx+20+nFrames, y-5);
        std::string str = ofToString(label);// + " (" + ofToString(dhAvg) + ")";
        
        if (skeletonRecordingCollection[i].bPlaying){
            int playbackIndex = skeletonRecordingCollection[i].playbackIndex;
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
        
    }
    ofPopStyle();
}

//--------------------------------------------------------------
void ofApp::updateReplayingSkeletonRecordings(){
    
    // Update playback heads and bPlaying states in all active ReplayingSkeletonRecordings.
    for (auto it = labelsOfReplayingSkeletonRecordings.begin();
         it != labelsOfReplayingSkeletonRecordings.end();) {
        int ithReplayingLabel = *it;
        
        // Search in skeletonRecordingCollection for the item whose label is ithReplayingLabel.
        // (Note that the indices in skeletonRecordingCollection can change from frame to frame)
        for (int j=0; j<skeletonRecordingCollection.size(); j++) {
            if ((skeletonRecordingCollection[j].label == ithReplayingLabel) &&
                (skeletonRecordingCollection[j].bPlaying == true)) {

                int nFrames = (int)skeletonRecordingCollection[j].frames.size();
                int playbackIndex = skeletonRecordingCollection[j].playbackIndex;
                if (playbackIndex < (nFrames - 1)) {
                    // If we're playing, advance the playback head.
                    skeletonRecordingCollection[j].playbackIndex++;
                } else {
                    // If we've reached the end,
                    // delete item i from labelsOfReplayingSkeletonRecordings
                    skeletonRecordingCollection[j].playbackIndex = 0;
                    skeletonRecordingCollection[j].bPlaying = false;
                    it = labelsOfReplayingSkeletonRecordings.erase(it);
                    break;
                }
            }
        }
        if (it != labelsOfReplayingSkeletonRecordings.end()) {++it;}
    }
   
    
    // With some small likelihood, choose and initiate the playback of a suitable recording
    if (labelsOfReplayingSkeletonRecordings.size() < maxPlaybacks){
        
        // Identify which items in skeletonRecordingCollection may be suitable; store their indices
        std::vector<int> indicesOfSuitableRecordings;
        indicesOfSuitableRecordings.clear();
        for (int i=0; i<skeletonRecordingCollection.size(); i++){
            if ((skeletonRecordingCollection[i].bApproved == true) &&
                (skeletonRecordingCollection[i].bPlaying == false)){
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
                        if ((skeletonRecordingCollection[whichRecording].bApproved == true) &&
                            (skeletonRecordingCollection[whichRecording].bPlaying == false)){
                            
                            skeletonRecordingCollection[whichRecording].playbackIndex = 0;
                            skeletonRecordingCollection[whichRecording].bPlaying = true;
                            skeletonRecordingCollection[whichRecording].playbackCx = 0.5;//ofRandom(0.3, 0.7);
                            skeletonRecordingCollection[whichRecording].playbackCy = 1.777;//ofRandomuf()*1.777;
                            skeletonRecordingCollection[whichRecording].playbackScale = 1.0;//ofRandom(0.5, 1.5);
                            
                            int label = skeletonRecordingCollection[whichRecording].label;
                            labelsOfReplayingSkeletonRecordings.push_back(label);
                            bDidIt = true;
                        }
                    }
                }
            }
        }
    }
}



//--------------------------------------------------------------
void ofApp::calculatePoissonFields(){
    poissonInputFbo.begin();
    ofPushStyle();
    ofClear(0,0,0,0);
    ofNoFill();
    
    float lineColorPct = 0.2;
    if (bLineEffect){
        glEnable(GL_LINE_SMOOTH);
        glHint(GL_LINE_SMOOTH_HINT, GL_NICEST);
        lineColorPct = 0.2;
    } else {
        glDisable(GL_LINE_SMOOTH);
        lineColorPct = 1.0;
    }
 
    //mySkeletonTracer->drawCurrentSkeletons(0,0, FBOW, 2.0, lineColorPct, true);
    float mx = mouseX/1600.0; //0.2
    for (int i=0; i<10; i+=3){
        float dy = ofMap(i,0,10, 0,FBOH);
        float dx = (i%2)*FBOW*0.25;
        mySkeletonTracer->drawCurrentSkeletons(dx,dy, FBOW, 2.0, lineColorPct, true);
    }
    
    ofPopStyle();
    
    ofSetColor(100,0,0);
    ofDrawLine(0,0,FBOW,0);
    //ofSetColor(255,255,255);
    // ofSetColor(averageVideoColor);
    //ofDrawLine(FBOW/2,FBOH-1,FBOW/2,FBOH-2);
    poissonInputFbo.end();
    
    ofFill(); // necessary somehow
    float unif = mouseX/1600.0;
    poissonFiller.process(poissonInputFbo.getTexture(), unif);
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
    glEnable(GL_BLEND);
    huntForBlendFunc(1000, 3,4);
    ofSetColor(displayGray);//255,255,255,displayGray);
    displayFbo.draw(0,0);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    drawLiveDisplayPeopleContours(0,0, FBOW);
    
    
    if (!bFancyLineSkels){
        for (int i=0; i<10; i+=3){
            float dy = ofMap(i,0,10, 0,FBOH);
            float dx = (i%2)*FBOW*0.25;
            mySkeletonTracer->drawCurrentSkeletons(dx,dy, FBOW, 1.0, 1.0, true);
        }
        
    } else {
        // Render fat skeletons into skeletonFbo
        skeletonFbo.begin();
        ofPushStyle();
        ofClear(0,0,0,0); //255,255,255,0);
        ofEnableSmoothing();
        ofEnableAntiAliasing();
        for (int i=0; i<10; i+=3){
            float dy = ofMap(i,0,10, 0,FBOH);
            float dx = (i%2)*FBOW*0.25;
            float th = 2.0;
            mySkeletonTracer->displayCurrentSkeletons(dx,dy,FBOW, th, 255,255,255);
        }
        ofPopStyle();
        skeletonFbo.end();
        
        
        // Render skeletonFbo over everything.
        ofPushStyle();
        ofFill();
        glEnable(GL_BLEND);
        huntForBlendFunc(1000, 2,5);
        ofSetColor(255,255,255, 255-skeletonFboAlpha);
        skeletonFbo.draw(0,0,FBOW,FBOH);
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
        ofSetColor(255,255,255, skeletonFboAlpha*0.25);
        skeletonFbo.draw(0,0,FBOW,FBOH);
        
        ofPopStyle();
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
        
    }
     

    ofPopMatrix();
    
    
    // Not drawn: e.g.
    // poissonFiller.getTexture().draw(0, 0, FBOW, FBOH);
    // poissonInputFbo.draw(FBOW, 0);
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
    ofPushStyle();
    
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
    ofPopStyle();
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
    } else if (key == 'F'){
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
        
    } else if (key == '?'){
        bShowDiagnosticSkeletons = !bShowDiagnosticSkeletons;
    
    } else if (key == 'S'){
        guiVision.saveToFile("settingsVision.xml");
        guiDisplay.saveToFile("settingsDisplay.xml");
    } else if (key == 'L'){
        guiVision.loadFromFile("settingsVision.xml");
        guiDisplay.loadFromFile("settingsDisplay.xml");
        
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
