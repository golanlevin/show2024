//
//  Stroke.h
//  floccugraphClient2
//
//  Created by gl on 7/13/24.
//

#ifndef STROKE_H
#define STROKE_H

#include "ofMain.h"

class Stroke {
public:
    static const int MAX_NPOINTS = 1000;
    static const float MAX_SEG_LENGTH;
    static const float MAX_SEG_LENGTH_INV;
    static const float linearSpringConstant;
    static const float angularSpringConstant;
    static const float damping;

    float xptsPos[MAX_NPOINTS]; // positions
    float yptsPos[MAX_NPOINTS];
    float xptsVel[MAX_NPOINTS]; // velocities
    float yptsVel[MAX_NPOINTS];
    float initDis[MAX_NPOINTS]; // initial distances between points
    float initAng[MAX_NPOINTS]; // initial angles between points

    int nPoints;
    bool done_adding;

    Stroke();
    void clear();
    void addPoint(float x, float y);
    void impulseFromLoc(float mx, float my, float G, bool special);
    void impulse(int i, float xacc, float yacc);
    void move(bool drawAlso);
    
private:
    float findAngle(float Ax, float Ay, float magA, float Bx, float By, float magB);
};

#endif // STROKE_H

