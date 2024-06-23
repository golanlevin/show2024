

#include "SkeletonTracer.h"

//------------------------------------------------------------
void SkeletonTracer::initialize (int w, int h){
	
	buffer_w = w;
	buffer_h = h;
	tmpBuffer        = new unsigned char[buffer_w * buffer_h];
	pixelStateBuffer = new unsigned char[buffer_w * buffer_h];
	pixelStateImage.allocate(buffer_w, buffer_h, OF_IMAGE_GRAYSCALE);
	
	boundary0 = buffer_w+1;
	boundary1 = (buffer_w * buffer_h)-buffer_w-1;
	
	bonesRawTraced.clear();
	bonesRawMerged.clear();
	bonesRawSmooth.clear();
	
	nBranchPointIndices = 0;
	branchPointIndices = new int[SKEL_MAX_N_BRANCH_POINTS];
	for (int i=0; i<SKEL_MAX_N_BRANCH_POINTS; i++){
		branchPointIndices[i] = SKEL_INVALID;
	}
	
	boneResampling = 2.5;
	boneSmoothSigma = 0.9;
	boneSmoothKernW = 2;
	bDoMergeBones	= true;
	bNormalizeTheRawDrawing = true;
	
	liveColor		= 0xFF0000;
}





//------------------------------------------------------------
void SkeletonTracer::computeVectorSkeletons (unsigned char* skeletonPixelBuffer,
                                             const std::vector<PersonContour>& personContours){
    int nPixels = buffer_w * buffer_h;
    int nPersonContours = (int) personContours.size();
    currentSkeletons.clear();
    
    if (nPersonContours > 0){
        memcpy(pixelStateBuffer, skeletonPixelBuffer, nPixels);
        traceVectorSkeletonFromSkeletonImage();
        mergeBones();
        smoothBones();
        compileLiveBonesIntoRawDrawing();
        collateRawDrawingIntoLabeledSkeletons(personContours);
        
    } else {
        // If the nPersonContours is zero:
        memset(pixelStateBuffer, 0, nPixels);
        bonesRawTraced.clear();
        bonesRawMerged.clear();
        bonesRawSmooth.clear();
        theRawDrawing.clear();
        currentBone.clear();
    }
}



//------------------------------------------------------------
void SkeletonTracer::collateRawDrawingIntoLabeledSkeletons(const std::vector<PersonContour>& personContours){
    
    int nBones = (int)theRawDrawing.size();
    int nPersonContours = (int) personContours.size();
    if ((nBones > 0) && (nPersonContours > 0)){
        
        // Make a PersonSkeleton for each PersonContour
        for (int j=0; j<nPersonContours; j++){
            PersonContour jthPersonContour = personContours[j];
            PersonSkeleton ps;
            
            ps.timestamp = jthPersonContour.timestamp;
            ps.label = jthPersonContour.label;
            ps.age = jthPersonContour.age;
            ps.r = jthPersonContour.r;
            ps.g = jthPersonContour.g;
            ps.b = jthPersonContour.b;
            
            currentSkeletons.push_back(ps);
        }
       
        for (int i=0; i<nBones; i++){
            PolylinePlus aBone = theRawDrawing[i];
            ofPolyline aBonePolyline = aBone.polyline;
            int nBonePoints = (int)aBonePolyline.size();
            if (nBonePoints > 0){
                
                // Get the 'center' point of this bone
                float cx = aBonePolyline[nBonePoints/2].x;
                float cy = aBonePolyline[nBonePoints/2].y;
                if (bNormalizeTheRawDrawing){
                    cx *= buffer_w;
                    cy *= buffer_w;
                }
                
                // Determine which PersonContour it is inside
                int inWhich = -1;
                for (int j=0; j<nPersonContours; j++){
                    PersonContour jthPersonContour = personContours[j];
                    cv::Rect jthPersonContourBbox = jthPersonContour.bbox;
                    bool bIn = isPointInBbox(cx,cy, jthPersonContourBbox);
                    if (bIn){ inWhich=j; break; }
                }
                
                // Stash the bone in the corresponding PersonSkeleton
                if (inWhich != -1){
                    currentSkeletons[inWhich].bones.push_back(aBonePolyline);
                }
            }
        }
    }
}

