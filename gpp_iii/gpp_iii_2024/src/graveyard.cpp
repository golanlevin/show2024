

// GRAVEYARD



/*
if (false){
    float h, s, v;
    rgbToHsv(r/255.0, g/255.0, b/255.0, h, s, v);
    v = ofLerp (v, v*0.75, my01);
    s = ofLerp (s, 1, 0.75*my01);
    hsvToRgb(h, s, v, r, g, b);
    r *= 255.0;
    g *= 255.0;
    b *= 255.0;
}
*/



//--------------------------------------------------------------
void ofApp::importSkeletonRecordingCollection(const std::string& filename) {
    skeletonRecordingCollection.clear();
    ofxXmlSettings xml;
    if (!xml.loadFile(filename)) {
        ofLogError() << "Failed to load file: " << filename;
        return;
    }
    xml.pushTag("SkeletonRecordingCollection");
    int numRecordings = xml.getNumTags("PSR");
    for (int i = 0; i < numRecordings; ++i) {
        xml.pushTag("PSR", i);
        
        PersonSkeletonRecording recording;
        recording.label = xml.getValue("label", 0);
        recording.birthday = xml.getValue("birthday", 0);
        recording.deathday = xml.getValue("deathday", 0);
        recording.bApproved = xml.getValue("bApproved", true);
        recording.dxAvg = xml.getValue("dxAvg", 0.0f);
        recording.dyAvg = xml.getValue("dyAvg", 0.0f);
        recording.cxAvg = xml.getValue("cxAvg", 0.0f);
        recording.cyAvg = xml.getValue("cyAvg", 0.0f);
        recording.bPlaying = xml.getValue("bPlaying", false);
        recording.playbackIndex = xml.getValue("playbackI", 0);
        recording.playbackCx = xml.getValue("playbackCx", 0.0f);
        recording.playbackCy = xml.getValue("playbackCy", 0.0f);
        recording.playbackScale = xml.getValue("playbackS", 0.0f);

        xml.pushTag("F");
        int numFrames = xml.getNumTags("PS");
        for (int j = 0; j < numFrames; ++j) {
            
            xml.pushTag("PS", j);
            PersonSkeleton skeleton;
            skeleton.bbox.x = xml.getValue("bbX", 0.0f);
            skeleton.bbox.y = xml.getValue("bbY", 0.0f);
            skeleton.bbox.width = xml.getValue("bbW", 0.0f);
            skeleton.bbox.height = xml.getValue("bbH", 0.0f);
            skeleton.contourIndex = xml.getValue("contourI", 0);
            skeleton.label = xml.getValue("label", 0);
            skeleton.age = xml.getValue("age", 0);
            skeleton.r = xml.getValue("r", 0.0f);
            skeleton.g = xml.getValue("g", 0.0f);
            skeleton.b = xml.getValue("b", 0.0f);
            skeleton.cx = xml.getValue("cx", 0.0f);
            skeleton.cy = xml.getValue("cy", 0.0f);

            xml.pushTag("Bs");
            int numBones = xml.getNumTags("B");
            numBones = min(numBones, MAX_N_BONES_PER_SKELETON);
            for (int k = 0; k < numBones; ++k) {
                xml.pushTag("B", k);

                ofPolyline bone;
                int numVertices = xml.getNumTags("V");
                for (int l = 0; l < numVertices; ++l) {
                    xml.pushTag("V", l);
                    float x = xml.getValue("x", 0.0f);
                    float y = xml.getValue("y", 0.0f);
                    bone.addVertex(ofPoint(x, y, 0.0f));
                    xml.popTag(); // V, Vertex
                }
                
                if (numVertices > MAX_POINTS_PER_BONE){
                    bone = bone.getResampledByCount(MAX_POINTS_PER_BONE);
                }
                skeleton.bones.push_back(bone);
                xml.popTag(); // B, Bone
            }
            xml.popTag(); // Bs, Bones
            recording.frames.push_back(skeleton);
            xml.popTag(); // PersonSkeleton
        }
        xml.popTag(); // F, Frames
        skeletonRecordingCollection.push_back(recording);
        xml.popTag(); // PSR, PersonSkeletonRecording
    }
    xml.popTag(); // SkeletonRecordingCollection
}



