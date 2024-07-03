#ifndef _VIDEO_SKEL_BONE_MINI_DRAWER_H
#define _VIDEO_SKEL_BONE_MINI_DRAWER_H


#include "ofMain.h"
#include "SkeletonDefs.h"

//---------------------------------------------
class SkeletonBoneDrawer {

public:

    SkeletonBoneDrawer ();
	void drawScaled (ofPolyline &bone, float thickness);
    ofMesh mesh;

};




#endif // _VIDEO_SKEL_BONE_MINI_DRAWER_H