//------------------------------------------------------------
bool SkeletonTracer::isPointInBbox(float x, float y, cv::Rect bbox) {
    return ((x >= bbox.x) && x < (bbox.x + bbox.width) &&
            (y >= bbox.y) && y < (bbox.y + bbox.height));
}

//------------------------------------------------------------
void SkeletonTracer::traceVectorSkeletonFromSkeletonImage(){
	
	nBranchPointIndices = 0;
	bonesRawTraced.clear();
	currentBone.clear();

	int  	branchLoc;
	int 	locOfFirstUnlookedAtNeighbor;
	int  	nCurrentLocUnlookedAtNeighbors = 0;
	bool 	b_haveNeighboringBranchPoint = false;
	bool 	b_previousLocWasEndOfLine    = false;
	
	int 	nSkeletons  = 0;
	int 	nUnlookedAt = countUnlookedAtPixels();
	float	px,py;
	
	
	if ((nUnlookedAt > 0) && (nUnlookedAt > SKEL_N_WORTHWHILE_PIXELS_THRESH)) {
		int currentLoc = getLocOfFirstSkeletonPixel();
		
		while ((nUnlookedAt > 0) && (currentLoc != SKEL_INVALID)){
			nSkeletons++;
			
			do {
				nCurrentLocUnlookedAtNeighbors = countUnlookedAtNeighbors (currentLoc);
				switch (nCurrentLocUnlookedAtNeighbors){
						
					case 0: //------------------------------------------------------------------
						do { // NO UNLOOKED-AT NEIGHBORS: END OF THE LINE
							markLocationWithState (currentLoc, SKEL_TYPE_LOOKED_AT);
							addPointToCurrentBoneAtPixelIndex (currentLoc);
							
							if (bonesRawTraced.size() < SKEL_MAX_N_BONES){
								bonesRawTraced.push_back(currentBone);
							}
							currentBone.clear();
							b_previousLocWasEndOfLine = true;
							if (nBranchPointIndices > 0){
								
								branchLoc = branchPointIndices[nBranchPointIndices-1];
								nBranchPointIndices--;
								currentLoc = branchLoc;
								nCurrentLocUnlookedAtNeighbors = countUnlookedAtNeighbors (currentLoc);
							}
						} while ((nCurrentLocUnlookedAtNeighbors == 0) && (nBranchPointIndices > 0));
						break;
						
					case 1: // CONTINUATION-----------------------------------------------------
						if (b_previousLocWasEndOfLine == true){
							if (bonesRawTraced.size() < SKEL_MAX_N_BONES){
								bonesRawTraced.push_back(currentBone);
							}
							currentBone.clear();
						}
						b_previousLocWasEndOfLine = false;
						locOfFirstUnlookedAtNeighbor = getLocOfFirstUnlookedAtNeighbor (currentLoc);
						if (getTypeOfPixelAtLoc(currentLoc) == SKEL_TYPE_UNLOOKED_AT) {
							markLocationWithState (currentLoc, SKEL_TYPE_LOOKED_AT);
							addPointToCurrentBoneAtPixelIndex (currentLoc);
						}
						if (locOfFirstUnlookedAtNeighbor != SKEL_INVALID){
							currentLoc = locOfFirstUnlookedAtNeighbor;
						}
						break;
						
					case 2: //------------------------------------------------------------------
					default: // ARRIVED AT A BRANCH POINT. END CURRENT BONE, START NEW ONE
						addPointToCurrentBoneAtPixelIndex (currentLoc);
						locOfFirstUnlookedAtNeighbor = getLocOfFirstUnlookedAtNeighbor (currentLoc);
						markLocationWithState (currentLoc, SKEL_TYPE_BRANCH_POINT);
						if (nBranchPointIndices < SKEL_MAX_N_BRANCH_POINTS){
							branchPointIndices[nBranchPointIndices] = currentLoc;
							nBranchPointIndices++;
						}
						
						if (currentBone.size() > 0){
							if (bonesRawTraced.size() < SKEL_MAX_N_BONES){
								bonesRawTraced.push_back(currentBone);
							}
						}
						currentBone.clear();
						addPointToCurrentBoneAtPixelIndex (currentLoc);
						
						if (locOfFirstUnlookedAtNeighbor != SKEL_INVALID){
							currentLoc = locOfFirstUnlookedAtNeighbor;
							addPointToCurrentBoneAtPixelIndex (currentLoc);
						}
						b_previousLocWasEndOfLine = false;
						break;
						
				}
			} while ((nCurrentLocUnlookedAtNeighbors > 0) && (currentLoc != SKEL_INVALID));
			
			if (currentBone.size() > 0){
				if (bonesRawTraced.size() < SKEL_MAX_N_BONES){
					addPointToCurrentBoneAtPixelIndex (currentLoc);
					bonesRawTraced.push_back(currentBone);
				}
			}
			
			nUnlookedAt = countUnlookedAtPixels();
			currentLoc = getLocOfFirstSkeletonPixel();
			currentBone.clear();
			//addPointToCurrentBoneAtPixelIndex (currentLoc); ///
		}
	}
	// printf("nUnlookedAt: %d | nSkels %d | nBones %d \n", nUnlookedAt, nSkeletons, (int) bonesRawTraced.size());
}

