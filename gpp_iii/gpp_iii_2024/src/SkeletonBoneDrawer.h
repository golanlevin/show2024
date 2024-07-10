#ifndef _VIDEO_SKEL_BONE_MINI_DRAWER_H
#define _VIDEO_SKEL_BONE_MINI_DRAWER_H


#include "ofMain.h"
#include "SkeletonDefs.h"

//---------------------------------------------
class SkeletonBoneDrawer {

public:

    SkeletonBoneDrawer ();
	void drawScaled (ofPolyline &bone, float thickness);
    void drawScaledDotted (ofPolyline &bone, float thickness);
    void drawScaledBone (Bone &bone, float thickness);
    void drawScaledDottedBone (Bone &bone, float thickness);
    ofMesh mesh;

};




#endif // _VIDEO_SKEL_BONE_MINI_DRAWER_H


