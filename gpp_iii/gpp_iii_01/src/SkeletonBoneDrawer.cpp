#include "SkeletonBoneDrawer.h"


//-------------------------------------------------------------------
SkeletonBoneDrawer::SkeletonBoneDrawer () {
} 


//------------------------------------------------------------------------------- 
void SkeletonBoneDrawer::drawScaled (ofPolyline &bone, float thickness){
    
    mesh.clear();
    mesh.setMode(OF_PRIMITIVE_TRIANGLE_STRIP);

    int nQuads = 0;
    int nPoints = (int) bone.size();
    if (nPoints >= 3){
        
        int nPathPoints = nPoints-1;
        int lastQuadIndex = nPathPoints-1;
        
        float p0x,p0y;
        float p1x,p1y;
        float p2x,p2y;
        
        float radius0, radius1;
        float cx, dx;
        float cy, dy;
        float dx01, dy01, hp01, si01, co01;
        float dx02, dy02, hp02, si02, co02;
        float dx13, dy13, hp13, si13, co13;
        float capx, capy;
        
        // draw a startcap
        capx = bone[0].x;
        capy = bone[0].y;
        ofDrawCircle(capx, capy, radius0);
        
        // handle the first points
        p0x = bone[0].x;
        p0y = bone[0].y;
        p1x = bone[1].x;
        p1y = bone[1].y;
        radius0 = thickness;
        dx01 = p1x - p0x;
        dy01 = p1y - p0y;
        hp01 = sqrtf(dx01*dx01 + dy01*dy01);
        if (hp01 == 0) { hp02 = 0.001f; }
        co01 = radius0 * dx01 / hp01;
        si01 = radius0 * dy01 / hp01;
        cx = p0x + si01;	
        cy = p0y - co01;
        dx = p0x - si01;	
        dy = p0y + co01;
        mesh.addVertex(ofVec3f(cx, cy, 0));
        mesh.addVertex(ofVec3f(dx, dy, 0));
        
        // handle the middle points
        int i=1;
        float t;
        radius1 = thickness;
        for (i=1; i<nPathPoints; i++){
            
            p0x = (float) (bone[i-1].x);
            p0y = (float) (bone[i-1].y);
            p1x = (float) (bone[i  ].x);
            p1y = (float) (bone[i  ].y);
            p2x = (float) (bone[i+1].x);
            p2y = (float) (bone[i+1].y);
            
            // assumes all segments are the same length
            // because the gesture has been resampled
            dx02 = p2x - p0x;
            dy02 = p2y - p0y;
            hp02 = sqrtf(dx02*dx02 + dy02*dy02);
            if (hp02 == 0) { hp02 = 0.001f; }
            co02 = radius1 * dx02 / hp02;
            si02 = radius1 * dy02 / hp02;
            cx = p1x + si02;	
            cy = p1y - co02;
            dx = p1x - si02;	
            dy = p1y + co02;
            
            mesh.addVertex(ofVec3f(cx, cy, 0));
            mesh.addVertex(ofVec3f(dx, dy, 0));
        }

        // handle the last point
        p2x = bone[nPathPoints].x;
        p2y = bone[nPathPoints].y;
        
        radius1 = thickness;
        dx01 = p2x - p1x;
        dy01 = p2y - p1y;
        hp01 = sqrtf(dx01*dx01 + dy01*dy01);
        if (hp01 == 0) { hp01 = 0.001f; }
        co01 = radius1 * dx01 / hp01;
        si01 = radius1 * dy01 / hp01;
        cx = p2x + si01;	cy = p2y - co01;
        dx = p2x - si01;	dy = p2y + co01;
        
        mesh.addVertex(ofVec3f(cx, cy, 0));
        mesh.addVertex(ofVec3f(dx, dy, 0));
        
        //------------------------------------------
        // ok now the vertices are compiled.
        mesh.draw();
        
        // draw a startcap
        capx = p2x;
        capy = p2y;
        ofDrawCircle(capx, capy, radius0);
    }
}