//------------------------------------------------------------
void SkeletonTracer::mergeBones(){
	
	if (bDoMergeBones == false){
		bonesRawMerged.clear();
		int nRawBones = (int) bonesRawTraced.size();
		for (int i=0; i<nRawBones; i++){
			ofPolyline ithBone = bonesRawTraced[i];
			bonesRawMerged.push_back(ithBone);
		}
	
	} else {
	
		int tooShort = 4;
		vector<BoneMergeCouplet> coupletsOfMergedBones;
		coupletsOfMergedBones.clear();
		BoneMergeCouplet aCouplet;
		
		int nRawBones = (int) bonesRawTraced.size();
		for (int i=0; i<nRawBones; i++){
			
			// For every long-enough bone
			ofPolyline ithBone = bonesRawTraced[i];
			int ithBoneSize = (int) ithBone.size();
			if (ithBoneSize > tooShort){
				ofVec3f piS = ithBone[0]; // start
				ofVec3f piE = ithBone[ithBoneSize-1]; // end
				
				// Comparing with every too-short bone;
				for (int j=0; j<nRawBones; j++){
					if (j != i){
						
						// (Except for those which have already been merged)
						bool jthBoneAlreadyMerged = false;
						for (int k=0; k<coupletsOfMergedBones.size(); k++){
							BoneMergeCouplet kthCouplet = coupletsOfMergedBones[k];
							if (kthCouplet.boneJIndex == j){
								jthBoneAlreadyMerged = true;
							}
						}
						
						// Check to see if the Start or End of the long-enough bone
						// is exactly coincident with the Start or End of the too-short bone
						if (jthBoneAlreadyMerged == false){
							ofPolyline jthBone = bonesRawTraced[j];
							int jthBoneSize = (int)jthBone.size();
							if ((jthBoneSize >= 2) && (jthBoneSize <= tooShort)){
								ofVec3f pjS = jthBone[0];
								ofVec3f pjE = jthBone[jthBoneSize-1];
								
								int distiEjS = (int) ofDistSquared(piE.x,piE.y, pjS.x,pjS.y);
								int distiEjE = (int) ofDistSquared(piE.x,piE.y, pjE.x,pjE.y);
								int distiSjS = (int) ofDistSquared(piS.x,piS.y, pjS.x,pjS.y);
								int distiSjE = (int) ofDistSquared(piS.x,piS.y, pjE.x,pjE.y);
								
								// If it is, then stash this couplet.
								if ((distiEjS <= 1) || (distiEjE <= 1) || (distiSjS <= 1) || (distiSjE <= 1) ){

									if        (distiEjS <= 1){
										aCouplet.boneITerminus	= BONE_END;
										aCouplet.boneJTerminus	= BONE_START;
									} else if (distiEjE <= 1) {
										aCouplet.boneITerminus	= BONE_END;
										aCouplet.boneJTerminus	= BONE_END;
									} else if (distiSjS <= 1){
										aCouplet.boneITerminus	= BONE_START;
										aCouplet.boneJTerminus	= BONE_START;
									} else if (distiSjE <= 1){
										aCouplet.boneITerminus	= BONE_START;
										aCouplet.boneJTerminus	= BONE_END;
									}
									
									aCouplet.boneIIndex	= i;
									aCouplet.boneJIndex	= j;
									coupletsOfMergedBones.push_back(aCouplet);
								}
								
							}
						}
					}
				}
			}
		}
		
		/*
		printf("--------------------\n");
		for (int k=0; k<coupletsOfMergedBones.size(); k++){
			BoneMergeCouplet kthCouplet = coupletsOfMergedBones[k];
			int i = kthCouplet.boneIIndex;
			int j = kthCouplet.boneJIndex;
			printf("%d	%d\n", i, j);
		}
		*/
		
		bonesRawMerged.clear();
		for (int i=0; i<nRawBones; i++){
			
			// For every long-enough bone
			ofPolyline ithBone = bonesRawTraced[i];
			int ithBoneSize = (int) ithBone.size();
			if (ithBoneSize > tooShort){
				
				// check to see if it appears in a couplet.
				bool bIthBoneAppearsInACouplet = false;
				for (int k=0; k<coupletsOfMergedBones.size(); k++){
					BoneMergeCouplet kthCouplet = coupletsOfMergedBones[k];
					int iIndex = kthCouplet.boneIIndex;
					if (i == iIndex){
						bIthBoneAppearsInACouplet = true;
					}
				}
				
				if (bIthBoneAppearsInACouplet == false){
					// If it does not appear in a couplet, simply add it to bonesRawMerged
					bonesRawMerged.push_back(ithBone);
					
				} else {
					// If it does appear in a couplet, construct a merged polyline, then add to bonesRawMerged
					ofPolyline mergedBone;
					mergedBone.clear();
					bool bAddedIthBoneBulk = false;

					// First handle the J to I-start, if any
					for (int k=0; k<coupletsOfMergedBones.size(); k++){
						BoneMergeCouplet kthCouplet = coupletsOfMergedBones[k];
						if ((kthCouplet.boneIIndex == i) && (kthCouplet.boneITerminus == BONE_START)){
							int j = kthCouplet.boneJIndex;
							ofPolyline jthBone = bonesRawTraced[j];
							if (jthBone.size() >= 2) { // safety
							
								if (kthCouplet.boneJTerminus == BONE_START){
									// Now add all the points of jthBone, backwards from the end
									// Remember: the jthBone meets the ithBone at the jthBone's Start
									for (int p=((int)jthBone.size()-1); p>=0; p--){
										mergedBone.addVertex(jthBone[p]);
									}
								} else if (kthCouplet.boneJTerminus == BONE_END){
									// Now add all the points of jthBone, in order from the start
									// Remember: the jthBone meets the ithBone at the jthBone's End
									for (int p=0; p<jthBone.size(); p++){
										mergedBone.addVertex(jthBone[p]);
									}
								}
							}
							
							// Now add all the points of ithBone, in order from the start
							bAddedIthBoneBulk = true;
							for (int p=0; p<ithBone.size(); p++){
								mergedBone.addVertex(ithBone[p]);
							}
							break;
						}
					}
					
					// Now append the I-end to J, if any
					for (int k=0; k<coupletsOfMergedBones.size(); k++){
						BoneMergeCouplet kthCouplet = coupletsOfMergedBones[k];
						if ((kthCouplet.boneIIndex == i) && (kthCouplet.boneITerminus == BONE_END)){
							
							// Add all the points of ithBone, in order from the start, if we haven't already
							if (bAddedIthBoneBulk == false){
								for (int p=0; p<ithBone.size(); p++){
									mergedBone.addVertex(ithBone[p]);
								}
							}
							
							int j = kthCouplet.boneJIndex;
							ofPolyline jthBone = bonesRawTraced[j];
							if (jthBone.size() >= 2) { // safety
								if (kthCouplet.boneJTerminus == BONE_START){
									// Now add all the points of jthBone, backwards from the end
									// Remember: the jthBone meets the ithBone at the jthBone's Start
									for (int p=((int)jthBone.size()-1); p>=0; p--){
										mergedBone.addVertex(jthBone[p]);
									}
								} else if (kthCouplet.boneJTerminus == BONE_END){
									// Now add all the points of jthBone, in order from the start
									// Remember: the jthBone meets the ithBone at the jthBone's End
									for (int p=0; p<jthBone.size(); p++){
										mergedBone.addVertex(jthBone[p]);
									}
								}
							}
							break;
						}
					}
					
					bonesRawMerged.push_back(mergedBone);
					mergedBone.clear();
					
				}
			}
		}

		coupletsOfMergedBones.clear();
	}
}


