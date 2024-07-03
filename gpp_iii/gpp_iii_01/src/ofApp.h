
#pragma once

#include "ofMain.h"
#include "ofxTensorFlow2.h"
#include "ofxOpenCv.h"
#include "ofxXmlSettings.h"
#include "ofxGui.h"
#include "ofxCv.h"

#include "SkeletonDefs.h"
#include "Skeletonizer.h"
#include "SkeletonTracer.h"
#include "ofxPoissonFill.hpp"


/* genuinely needs to be a power of 2 for poisson */

// uncomment this to use a live camera, otherwise we'll use a video file
// #define USE_LIVE_VIDEO

class ofApp : public ofBaseApp {

	public:
    void setup();
    void update();
    void draw();

    void keyPressed(int key);
    void keyReleased(int key);
    void mouseMoved(int x, int y);
    void mouseDragged(int x, int y, int button);
    void mousePressed(int x, int y, int button);
    void mouseReleased(int x, int y, int button);
    void mouseEntered(int x, int y);
    void mouseExited(int x, int y);
    void windowResized(int w, int h);
    void dragEvent(ofDragInfo dragInfo);
    void gotMessage(ofMessage msg);
    
    bool bFullscreen;

    // neural net input size
    float nnWidth = 1280; // 1920
    float nnHeight = 720; // 1080
    int camWidth = 1920; //1280;
    int camHeight = 1080; //720;

    // input
    #ifdef USE_LIVE_VIDEO
        ofVideoGrabber video;
    #else
        ofVideoPlayer video;
    #endif

    // model
    ofxTF2::Model model;
    std::vector<cppflow::tensor> tfInputs;

    ofImage imgMask;
    ofxCvColorImage videoCvImage;
    ofxCvColorImage processVideoC3;
    unsigned char contrastLookupTable[256];
    void updateContrastPow(); 
    
    
    ofxCvGrayscaleImage imgCvMaskC1;
    ofxCvGrayscaleImage imgCvFilteredMaskC1;
    ofxCvGrayscaleImage contourFinderInput;
    ofxCvGrayscaleImage processBlobsOnlyC1;
    
    bool bReceivedFirstFrame;
    int processFrame;
    int captureW;
    int captureH;
    int processW;
    int processH;

    bool bShowGui;
    bool bShowDebugView;
    bool bShowDiagnosticSkeletons;
    void drawDebugView();
    void drawLiveDisplayPeopleContours(float dx, float dy, float dw);
    void drawDiagnosticSkeletons();
    
    ofxPanel guiVision;
    ofxPanel guiDisplay;
    
    ofxIntSlider currFPS;
    ofxIntSlider sourceW;
    ofxIntSlider sourceH;
    ofxIntSlider sourceX;
    ofxIntSlider sourceY;
    ofxFloatSlider downsampleRatio;
    ofxIntSlider medianW;
    ofxFloatSlider resampDist;
    ofxIntSlider contourKern;
    ofxIntSlider minAgeToKeep;
    ofxIntSlider trackerPersistence;
    ofxIntSlider trackerMaxDist;
    ofxFloatSlider minBlobAreaPct;
    ofxFloatSlider maxBlobAreaPct;
    ofxIntSlider targetAvgVal;
    ofxFloatSlider contrastPow;
    ofxIntSlider maskThreshold;
    ofxIntSlider fboAlpha;
    ofxIntSlider displayGray;
    ofxIntSlider liveContourAlpha;
    ofxIntSlider skeletonFboAlpha;
    ofxIntSlider cullPeriod; 
    ofxIntSlider cullBeyondSize;
    
    ofxToggle bDoMedianFilter;
    ofxToggle bDoContrastStretch;
    ofxToggle bFancyLineSkels;
    ofxToggle bLineEffect;
    ofxToggle bCalcPersonColors;
    ofxToggle bCullLongestRecordings;
    ofxToggle bCullStillestRecordings;
    
    ofxIntSlider maxPlaybacks;
    ofxFloatSlider playbackProbability;
    ofxButton myButton;
    
    void detectPeopleAndComputeMask(); 
    void extractAndTrackContours();
    void processSkeletons(); 
    void cullSkeletonRecordings();
    ofxCv::ContourFinder kmContourFinder;
    
    ofPolyline aContour;
    std::vector<PersonContour> personContours;
    std::vector<int> peopleContourIndices;
    std::vector<PersonSkeletonRecording> skeletonRecordingCollection;
    std::vector<int>labelsOfReplayingSkeletonRecordings;
    void drawSkeletonRecordingData();
    void renderSkeletonRecordings(int whichMethod);
    void updateReplayingSkeletonRecordings();
    float function_TukeyWindow (float x, float a);
    
    cv::Mat  filledContourMat;
    ofImage  filledContourImage;
    Skeletonizer  mySkeletonizer;
    int skeletonBufW;
    int skeletonBufH;
    float skeletonScale;
    
    SkeletonTracer *mySkeletonTracer;
    SkeletonBoneDrawer  *boneDrawer;

    void initializeFbos();
    ofFbo displayFbo;
    ofFbo poissonInputFbo;
    ofFbo skeletonFbo; 
    PoissonFill poissonFiller;
    void calculatePoissonFields();
    void calculatePoissonFields2();
    void drawPoissonDisplay();
    void drawPoissonDisplay2(); 
    void drawFancySkeletonFbo(); 
    ofColor averageVideoColor;
    void huntForBlendFunc(int period, int defaultSid, int defaultDid);
    
    float debugItemW;
    float displayX;
    float displayY;
    float displayScale;
    
    
    void rgbToHsv(float r, float g, float b, float& h, float& s, float& v);
    void hsvToRgb(float h, float s, float v, float& r, float& g, float& b);
};
