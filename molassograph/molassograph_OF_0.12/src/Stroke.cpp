#include "Stroke.h"

const float Stroke::MAX_SEG_LENGTH = 6.0f;
const float Stroke::MAX_SEG_LENGTH_INV = 1.0f / Stroke::MAX_SEG_LENGTH;
const float Stroke::linearSpringConstant = 0.0120f;
const float Stroke::angularSpringConstant = 0.0009f;
const float Stroke::damping = 0.95f;

Stroke::Stroke() {
    clear();
}

void Stroke::clear() {
    nPoints = 0;
    done_adding = false;
}

void Stroke::addPoint(float x, float y) {
    float DX, DY, DH;
    float dx, dy, dh;
    int segsToPlace;

    if (nPoints == 0) {
        done_adding = false;
        xptsPos[nPoints] = x;
        yptsPos[nPoints] = y;
        xptsVel[nPoints] = 0.0f;
        yptsVel[nPoints] = 0.0f;
        initDis[nPoints] = 0.0f;
        initAng[nPoints] = 0.0f;
        nPoints++;
    } else if (nPoints >= MAX_NPOINTS) {
        done_adding = true;
    } else {
        done_adding = false;
        DX = x - xptsPos[nPoints - 1];
        DY = y - yptsPos[nPoints - 1];
        DH = std::sqrt(DX * DX + DY * DY);

        segsToPlace = (int)(DH * MAX_SEG_LENGTH_INV);
        float remainder = DH - (segsToPlace * MAX_SEG_LENGTH);
        float maxLen = MAX_SEG_LENGTH;
        float slopex = DX / DH;
        float slopey = DY / DH;
        float segLength;

        if (segsToPlace == 0) {
            segsToPlace = 1;
            maxLen = 0;
        }

        for (int i = 0; i < segsToPlace; i++) {
            if (nPoints >= MAX_NPOINTS) {
                done_adding = true;
                break;
            } else {
                segLength = maxLen;
                if (i == 0) {
                    segLength = maxLen + remainder;
                }

                xptsPos[nPoints] = xptsPos[nPoints - 1] + slopex * segLength;
                yptsPos[nPoints] = yptsPos[nPoints - 1] + slopey * segLength;
                xptsVel[nPoints] = 0.0f;
                yptsVel[nPoints] = 0.0f;

                dx = slopex * segLength;
                dy = slopey * segLength;
                dh = segLength;

                initDis[nPoints] = dh;

                if (nPoints > 1) {
                    float pdx = xptsPos[nPoints - 1] - xptsPos[nPoints - 2];
                    float pdy = yptsPos[nPoints - 1] - yptsPos[nPoints - 2];
                    float pdh = initDis[nPoints - 1];
                    float angle = findAngle(pdx, pdy, pdh, dx, dy, dh);
                    initAng[nPoints - 1] = angle;
                } else {
                    initAng[nPoints] = 0;
                }

                nPoints++;
            }
        }
    }

    if (nPoints == 2) {
        addPoint(x + 0.1f, y + 0.1f);
    }
}

float Stroke::findAngle(float Ax, float Ay, float magA, float Bx, float By, float magB) {
    if ((std::abs(magA) < 0.00001f) || (std::abs(magB) < 0.00001f)) {
        return 0;
    } else {
        float dotProduct = Ax * Bx + Ay * By;
        float crossProduct = Ax * By - Ay * Bx;
        float cosTheta = (dotProduct / magA) / magB;
        float angle = std::acos(cosTheta);

        if (std::isnan(angle)) {
            angle = 0;
        } else if (crossProduct < 0) {
            angle = -angle;
        }
        return angle * (180.0f / PI);
    }
}

// impulseWithImage(unsigned char* rgbImg, int imgW, int imgH, float floccusToImgScaleRatio, float alongGradient, float acrossGradient)

void Stroke::impulseFromLoc(float mx, float my, float G, bool special) {
    float fx, fy;
    float dx, dy;
    float dh;
    int spts = (special && !done_adding) ? (nPoints - 16) : nPoints;
    int npts = spts - 1;
    if (npts >= 0) {
        for (int i = 0; i < npts; i++) {
            dx = mx - xptsPos[i];
            dy = my - yptsPos[i];
            dh = G / ((dx*dx + dy*dy) + 0.1f);
            xptsVel[i] += dx*dh;
            yptsVel[i] += dy*dh;
        }
    }
}

void Stroke::impulse(int i, float xacc, float yacc) {
    if (i < nPoints) {
        xptsVel[i] += xacc;
        yptsVel[i] += yacc;
        xptsVel[i + 1] += xacc;
        yptsVel[i + 1] += yacc;
    }
}

void Stroke::move(bool drawAlso) {
    float dx, dy, dh;
    int nSegs = nPoints - 1;

    if (nSegs > 1) {
        float xaccL, yaccL;
        float displacement;
        float pdx, pdy, pdh, angDisp;
        pdx = 0;
        pdy = 0;
        pdh = 0.00001f;

        float factor1, factor2;
        float xaccR1, yaccR1;
        float xaccR2, yaccR2;
        int i = 0;
        int j = 1;
        float fa;

        for (i = 0; i < nSegs; i++) {
            j = i + 1;

            dx = xptsPos[j] - xptsPos[i];
            dy = yptsPos[j] - yptsPos[i];
            dh = std::sqrt(dx * dx + dy * dy);
            if (std::abs(dh) < 0.00001f) {
                dh = 0.00001f;
            }

            fa = findAngle(pdx, pdy, pdh, dx, dy, dh);
            angDisp = (i > 0) ? (fa - initAng[i]) : 0;

            factor1 = angDisp / dh * angularSpringConstant;
            xaccR1 = (-dy) * factor1;
            yaccR1 = (dx) * factor1;

            factor2 = angDisp / pdh * angularSpringConstant;
            xaccR2 = (-pdy) * factor2;
            yaccR2 = (pdx) * factor2;

            pdx = dx;
            pdy = dy;
            pdh = dh;

            displacement = ((dh - initDis[j]) * linearSpringConstant) / dh;
            xptsVel[i] += ((xaccL = dx * displacement) + (xaccR1 + xaccR2));
            yptsVel[i] += ((yaccL = dy * displacement) + (yaccR1 + yaccR2));
            xptsVel[j] -= (xaccL + xaccR1);
            yptsVel[j] -= (yaccL + yaccR1);

            if (i > 0) {
                xptsVel[i - 1] -= xaccR2;
                yptsVel[i - 1] -= yaccR2;
            }
        }

        if (drawAlso) {
            for (i = 0; i < nPoints; i++) {
                xptsPos[i] += (xptsVel[i] *= damping);
                yptsPos[i] += (yptsVel[i] *= damping);
            }

            ofNoFill();
            ofSetLineWidth(1.0);
            ofSetColor(255, 255, 255, 144);
            ofBeginShape();
            ofVertex(xptsPos[0], yptsPos[0]);
            for (i = 1; i < nPoints - 1; i++) {
                ofCurveVertex(xptsPos[i], yptsPos[i]);
            }
            ofEndShape();

        } else {
            for (i = 0; i < nPoints; i++) {
                xptsPos[i] += (xptsVel[i] *= damping);
                yptsPos[i] += (yptsVel[i] *= damping);
            }
        }
    } else {
        if (nPoints > 0) {
            for (int i = 0; i < nPoints; i++) {
                xptsPos[i] += (xptsVel[i] *= damping);
                yptsPos[i] += (yptsVel[i] *= damping);
            }
        }
    }
}
