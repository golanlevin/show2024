#pragma once

#include "ofMain.h"
#include "ofxOsc.h"
#include "ofxConvexHull.h"
#include "ofxOpenCv.h"
#include "ofxCvHaarFinder.h"
#include "ofxGui.h"

#include "ofAppGLFWWindow.h"
#include "GLFW/glfw3.h"

#include "Stroke.h"

#define OSC_RX_PORT 3334
#define OSC_TX_PORT 12000
#define N_FACE_LANDMARKS 478
#define N_FACE_METRICS 52

#define FACE_FROM_OSC 1
#define FACE_FROM_HAAR 2
#define MIDDLE_GRAY 0

#define N_MOLASSOGRAPH_PARTICLES 20000
#define DISPLAY_GUI_DUR_S 60.0
#define PAUSE_DUR_S 60.0
#define WAIT_FOR_OSC_FACE_DUR 3.0

#define MAX_GRAD_STRENGTH 0.001
#define MAX_WIND_SPEED 6
#define MIN_WIND_SPEED 2
#define MIN_GAMMA   1.5
#define MAX_GAMMA   3.0
#define MIN_POINT_SIZE  2.0
#define MAX_POINT_SIZE  3.0
#define MIN_FACE_PCT 0.500
#define MAX_FACE_PCT 0.600
#define MAX_SPARKLE_PROB 0.1

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
    ofVideoGrabber videoGrabber;
    ofVideoPlayer  videoPlayer;
    
    void setupOSC();
    void acquireOscData();
    void drawDebugOSC();
    void toggleOSCSource();
    void incorporateFaceMetrics(); 
    ofxOscReceiver oscReceiver;
    ofxOscSender oscSender;
    vector<Face> faces;
    float *faceMetrics;
    int oscUpdateCount;
    int nOscFaces;
    uint64_t lastOscUpdateTimeMs;
    int lastOscFaceFrameCount;
    int nFramesSinceCameraFace;
    float lastOscCamFaceTimeSec;
    
    int camW, camH;
    int mskW, mskH;
    int imgW, imgH;
    bool bFullScreen;
    bool bFlipHorizontal;
    bool bDrawVideoDebug;
    bool bToggledOscSource;
    ofFpsCounter fpsCounter;
    float fpsBlur;
    
    int faceDataSource;
    ofxCvHaarFinder haarFinder;
    void doHaarDetection();
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
    ofxCvColorImage vidImgC3; 
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
     
    float *verticalSum;
    void computeVerticalSum();
    void updateWindOrientation();
    float *randomFloats01A;
    float *randomFloats01B;
    float *randomFloats01G;
    float myRandomGaussian();
    
    ofPixels compFboSmPixels;
    ofFbo compFboSm;
    
    void setupSimulation();
    void drawSimulation();
    void updateSimulation();
    ofMesh PM; // position mesh, white
    ofMesh VM; // velocity mesh for P
    ofMesh UM; // velocity mesh backup

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
    ofRectangle faceBbox;
    
    float faceTx, faceTy, faceSc;
    float facePercent;
    
    int nHistogramBuckets;
    int *srcHistogram32s;
    int *distr;
    unsigned char *finalLut;
    unsigned char *transform;
    unsigned char *lutLevels;
    float *gammaArray;
    void setupHistogramEqualizer();
    void computeHistogram(ofxCvGrayscaleImage &img);
    void applyLUTToImage(ofxCvGrayscaleImage &inputImage, unsigned char *myLut);
    
    void drawHistogram();
    void histdistr (int *hist, int nBins, int *distr);
    void modImageByHistogram (ofxCvGrayscaleImage &inputImg, float amount01);
    
    ofShader gradientShader;
    
    
    ofxPanel gui;
    float guiStartTime;
    float pauseStartTime;
    bool bHideGui;
    void updateGui();
    ofxFloatSlider fpsSlider;
    ofxToggle bUsingLiveCamera;
    ofxToggle bSimPaused;
    ofxToggle bPlayerPaused;
    ofxFloatSlider particleFboAlpha;
    ofxIntSlider haarNeigbors;
    ofxFloatSlider haarScale;
    ofxFloatSlider haarRectBlur;
    ofxFloatSlider gamma;
    ofxFloatSlider faceDisplayPct;
    ofxToggle bUseMetrics;
    ofxFloatSlider lightingCentroid01;
    ofxFloatSlider windRangeDeg;
    ofxFloatSlider windDitherDeg;
    ofxFloatSlider windSpeedAvg;
    ofxFloatSlider windSpeedStd;
    ofxFloatSlider gradStrength; 
    ofxFloatSlider eddyStrength;
    ofxFloatSlider pointSize;
    ofxFloatSlider sparkleProb;
    ofxToggle bShowMicroOSCFace;
    ofxToggle bShowFaceMetrics;
    
    
};