//--------------------------------------------------------------
void ofApp::exportSkeletonRecordingCollection(const std::string& filename) {
    // Note: const float floatPrecision = 5; changed in ofxXmlSettings.cpp, line 9
    // By default, has a value of 9.
    
    xml.addTag("SkeletonRecordingCollection");
    xml.pushTag("SkeletonRecordingCollection");

    int savedRecordingCount = 0;
    int nSkeletonRecordings = (int) skeletonRecordingCollection.size();
    for (int i = 0; i < nSkeletonRecordings; ++i) {
        
        const PersonSkeletonRecording& recording = skeletonRecordingCollection[i];
        if (recording.bApproved){
            
            xml.addTag("PSR"); // PersonSkeletonRecording
            xml.pushTag("PSR", savedRecordingCount);
            savedRecordingCount++;
            
            xml.addValue("label", recording.label);
            xml.addValue("birthday", recording.birthday);
            xml.addValue("deathday", recording.deathday);
            xml.addValue("bApproved", recording.bApproved);
            xml.addValue("dxAvg", recording.dxAvg);
            xml.addValue("dyAvg", recording.dyAvg);
            xml.addValue("cxAvg", recording.cxAvg);
            xml.addValue("cyAvg", recording.cyAvg);
            xml.addValue("bPlaying", recording.bPlaying);
            xml.addValue("playbackI", recording.playbackIndex);
            xml.addValue("playbackCx", recording.playbackCx);
            xml.addValue("playbackCy", recording.playbackCy);
            xml.addValue("playbackS", recording.playbackScale);
            
            xml.addTag("F"); // Frames
            xml.pushTag("F");
            
            int nFrames = (int) recording.frames.size();
            for (int j=0; j<nFrames; ++j) {
                xml.addTag("PS"); // PersonSkeleton
                xml.pushTag("PS", j);
                
                const PersonSkeleton& skeleton = recording.frames[j];

                xml.addValue("bbX", skeleton.bbox.x);
                xml.addValue("bbY", skeleton.bbox.y);
                xml.addValue("bbW", skeleton.bbox.width);
                xml.addValue("bbH", skeleton.bbox.height);
                xml.addValue("contourI", skeleton.contourIndex);
                xml.addValue("label", skeleton.label);
                xml.addValue("age", skeleton.age);
                xml.addValue("r", skeleton.r);
                xml.addValue("g", skeleton.g);
                xml.addValue("b", skeleton.b);
                xml.addValue("cx", skeleton.cx);
                xml.addValue("cy", skeleton.cy);
                
                xml.addTag("Bs"); //  Bones
                xml.pushTag("Bs");
                
                int nBones = (int) skeleton.bones.size();
                for (int k = 0; k < nBones; ++k) {
                    xml.addTag("B"); // Bone
                    xml.pushTag("B", k);
                    const ofPolyline& bone = skeleton.bones[k];
                    
                    int nPoints = (int) bone.size();
                    for (int l = 0; l < nPoints; ++l) {
                        xml.addTag("V"); // Vertex
                        xml.pushTag("V", l);
                        xml.addValue("x", bone[l].x);
                        xml.addValue("y", bone[l].y);
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



/*
//--------------------------------------------------------------
void ofApp::updateReplayingSkeletonRecordingsOld(){
    ofSetRandomSeed(processFrame);
    
    if (!bPausePlayback){
        nReplayingSkeletonRecordingsOld = 0;
        for (int j=0; j<skeletonRecordingCollection.size(); j++) {
            if (skeletonRecordingCollection[j].bPlaying == true) {
                nReplayingSkeletonRecordingsOld++;
                
                int nFrames = (int)skeletonRecordingCollection[j].frames.size();
                int playbackIndex = skeletonRecordingCollection[j].playbackIndex;
                if (playbackIndex < (nFrames - 1)) {
                    // If we're playing, advance the playback head.
                    skeletonRecordingCollection[j].playbackIndex++;
                    
                } else {
                    // If we've reached the end, turn it off
                    skeletonRecordingCollection[j].playbackIndex = 0;
                    skeletonRecordingCollection[j].bPlaying = false;
                    break;
                }
            }
        }
        

        // With some small likelihood, choose and initiate the playback of a suitable recording
        if (nReplayingSkeletonRecordingsOld < maxPlaybacks){
            
            // Identify which items in skeletonRecordingCollection may be suitable; store their indices
            std::vector<int> indicesOfSuitableRecordings;
            indicesOfSuitableRecordings.clear();
            for (int i=0; i<skeletonRecordingCollection.size(); i++){
                if ((skeletonRecordingCollection[i].bApproved == true) &&
                    (skeletonRecordingCollection[i].bPlaying == false)){
                    indicesOfSuitableRecordings.push_back(i);
                }
            }
            std::sort(indicesOfSuitableRecordings.begin(), indicesOfSuitableRecordings.end());
            
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
                                
                                bDidIt = true;
                            }
                        }
                    }
                }
            }
        }
        
    }
}
 */




/*
//--------------------------------------------------------------
void ofApp::drawSkeletonRecordingDataOld(){
    ofPushStyle();
    
    float tx = 10; //1280;
    float ty = 520; //40;
    float tdy = 11;
    
    int nApprovedRecordings = 0;
    for (int i=0; i<skeletonRecordingCollection.size(); i++){
        if (skeletonRecordingCollection[i].bApproved){
            nApprovedRecordings++;
        }
    }

    std::string plstr = "";
    int nRecordings = (int) skeletonRecordingCollection.size();
    plstr += ofToString(nRecordings) + "; ";
    plstr += ofToString(nApprovedRecordings) + "; ";
    plstr += ofToString(nReplayingSkeletonRecordingsOld);
    ofSetColor(255,255,0);
    ofDrawBitmapString(plstr, tx,ty);ty+=tdy;
    ofSetLineWidth(1.0);
    
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
        
        // std::string str = ofToString(label);// + " (" + ofToString(dhAvg) + ")";
        std::string str = ofToString(label) + "\t" + ofToString(nFrames) + "\t" + ofToString(dhAvg);
        
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
 */




 
/*
//--------------------------------------------------------------
void ofApp::renderSkeletonRecordingsOld(int whichMethod){
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
    const int nPalettes = 8;

    // from https://coolors.co/palettes/popular/5%20colors
    const int palettes[nPalettes][nPaletteCols] = {
        {0x22577A,0x38A3A5,0x57CC99,0x80ED99,0xC7F9CC},
        {0x390099,0x9E0059,0xFF0054,0xFF5400,0xFFBD00},
        {0x264653,0x2A9D8F,0xE9C46A,0xF4A261,0xE76F51},
        {0x335C67,0xFFF3B0,0xE09F3E,0x9E2A2B,0x540B0E},
        {0x04283F,0x005B52,0x9EC131,0xDBF226,0xD6D48E},
        {0x003049,0xd62828,0xf77f00,0xfcbf49,0xeae2b7},
        {0x001524,0x15616d,0xffecd1,0xff7d00,0x78290f},
        {0x001427,0x708d81,0xf4d58d,0xbf0603,0x8d0801}
    };
    
    
    bool bCalcPersonColorsPrev = bCalcPersonColors;
    float cNoi = ofNoise(ofGetElapsedTimef()*colorSwitchFreq);
    bCalcPersonColors = (cNoi < 0.5);
    if (!bCalcPersonColors && (bCalcPersonColorsPrev != bCalcPersonColors)){
        // printf("Switch! %d\n", (int) ofGetElapsedTimeMillis());
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
                        int paletIndex = whichPalette % nPalettes;
                        int colorIndex = label % nPaletteCols;
                        
                        int theColor = palettes[paletIndex][colorIndex];
                        r = (float) ((theColor >> 16) & 0xFF);
                        g = (float) ((theColor >>  8) & 0xFF);
                        b = (float) ((theColor      ) & 0xFF);
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
 */



/*
//--------------------------------------------------------------
void ofApp::cullSkeletonRecordingsOld(){
    
    // Handle the skeletonRecordingCollection becoming too large; delete the oldest.
    int nApprovedSkeletonRecordings = 0;
    for (int j=0; j<skeletonRecordingCollection.size(); j++) {
        if (skeletonRecordingCollection[j].bApproved == true) {
            nApprovedSkeletonRecordings++;
        }
    }
    if (nApprovedSkeletonRecordings > MAX_N_SKELETON_RECORDINGS){
        //  Delete the oldest (lowest-numbered) recording if it's not playing.
        if (skeletonRecordingCollection[0].bPlaying == false){
            skeletonRecordingCollection.erase(skeletonRecordingCollection.begin());
        }
    }
    
    // Periodically cull the shortest and/or longest approved skeletonRecordings
    if (processFrame%cullPeriod == 0){
        if (skeletonRecordingCollection.size() > (MAX_N_SKELETON_RECORDINGS/2)) {
            
            // Cull recordings whose average movement is less than some threshold
            if (bCullStillestRecordings){
                int indexOfStillestRecording = -1;
                float movementInStillestRecording = 999999;
                for (int i=0; i<skeletonRecordingCollection.size(); i++){
                    if ((skeletonRecordingCollection[i].bApproved == true) &&
                        (skeletonRecordingCollection[i].bPlaying == false)) {
                        float dxAvg = skeletonRecordingCollection[i].dxAvg;
                        float dyAvg = skeletonRecordingCollection[i].dyAvg;
                        float dhAvg = sqrtf(dxAvg*dxAvg + dyAvg*dyAvg);
                        if (dhAvg < movementInStillestRecording){ // Don't cull ones that move more than this
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
                for (int i=0; i<skeletonRecordingCollection.size(); i++){
                    if ((skeletonRecordingCollection[i].bApproved == true) &&
                        (skeletonRecordingCollection[i].bPlaying == false)) {
                        int len = (int) skeletonRecordingCollection[i].frames.size();
                        if (len > longestRecordingLength){
                            longestRecordingLength = len; indexOfLongestRecording = i;}}}
                if (indexOfLongestRecording != -1){
                    if (longestRecordingLength > MAX_N_SKELETONS_PER_RECORDING){ 
                        skeletonRecordingCollection.erase(skeletonRecordingCollection.begin() + indexOfLongestRecording);
                    }
                }
            }

        }
    }
    
}
 */



/*
//--------------------------------------------------------------
void ofApp::updateMiniDisplayOld(){
    
    if (bComputeMiniDisplay){
        unsigned char* miniDisplayPix = miniDisplayC1.getPixels().getData();
        const float shw = 0.5 * ((float)skeletonBufH/skeletonBufW);
        
        for (int j=0; j<skeletonRecordingCollection.size(); j++) {
            PersonSkeletonRecording jthRecording = skeletonRecordingCollection[j];
            if (jthRecording.bPlaying == true){
                int nFrames = (int) jthRecording.frames.size();
                int playbackIndex = jthRecording.playbackIndex;
                if ((playbackIndex >= 0) && (playbackIndex < nFrames)){
                    PersonSkeleton currentSkeleton = jthRecording.frames[playbackIndex];
                    int label = currentSkeleton.label; // only used for bogus positioning at the moment.
                    float frac = ofClamp((float)playbackIndex/(float)nFrames, 0,1);
                    float shapedFrac = function_TukeyWindow(frac, 0.35);
                    
                    // my01 and mx01 represent incoming values from the choreographer, in the range 0...1.
                    // this range is mapped to the display surface, 1=width, 1=height.
                    // they will be coming in as ithRecording.playbackCx,etc, the centers of the rectangles.
                    // switch up ofTranslate() below.
                    // Don't forget to update this in renderSkeletonRecordings();
                    float playbackCx = 0.5; //jthRecording.playbackCx; //(float)(mouseX-displayX)/(FBOW*displayScale);
                    float playbackCy = (float)(label%maxPlaybacks)/maxPlaybacks; //jthRecording.playbackCy;
                    float playbackScale = ofMap(playbackCy,0,1, 0.5,2.0); //  jthRecording.playbackScale;
                    float mxScreen = playbackCx;
                    float myScreen = playbackCy * (16.0/9.0);
                    
                    vector<ofPolyline> bones = currentSkeleton.bones;
                    int nBones = (int) bones.size();
                    for (int b=0; b<nBones; b++){
                        ofPolyline bthBone = bones[b];
                        int nPoints = (int) bthBone.size();
                        
                        if (shapedFrac < 0.99){
                            ofPoint bthBoneCentroid = bthBone.getCentroid2D();
                            float bcx = bthBoneCentroid.x;
                            float bcy = bthBoneCentroid.y;
                            if ((bcx > 0)&&(bcx < 1)&&(bcy > 0)&&(bcy < 1)){
                                for (int k=0; k<nPoints; k++){
                                    float bdx = bthBone[k].x - bcx;
                                    float bdy = bthBone[k].y - bcy;
                                    float px = bcx + shapedFrac*bdx;
                                    float py = bcy + shapedFrac*bdy;
                                    int pxi = (int)roundf( (((px - 0.5)*playbackScale)+mxScreen)*miniDisplayW );
                                    int pyi = (int)roundf( (((py - shw)*playbackScale)+myScreen)*miniDisplayW );
                                    if ((pxi >= 0) && (pxi < miniDisplayW) && (pyi >= 0) && (pyi < miniDisplayH)){
                                        int pindex = pyi*miniDisplayW + pxi;
                                        miniDisplayPix[pindex]=255;
                                    }
                                }
                            }
                            
                        } else {
                            for (int k=0; k<nPoints; k++){
                                int pxi = (int)( (((bthBone[k].x - 0.5)*playbackScale)+mxScreen)*miniDisplayW );
                                int pyi = (int)( (((bthBone[k].y - shw)*playbackScale)+myScreen)*miniDisplayW );
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
        wiggleFunction01 = powf(wiggleFunction01, miniDisplayWigglePow);// + 0.1*(ofNoise(wiggleT)-0.5);
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
 */




/*
//--------------------------------------------------------------
void ofApp::processSkeletonsOld(){
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
                            int nFrames = (int) skeletonRecordingCollection[j].frames.size();
                            if (nFrames < MAX_N_SKELETONS_PER_RECORDING){
                                skeletonRecordingCollection[j].frames.push_back(ithSkeleton);
                                skeletonRecordingCollection[j].deathday = processFrame;
                                
                                // And meanwhile, calculate its movement statistics.
                                float cxAvg = 0;
                                float cyAvg = 0;
                                float dxAvg = 0;
                                float dyAvg = 0;
                                int nFramesm1 = nFrames-1;
                                if (nFramesm1 > 1){
                                    for (int k=0; k<nFramesm1; k++){
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
                                    skeletonRecordingCollection[j].dxAvg = dxAvg/nFramesm1; // average motion
                                    skeletonRecordingCollection[j].dyAvg = dyAvg/nFramesm1;
                                    skeletonRecordingCollection[j].cxAvg = cxAvg/nFramesm1; // average centroid position
                                    skeletonRecordingCollection[j].cyAvg = cyAvg/nFramesm1;
                                }
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
             it != skeletonRecordingCollection.end(); ) {
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
        
        cullSkeletonRecordingsOld();
        updateReplayingSkeletonRecordingsOld();
        updateMiniDisplayOld();
    }
}
*/





/*
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
*/