//------------------------------------------------------------
void SkeletonTracer::smoothBones(){

	float small	= 12.0; //px or npts

	bonesRawSmooth.clear();
	int nBones = (int) bonesRawMerged.size();
	for (int i=0; i<nBones; i++){
		ofPolyline rawBone = bonesRawMerged[i];
		float rawBoneLength = rawBone.getPerimeter();
		int nRawBonePoints = (int) rawBone.size();
		
		if (nRawBonePoints > 3){
			if ((nRawBonePoints < small) || (rawBoneLength < small)){
				ofPolyline resampledBone = rawBone.getResampledByCount(5);
				bonesRawSmooth.push_back(resampledBone);
				
			} else {
				ofPolyline resampledBone = rawBone.getResampledBySpacing (boneResampling);
				// ofPolyline smoothedBone = resampledBone.getSmoothed (boneSmoothSigma);
				ofPolyline smoothedBone = getSmoothed (resampledBone);
				bonesRawSmooth.push_back(smoothedBone);
			}
			
		} else {
			bonesRawSmooth.push_back(rawBone);
		}
	}
}

//------------------------------------------------------------
ofPolyline SkeletonTracer::getSmoothed (ofPolyline inputBone){
	
	//---------------------------
	// Construct a gaussian kernel to smooth the polyline.
	int kernelW			= MIN(19,MAX(3,(boneSmoothKernW*2)+1)); // an odd number
	int kernelCenter	= (int)kernelW/2;
	int kLeft			= 0-kernelCenter;
	int kRight			= kernelCenter;
	float sigma			= MAX(0.01, boneSmoothSigma);
	float sum			= 0;
	
	float* kernel = new float[kernelW];
	for (int x=0; x<kernelW; ++x) {
		float val = (x-kernelCenter)/sigma;
		kernel[x] = exp(-0.5 * (val*val)) / (TWO_PI*sigma*sigma);
		sum += kernel[x];
	}
	for (int x=0; x<kernelW; ++x) {
		kernel[x] /= sum; // normalize the kernel values.
	}

	//---------------------------
	// Copy (weighted) points into tempBone
	tempBone.clear();
	int nPoints = (int) inputBone.size();
	for (int i=0; i<nPoints; i++){
		ofPoint ithPoint;
		ithPoint.set(0,0);
		
		if (i==0){
			ithPoint = inputBone[0];
		} else if (i==(nPoints-1)){
			ithPoint = inputBone[nPoints-1];
		} else {
			for (int k=0; k<kernelW; k++){
				int j = MIN(MAX(0, i+k-kernelCenter),nPoints-1);
				ithPoint += (inputBone[j] * kernel[k]);
			}
		}
		tempBone.addVertex(ithPoint);
	}
	
	//---------------------------
	// Clean up and return.
	delete[] kernel; 
	return tempBone;
}



