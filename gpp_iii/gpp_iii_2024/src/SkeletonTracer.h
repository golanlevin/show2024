//
//  SkeletonTracer.h
//  GPP2016_Display
//
//  Created by GL on 11/27/16.
//
//

#pragma once

#include "ofMain.h"
#include "ofxCv.h" // for Tracker
#include "ofxGui.h"

#include "SkeletonBoneDrawer.h"
#include "SkeletonDefs.h"


//---------------------------------------------
#define SKEL_INVALID						-1
#define SKEL_N_WORTHWHILE_PIXELS_THRESH		32
#define SKEL_MAX_N_BONES					512
#define SKEL_MAX_N_BRANCH_POINTS			256

typedef enum SkelType {
	SKEL_TYPE_EMPTY 			= 0,
	SKEL_TYPE_UNLOOKED_AT		= 1,
	SKEL_TYPE_LOOKED_AT 		= 2,
	SKEL_TYPE_BRANCH_POINT		= 3,
	SKEL_TYPE_INVALID			= -1
} SkelType;

typedef enum SkelColor {
	SKEL_COLOR_EMPTY        = 0,
	SKEL_COLOR_LOOKED_AT    = 64,
	SKEL_COLOR_BRANCH_POINT = 128,
	SKEL_COLOR_UNLOOKED_AT  = 255
} SkelColor;

typedef enum BoneTerminus {
	BONE_START = 0,
	BONE_END   = 1
} BoneTerminus;

struct BoneMergeCouplet {
	int				boneIIndex;
	BoneTerminus	boneITerminus;
	int				boneJIndex;
	BoneTerminus	boneJTerminus;
};



class SkeletonTracer {
	
	public:
	
	void	initialize (int w, int h);
    void    computeVectorSkeletons (unsigned char* skeletonPixelBuffer,
                                   const std::vector<PersonContour>& personContours);
	void	traceVectorSkeletonFromSkeletonImage();
	void	mergeBones(); 
	void	smoothBones();
	void	drawStateImage();
    void    drawTheRawDrawing(float dx, float dy, float dw);
    void    drawCurrentSkeletons(float dx, float dy, float dw, float thickness, float colorPct, bool bcol);
    void    displayCurrentSkeletons(float dx, float dy, float dw, float th, float r,float g,float b);
	ofPolyline getSmoothed (ofPolyline inputBone);
	
	ofPolyline			tempBone;
	ofPolyline			currentBone;
	vector<ofPolyline>	bonesRawTraced;		// 1. The raw traced bones.
	vector<ofPolyline>	bonesRawMerged;		// 2. Ultra-short bones appended to neighbors.
	vector<ofPolyline>	bonesRawSmooth;		// 3. Visually filtered bones (resampled, smoothed).
	
	int				buffer_w;
	int				buffer_h;
	unsigned char	*tmpBuffer;
	unsigned char	*pixelStateBuffer;
	ofImage			pixelStateImage;
	int				boundary0;
	int				boundary1;
	
	int				*branchPointIndices;
	int				nBranchPointIndices;
	
	void			addPointToCurrentBoneAtPixelIndex (int loc);
	int				countUnlookedAtPixels();
	int				getLocOfFirstSkeletonPixel();
	void			markLocationWithState (int loc, SkelType state);
	SkelType		getTypeOfPixelAtLoc (int loc);
	int				getLocOfFirstUnlookedAtNeighbor (int loc);
	int				countUnlookedAtNeighbors (int loc);
	bool			checkIfAnyNeighborsAreBranchPoints (int loc);
	


	bool			bDoMergeBones;
	float			boneResampling;
	float			boneSmoothSigma;
	int				boneSmoothKernW;
	

	//-----------------
	int						liveColor;
	void					compileLiveBonesIntoRawDrawing();
	void					normalizeTheRawDrawing();
	vector<PolylinePlus>	theRawDrawing;
	bool					bNormalizeTheRawDrawing;
    
    void collateRawDrawingIntoLabeledSkeletons(
             const std::vector<PersonContour>& personContours);
    bool isPointInPolygon(float x, float y, const ofPolyline& aPolyline);
    bool isPointInBbox(float x, float y, cv::Rect bbox);
    vector<PersonSkeleton>  currentSkeletons;
    
    SkeletonBoneDrawer  *skibidi;
    
    void copyROICv(unsigned char* srcBuf, unsigned char* dstBuf,
                   int width, int height, int roi_x, int roi_y, int roi_width, int roi_height);
    
    static bool comparePolylinePluses(const PolylinePlus& a, const PolylinePlus& b);

};


