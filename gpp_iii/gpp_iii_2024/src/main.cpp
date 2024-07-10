/*
 * Example made with love by Natxopedreira 2021
 * https://github.com/natxopedreira
 * Updated by members of the ZKM | Hertz-Lab 2021
 */

#include "ofMain.h"
#include "ofApp.h"

//========================================================================
int main() {
	ofGLWindowSettings settings;
    // settings.setGLVersion(3, 2); // Can't use
    settings.setGLVersion(2, 1); // Set to OpenGL version 2.1 for fixed-function pipeline
	settings.setSize(1600, 1024);
	settings.windowMode = OF_WINDOW;
	ofCreateWindow(settings);
	ofRunApp(new ofApp());
}
