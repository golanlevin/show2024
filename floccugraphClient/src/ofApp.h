#pragma once

#include "ofMain.h"
#include "ofxOsc.h"
#include "ofxConvexHull.h"
#include "ofxOpenCv.h"
#include "ofxCvHaarFinder.h"

#include "ofAppGLFWWindow.h"
#include "GLFW/glfw3.h"

#define OSC_RX_PORT 3334
#define OSC_TX_PORT 12000
#define N_FACE_LANDMARKS 478
#define N_FACE_METRICS 52

#define FACE_FROM_OSC 1
#define FACE_FROM_HAAR 2
#define MIDDLE_GRAY 0

struct Face{
	vector<ofVec2f> keypoints;
};

class ofApp : public ofBaseApp{
public:
    void setup();
    void update();
    void draw();
    
    void keyPressed(int key);
    void keyReleased(int key);
    void mouseMoved(int x, int y );
    void mouseDragged(int x, int y, int button);
    void mousePressed(int x, int y, int button);
    void mouseReleased(int x, int y, int button);
    void mouseEntered(int x, int y);
    void mouseExited(int x, int y);
    void windowResized(int w, int h);
    void dragEvent(ofDragInfo dragInfo);
    void gotMessage(ofMessage msg);
    
    void setup2ndMonitor(); 
    void setupCamera();
    ofVideoGrabber vidGrabber;
    int vidGrabberFrameCount;
    
    void setupOSC();
    void processOSC();
    void drawDebugOSC();
    void toggleOSCSource();
    void handleFailure();
    ofxOscReceiver oscReceiver;
    ofxOscSender oscSender;
    vector<Face> faces;
    float *faceMetrics;
    int oscUpdateCount;
    int nOscFaces;
    uint64_t lastOscUpdateTimeMs;
    int lastOscFaceFrameCount;
    
    int camW, camH;
    int mskW, mskH;
    int imgW, imgH;
    bool handyBool;
    bool bFullScreen;
    bool bFlipHorizontal;
    bool bDrawFaceDebug;
    bool bDrawVideoDebug;
    ofFpsCounter fpsCounter;
    
    int faceDataSource;
    ofxCvHaarFinder haarFinder;
    void processHaar();
    int haarUpdateCount;
    int nHaarFaces;
    int lastHaarFaceFrameCount;
    float haarW, haarH;
    
    void setupImageBuffers();
    void createFaceComposite();
    void drawVideoDebug();
    void getTranslationAndScale();
    int maskImgDivisor;
    ofFbo maskFbo;
    ofPixels maskFboPixels;
    ofxCvColorImage camImgC3;
    ofxCvGrayscaleImage camImgC1;
    ofxCvGrayscaleImage camImgA1;
    ofxCvGrayscaleImage grayImgC1;
    ofxCvColorImage maskImgC3;
    ofxCvGrayscaleImage maskImgC1;
    ofxCvGrayscaleImage maskInvC1;
    ofxCvGrayscaleImage maskInvBigC1;
    ofxCvGrayscaleImage maskedCamC1;
    ofxCvColorImage compC3;
    ofxCvGrayscaleImage compC1;
    
    ofPixels compFboSmPixels;
    ofFbo compFboSm;
    
    void setupSimulation();
    void drawSimulation();
    void updateSimulation();
    ofMesh PM; // position mesh, white
    ofMesh VM; // velocity mesh for P
    ofMesh UM; // velocity mesh backup
    ofMesh OM; // orientation mesh (direction, magnitude)

    ofFbo fboOutput;
    ofFbo fboDisplay;
    int fboW;
    int fboH;
    int dispW;
    int dispH;
    ofRectangle scaledFboRect;
    ofPixels fboOutputPixels;
    
    void computeHull();
    void drawDebugHull();
    ofxConvexHull convexHull;
    vector<ofPoint> hullInputPoints;
    vector<ofPoint> hull;
    
    float faceTx, faceTy, faceSc;
    float facePercent;
    
    int nHistogramBuckets;
    int *srcHistogram32s;
    int *distr;
    unsigned char *finalLut;
    unsigned char *transform;
    unsigned char *lutLevels;
    void setupHistogramEqualizer();
    void computeHistogram(ofxCvGrayscaleImage &img);
    void applyLUTToImage(ofxCvGrayscaleImage &inputImage, unsigned char *myLut);
    
    void drawHistogram();
    void histdistr (int *hist, int nBins, int *distr);
    void modImageByHistogram (ofxCvGrayscaleImage &inputImg, float amount01);
    
    ofShader gradientShader;
};
