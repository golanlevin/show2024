//
//  SkeletonDefs.h

#pragma once

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
};

// A collection of polylines representing a person's skeleton during one frame
struct PersonSkeleton {
    vector<ofPolyline> bones; /* polylines comprising the skeleton */
    uint64_t timestamp; /* timestamp of this frame */
    int label;
    int age;
    float r;
    float g;
    float b;
};

#define		THE_LIVE_DRAWING	0
#define		PLAYBACK_DRAWING	1