//------------------------------------------------------------
void SkeletonTracer::compileLiveBonesIntoRawDrawing(){
	
	// Copy bonesRawSmooth (a vector of ofPolylines), i.e. the live bones,
	// into theRawDrawing (a vector of PolylinePluses)
	// as a preparation for optimization and, eventually, rendering.
	// As we do, assign the (live) bones the color: liveColor
	
	int nRawPolylines = (int) bonesRawSmooth.size();
	theRawDrawing.clear();
	
	if (!bNormalizeTheRawDrawing){
		
		// If we're not normalizing the raw drawing:
		for (int i=0; i<nRawPolylines; i++){
			ofPolyline aPolyline = bonesRawSmooth[i];
			if (aPolyline.size() > 1){
				PolylinePlus aPolylinePlus;
				aPolylinePlus.polyline = aPolyline;
				aPolylinePlus.r = (liveColor & 0xFF0000) >> 16;
				aPolylinePlus.g = (liveColor & 0x00FF00) >>  8;
				aPolylinePlus.b = (liveColor & 0x0000FF)      ;
				theRawDrawing.push_back(aPolylinePlus);
			}
		}
		
	} else if (bNormalizeTheRawDrawing){
		
		// If we're normalizing the raw drawing:
		for (int i=0; i<nRawPolylines; i++){
			ofPolyline aRawSmoothPolyline = bonesRawSmooth[i];
			int nPoints = (int)aRawSmoothPolyline.size();
			if (nPoints > 1){
				
				ofPolyline aNormalizedPolyline;
				aNormalizedPolyline.clear();
				for (int p=0; p<nPoints; p++){
					ofPoint pthPoint = aRawSmoothPolyline[p];
					float px = pthPoint.x / (float) buffer_w;
					float py = pthPoint.y / (float) buffer_w; // NOTE: SQUARE SPACE, W*W
					aNormalizedPolyline.addVertex(px, py);
				}
				
				PolylinePlus aNormalizedPolylinePlus;
				aNormalizedPolylinePlus.polyline = aNormalizedPolyline;
				aNormalizedPolylinePlus.r = (liveColor & 0xFF0000) >> 16;
				aNormalizedPolylinePlus.g = (liveColor & 0x00FF00) >>  8;
				aNormalizedPolylinePlus.b = (liveColor & 0x0000FF)      ;
				theRawDrawing.push_back(aNormalizedPolylinePlus);
			}
		}
	}
}

