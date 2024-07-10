
#pragma once

#include "ofMain.h"
#include "ofxXmlSettings.h"
#include "ofxTensorFlow2.h"
#include "ofxOpenCv.h"
#include "ofxGui.h"
#include "ofxCv.h"

#include "SkeletonDefs.h"
#include "Skeletonizer.h"
#include "SkeletonTracer.h"
#include "ofxPoissonFill.hpp"


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

    ofVideoGrabber  videoGrabber;
    ofVideoPlayer   videoPlayer;

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
    bool bPausePlayback;
    int processFrame;
    int captureW;
    int captureH;
    
    bool bComputeMiniDisplay;
    void updateMiniDisplay();
    void drawMiniDisplayOverlay();
    ofxCvGrayscaleImage miniDisplayC1;
    ofxCvGrayscaleImage miniDisplayRemappedC1;
    int miniDisplayW;
    int miniDisplayH;
    cv::Mat miniDisplayLut;
    

    bool bShowGui;
    bool bShowDebugView;
    bool bShowDiagnosticSkeletons;
    uint64_t  lastInteractionTimeMs;
    void updateDebugView();
    void drawDebugView();
    void drawLiveDisplayPeopleContours(float dx, float dy, float dw);
    void drawDiagnosticSkeletons();
    
    ofxPanel guiVision;
    ofxPanel guiDisplay;
    
    int whichVideoType;
    ofxIntSlider whichVT; // 0 videofile, 1 camera
    ofxIntSlider whichCameraID;
    ofxIntSlider currFPS;
    ofxIntSlider procW;
    ofxIntSlider procH;
    ofxIntSlider sourceW;
    ofxIntSlider sourceH;
    ofxIntSlider sourceX;
    ofxIntSlider sourceY;
    ofxFloatSlider downsampleRatio;
    ofxIntSlider batchSize; 
    ofxIntSlider medianW;
    ofxFloatSlider resampDist;
    ofxIntSlider contourKern;
    ofxIntSlider minAgeToKeep;
    ofxIntSlider trackerPersistence;
    ofxIntSlider trackerMaxDist;
    ofxFloatSlider minBlobAreaPct;
    ofxFloatSlider maxBlobAreaPct;
    ofxFloatSlider contrastPow;
    ofxFloatSlider leastAcceptableMovement;
    
    ofxFloatSlider fancySkelTh;
    ofxFloatSlider strokeWeightScaleMix;
    ofxFloatSlider miniDisplayAlpha;
    ofxFloatSlider miniDisplayPowLo;
    ofxFloatSlider miniDisplayPowHi;
    ofxFloatSlider miniDisplayPowFreq;
    ofxFloatSlider miniDisplayWigglePow;
    ofxFloatSlider skeletonFboAlphaFreq;
    ofxFloatSlider skeletonFboAlphaSigA;
    ofxFloatSlider skeletonFboAlphaSigB;
    ofxFloatSlider colorSwitchFreq;
    
    ofxIntSlider targetAvgVal;
    ofxIntSlider maskThreshold;
    ofxIntSlider fboAlpha;
    ofxIntSlider displayGray;
    ofxIntSlider liveContourAlpha;
    ofxIntSlider cullPeriod;
    ofxIntSlider whichPalette;
    
    ofxToggle bShowLiveSkeletons; 
    ofxToggle bShowRecordedSkeletons;
    ofxToggle bFullscreenAtStart;
    ofxToggle bDoMedianFilter;
    ofxToggle bDoContrastStretch;
    ofxToggle bFancyLineSkels;
    ofxToggle bCalcPersonColors;
    ofxToggle bCullLongestRecordings;
    ofxToggle bCullStillestRecordings;
    ofxToggle bCompositeMiniDisplay;
    ofxToggle bLoadRecordingsOnStart; 
    
    ofxIntSlider maxPlaybacks;
    ofxFloatSlider playbackProbability;
    
    void detectPeopleAndComputeMask(); 
    void extractAndTrackContours();
    void processSkeletons();
    void cullSkeletonRecordings();
    
    ofxCv::ContourFinder kmContourFinder;
    
    ofPolyline aContour;
    std::vector<PersonContour> personContours;
    std::vector<int> peopleContourIndices;
    std::vector<PersonSkeletonRecording> skeletonRecordingCollection;
    int nReplayingSkeletonRecordings;
    void drawSkeletonRecordingData();
    void renderSkeletonRecordings(int whichMethod);
    void updateReplayingSkeletonRecordings();
    float function_TukeyWindow (float x, float a);
    void importSkeletonRecordingCollectionStatic(const std::string& filename);
    void exportSkeletonRecordingCollectionStatic(const std::string& filename);
    ofVec2f getBestRecordingLocation();
    ofxXmlSettings xml;
    
    cv::Mat  filledContourMat;
    ofImage  filledContourImage;
    Skeletonizer  mySkeletonizer;
    int processW;
    int processH;
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
    void calculatePoissonFields2();
    void drawPoissonDisplay2(); 
    void drawFancySkeletonFbo(); 
    ofColor averageVideoColor;
    void huntForBlendFunc(int period, int defaultSid, int defaultDid);
    
    float debugItemW;
    float displayX;
    float displayY;
    float displayScale;
    
    float doubleExponentialSigmoid (float x, float a);
    float adjustableCenterDoubleExponentialSigmoid (float x, float a, float b);
    void rgbToHsv(float r, float g, float b, float& h, float& s, float& v);
    void hsvToRgb(float h, float s, float v, float& r, float& g, float& b);
    
    Recording *recordings; // Pointer to an array of Recording objects
    void clearRecordingsStatic();
    void clearStaticRecording(int i);
    void bubbleSortRecordingsByLabel();
    Recording tmpRecording; 
    
    float fboAlphaFreq; 
    float miniDisplayAlphaFreq;
    float hsvModFrq;
    float hsvModModFrq;
    float feedbackTwiddleFrq; // for poisson

    bool bColorState;
};
