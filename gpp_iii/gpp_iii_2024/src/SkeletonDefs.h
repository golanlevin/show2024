//
//  SkeletonDefs.h

#pragma once

#include "ofMain.h"
#include "ofxCv.h"

/* genuinely needs to be a power of 2 for poisson */
#define FBOW 1024
#define FBOH 2048

#define METHOD_DIAGNOSTIC -1
#define METHOD_PLAIN_LINES 0               /* using lines - just overtop */
#define METHOD_LINES_INTO_POISSON_FBO 1    /* using lines - into the poisson image */
#define METHOD_FATBONES_INTO_FBO 2         /* using SkeletonBoneDrawer - into fbo */

#define MAX_N_SKELETON_RECORDINGS 128
#define MAX_N_SKELETONS_PER_RECORDING 256
#define MAX_N_BONES_PER_SKELETON 16
#define MAX_POINTS_PER_BONE 80

//-------------------------------------------------------------------
struct Bone {
    ofVec2f *points; // Fixed-size array of ofVec2f
    int nPoints; // Number of the ofVec2f's that are actually used
    Bone() {
        nPoints = 0;
        points = new ofVec2f[MAX_POINTS_PER_BONE];
    }
    ~Bone() {
        delete[] points;
    }
};

struct Skeleton { // Same thing as a "Frame"
    Bone bones[MAX_N_BONES_PER_SKELETON]; // Fixed-size array of Bone objects
    int nBones; // Number of bones actually used
    ofRectangle bbox; // Bounding box
    float r, g, b; // Color information
    float cx,cy; // Centroid of its contour
    int label; // Label information
    int contourIndex; /* index of the skeleton's contour in the ofxCv contour finder */
    int age;
    
    // Constructor to initialize nBones and other fields in the body
    Skeleton() {
        nBones = 0;
        r = 0.0f;
        g = 0.0f;
        b = 0.0f;
        cx = 0.0f;
        cy = 0.0f;
        label = 0;
        age = 0;
        contourIndex = 0; 
        bbox = ofRectangle(0, 0, 0, 0);
    }
    // Destructor is not needed here since Bone's destructor handles memory cleanup
};

// If we need to abort (delete) a recording, we set its 'bAvailable' field to true.
// If we need to add a new new recording, we search for the first one with bAvailable set.
// If no recordings are bAvailable and we need to add a new one, we can set the oldest to bAvailable. 

struct Recording {
    Skeleton frames[MAX_N_SKELETONS_PER_RECORDING]; // Fixed-size array of Skeleton objects
    int nFrames; // Number of frames actually used
    int playbackIndex;
    bool bAvailable; // Whether or not this is available for recycling.
    bool bPlaying; // Indicates whether the recording is playing back
    bool bApproved;
    int label;
    int birthday;
    int deathday;
    float dxAvg, dyAvg;
    float cxAvg, cyAvg;
    float playbackCx; /* 0...1     */
    float playbackCy; /* 0...1.777 */
    float playbackScale;
    
    Recording() {
        nFrames = 0;
        playbackIndex = 0;
        bAvailable = true;
        bPlaying = false;
        bApproved = false;
        label = 0;
        birthday = 0;
        deathday = 0;
        dxAvg = dyAvg = 0.0f;
        cxAvg = cyAvg = 0.0f;
        playbackCx = 0.0f;
        playbackCy = 0.0f;
        playbackScale = 1.0f;
    }
    // Destructor is not needed here since Skeleton's destructor handles memory cleanup
};






//-------------------------------------------------------------------
struct PolylinePlus {
    ofPolyline polyline;
    float r;
    float g;
    float b;
};

// A closed blob (polyline) representing a person's contour during one frame
struct PersonContour {
    ofPolyline polyline;
    cv::Rect  bbox;
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


#define		THE_LIVE_DRAWING	0
#define		PLAYBACK_DRAWING	1