//------------------------------------------------------------
void SkeletonTracer::drawCurrentSkeletons(float dx, float dy, float dw, bool bcol){
    int nCurrentSkeletons = (int) currentSkeletons.size();
    if (nCurrentSkeletons > 0){
        ofNoFill();
        ofPushMatrix();
        ofTranslate(dx,dy);
        float scaleFactor = (bNormalizeTheRawDrawing) ? dw : (dw/(float)buffer_w);
        ofScale(scaleFactor,scaleFactor);
    
        static const unsigned char cols[6][3] = {
            {255, 0, 0},    // Red
            {255, 0, 255},  // Magenta
            {255, 150, 0},  // Orange
            {200, 50, 100},
            {255, 200, 50},
            {255, 100, 50}  
        };
        
        for (int i=0; i<nCurrentSkeletons; i++){
            PersonSkeleton ithSkeleton = currentSkeletons[i];
            if (bcol){
                float r = ithSkeleton.r;
                float g = ithSkeleton.g;
                float b = ithSkeleton.b;
                
                /*
                int ci = (ithSkeleton.label)%6;
                float amt = 0;
                float r = ofLerp(cols[ci][0], 255, amt);
                float g = ofLerp(cols[ci][1], 255, amt);
                float b = ofLerp(cols[ci][2], 255, amt);
                 */
                
                ofSetColor(r,g,b);
            } else {
                ofSetColor(255);
            }
            
            int nBones = (int) ithSkeleton.bones.size();
            for (int j=0; j<nBones; j++){
                ofPolyline jthBone = ithSkeleton.bones[j];
                int nPoints = (int) jthBone.size();
                ofBeginShape();
                for (int k=0; k<nPoints; k++){
                    ofVertex(jthBone[k].x, jthBone[k].y);
                }
                ofEndShape();
            }
        }
        ofPopMatrix();
    }
}

//------------------------------------------------------------
void SkeletonTracer::drawTheRawDrawing(float dx, float dy, float dw){
    int nPolylinePlus = (int)theRawDrawing.size();
    if (nPolylinePlus > 0){
        ofPushMatrix();
        ofTranslate(dx,dy);
        if (bNormalizeTheRawDrawing){
            ofScale(dw,dw);
        } else {
            ofScale(dw/buffer_w, dw/buffer_w);
        }
        for (int i=0; i<nPolylinePlus; i++){
            PolylinePlus aPP = theRawDrawing[i];
            ofSetColor(aPP.r, aPP.g, aPP.b);
            ofPolyline aPolyline = aPP.polyline;
            int nPoints = (int)aPolyline.size();
            ofBeginShape();
            for (int j=0; j<nPoints; j++){
                float px = aPolyline[j].x;
                float py = aPolyline[j].y;
                ofVertex(px,py);
            }
            ofEndShape();
        }
        ofPopMatrix();
    }
}


//------------------------------------------------------------
void SkeletonTracer::drawStateImage(){
	pixelStateImage.setFromPixels(pixelStateBuffer, buffer_w, buffer_h, OF_IMAGE_GRAYSCALE);
	pixelStateImage.draw(0,0, buffer_w, buffer_h);
}



