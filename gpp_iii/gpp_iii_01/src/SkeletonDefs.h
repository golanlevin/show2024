//
//  SkeletonDefs.h

#pragma once

#include "ofMain.h"
#include "ofxCv.h"

#define FBOW 1024
#define FBOH 2048

#define METHOD_DIAGNOSTIC -1
#define METHOD_PLAIN_LINES 0               /* using lines - just overtop */
#define METHOD_LINES_INTO_POISSON_FBO 1    /* using lines - into the poisson image */
#define METHOD_FATBONES_INTO_FBO 2         /* using SkeletonBoneDrawer - into fbo */
#define METHOD_BBOXES_INTO_CVIMAGE 3       /* using bounding rects - into ofxCvGrayscaleImage */


struct PolylinePlus {
	ofPolyline polyline; // assume there will always be a field called 'polyline'
	float r;
	float g;
	float b;
};

// A closed blob (polyline) representing a person's contour during one frame
struct PersonContour {
    ofPolyline polyline;
    cv::Rect  bbox;
    uint64_t timestamp; /* timestamp of this frame */
    int label;
    int age;
    float r;
    float g;
    float b;
    float cx; /* centroid of its contour */
    float cy;
};

// A collection of polylines representing a person's skeleton during one frame
struct PersonSkeleton {
    vector<ofPolyline> bones; /* polylines comprising the skeleton */
    uint64_t timestamp; /* timestamp of this frame */
    ofRectangle bbox;
    int contourIndex; /* index of the skeleton's contour in the ofxCv contour finder */
    int label;
    int age;
    float r;
    float g;
    float b;
    float cx; /* centroid of its contour */
    float cy;
};

struct PersonSkeletonRecording {
    vector<PersonSkeleton> frames; /* each frame is a skeleton */
    int label;
    int birthday;
    int deathday;
    bool bApproved;
    float dxAvg;
    float dyAvg;
    float cxAvg;
    float cyAvg;
    
    bool bPlaying;
    int playbackIndex;
    float playbackCx; /* 0...1     */
    float playbackCy; /* 0...1.777 */
    float playbackScale;
};

struct PersonTrackingInfo {
    int label;
    int contourIndex;
    int age;
};



#define		THE_LIVE_DRAWING	0
#define		PLAYBACK_DRAWING	1

