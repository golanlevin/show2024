#pragma once

#include "ofMain.h"
#include "ofxOsc.h"

#define OSC_RX_PORT 3334
#define OSC_TX_PORT 12000
#define N_FACE_LANDMARKS 478
#define N_FACE_METRICS 52


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

        void setupCamera();
        ofVideoGrabber vidGrabber;
        
        void setupOSC();
        void processOSC();
        void drawDebugOSC();
        void toggleOSCSource();
		ofxOscReceiver oscReceiver;
        ofxOscSender oscSender;
		vector<Face> faces;
        float *faceMetrics;
        int oscUpdateCount;
        int nOscFaces;
        
        int camW;
        int camH;
        ofFpsCounter fpsCounter;
};