///////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////
//=================================================================================
int SkeletonTracer::countUnlookedAtPixels (){
	int count = 0;
	int nPixels = buffer_w * buffer_h; // could be optimized later with bbox.
	const unsigned char testValue = (unsigned char) SKEL_COLOR_UNLOOKED_AT;
	for (int i=0; i<nPixels; i++){
		if (pixelStateBuffer[i] == testValue){
			count++;
		}
	}
	return count;
}

//------------------------------------------------------------
int SkeletonTracer::getLocOfFirstSkeletonPixel (){
	int result = SKEL_INVALID;

	int i = boundary0;
	while ((result == SKEL_INVALID) && (i<boundary1)){
		if (pixelStateBuffer[i] == SKEL_COLOR_UNLOOKED_AT){
			result = i;
		}
		i++;
	}
	return result;
}

//------------------------------------------------------------
void SkeletonTracer::markLocationWithState (int loc, SkelType state){
	unsigned char *img = pixelStateBuffer;
	switch (state){
		case SKEL_TYPE_EMPTY:			img[loc] = SKEL_COLOR_EMPTY;        break;
		case SKEL_TYPE_LOOKED_AT:		img[loc] = SKEL_COLOR_LOOKED_AT;    break;
		case SKEL_TYPE_BRANCH_POINT:	img[loc] = SKEL_COLOR_BRANCH_POINT; break;
		case SKEL_TYPE_UNLOOKED_AT:		img[loc] = SKEL_COLOR_UNLOOKED_AT;  break;
		case SKEL_TYPE_INVALID:			img[loc] = SKEL_COLOR_EMPTY;        break;
	}
}

//------------------------------------------------------------
SkelType SkeletonTracer::getTypeOfPixelAtLoc (int loc){
	SkelType result = SKEL_TYPE_INVALID;
	if ((loc >= boundary0) && (loc < boundary1)){
		unsigned char *pixels = pixelStateBuffer;
		unsigned char c = pixels[loc];
		switch(c){
			case SKEL_COLOR_LOOKED_AT:		result = SKEL_TYPE_LOOKED_AT;     break;
			case SKEL_COLOR_BRANCH_POINT:	result = SKEL_TYPE_BRANCH_POINT;  break;
			case SKEL_COLOR_UNLOOKED_AT:	result = SKEL_TYPE_UNLOOKED_AT;   break;
			case SKEL_COLOR_EMPTY:			result = SKEL_TYPE_EMPTY;         break;
		}
	}
	return result;
}

//------------------------------------------------------------
// returns loc of the first unlooked-at neighbor, counting clockwise.
int SkeletonTracer::getLocOfFirstUnlookedAtNeighbor (int loc){
	int result = SKEL_INVALID;
	if ((loc >= boundary0) && (loc < boundary1)){
		const int sw = buffer_w;
		if (getTypeOfPixelAtLoc(loc-sw+1 ) == SKEL_TYPE_UNLOOKED_AT) return (loc-sw+1 );
		if (getTypeOfPixelAtLoc(loc+1    ) == SKEL_TYPE_UNLOOKED_AT) return (loc+1    );
		if (getTypeOfPixelAtLoc(loc+sw+1 ) == SKEL_TYPE_UNLOOKED_AT) return (loc+sw+1 );
		if (getTypeOfPixelAtLoc(loc+sw   ) == SKEL_TYPE_UNLOOKED_AT) return (loc+sw   );
		if (getTypeOfPixelAtLoc(loc+sw-1 ) == SKEL_TYPE_UNLOOKED_AT) return (loc+sw-1 );
		if (getTypeOfPixelAtLoc(loc-1    ) == SKEL_TYPE_UNLOOKED_AT) return (loc-1    );
		if (getTypeOfPixelAtLoc(loc-sw-1 ) == SKEL_TYPE_UNLOOKED_AT) return (loc-sw-1 );
		if (getTypeOfPixelAtLoc(loc-sw   ) == SKEL_TYPE_UNLOOKED_AT) return (loc-sw   );
	}
	return result;
}

//------------------------------------------------------------
int SkeletonTracer::countUnlookedAtNeighbors (int loc){
	int result = 0;
	if ((loc >= boundary0) && (loc < boundary1)){
		const int sw = buffer_w;
		if (getTypeOfPixelAtLoc(loc-sw+1 ) == SKEL_TYPE_UNLOOKED_AT) result++;
		if (getTypeOfPixelAtLoc(loc+1    ) == SKEL_TYPE_UNLOOKED_AT) result++;
		if (getTypeOfPixelAtLoc(loc+sw+1 ) == SKEL_TYPE_UNLOOKED_AT) result++;
		if (getTypeOfPixelAtLoc(loc+sw   ) == SKEL_TYPE_UNLOOKED_AT) result++;
		if (getTypeOfPixelAtLoc(loc+sw-1 ) == SKEL_TYPE_UNLOOKED_AT) result++;
		if (getTypeOfPixelAtLoc(loc-1    ) == SKEL_TYPE_UNLOOKED_AT) result++;
		if (getTypeOfPixelAtLoc(loc-sw-1 ) == SKEL_TYPE_UNLOOKED_AT) result++;
		if (getTypeOfPixelAtLoc(loc-sw   ) == SKEL_TYPE_UNLOOKED_AT) result++;
	}
	return result;
}

//------------------------------------------------------------
bool SkeletonTracer::checkIfAnyNeighborsAreBranchPoints (int loc){
	bool result = false;
	if ((loc >= boundary0) && (loc < boundary1)){
		const int sw = buffer_w;
		if (getTypeOfPixelAtLoc(loc-sw+1 ) == SKEL_TYPE_BRANCH_POINT) return true;
		if (getTypeOfPixelAtLoc(loc+1    ) == SKEL_TYPE_BRANCH_POINT) return true;
		if (getTypeOfPixelAtLoc(loc+sw+1 ) == SKEL_TYPE_BRANCH_POINT) return true;
		if (getTypeOfPixelAtLoc(loc+sw   ) == SKEL_TYPE_BRANCH_POINT) return true;
		if (getTypeOfPixelAtLoc(loc+sw-1 ) == SKEL_TYPE_BRANCH_POINT) return true;
		if (getTypeOfPixelAtLoc(loc-1    ) == SKEL_TYPE_BRANCH_POINT) return true;
		if (getTypeOfPixelAtLoc(loc-sw-1 ) == SKEL_TYPE_BRANCH_POINT) return true;
		if (getTypeOfPixelAtLoc(loc-sw   ) == SKEL_TYPE_BRANCH_POINT) return true;
	}
	return result;
}

//------------------------------------------------------------
void SkeletonTracer::addPointToCurrentBoneAtPixelIndex(int currentLoc){
	float px = (float) (currentLoc % buffer_w);
	float py = (float) (currentLoc / buffer_w);
	currentBone.addVertex(px, py);
}


//============================================================
// PROBABLY NOT USED:
//------------------------------------------------------------
void SkeletonTracer::copyROICv(unsigned char* srcBuf,
                               unsigned char* dstBuf,
                               int width, int height,
                               int roi_x, int roi_y,
                               int roi_width, int roi_height) {
    
    // Wrap the buffers into cv::Mat objects
    cv::Mat srcMat(height, width, CV_8UC1, srcBuf);
    cv::Mat dstMat(height, width, CV_8UC1, dstBuf);

    // Define the ROI in the source image
    cv::Rect roi(roi_x, roi_y, roi_width, roi_height);

    // Copy the ROI from srcMat to the corresponding location in dstMat
    srcMat(roi).copyTo(dstMat(roi));
}


// ofPolyline jthPersonContourPolyline = jthPersonContour.polyline;
// bool bIn = isPointInPolygon(cx,cy, jthPersonContourPolyline);
//------------------------------------------------------------
bool SkeletonTracer::isPointInPolygon(float x, float y, const ofPolyline& aPolyline) {
    bool inside = false;
    size_t n = aPolyline.size();

    for (size_t i=0, j=n-1; i<n; j=i++) {
        const ofPoint& pi = aPolyline[(int)i];
        const ofPoint& pj = aPolyline[(int)j];
        if (((pi.y > y) != (pj.y > y)) &&
            (x < (pj.x - pi.x) * (y - pi.y) / (pj.y - pi.y) + pi.x)) {
            inside = !inside;
        }
    }
    return inside;
}

