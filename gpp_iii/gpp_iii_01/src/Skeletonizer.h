#pragma once

#include "ofMain.h"
#include "ofxOpenCv.h"
#include "ofxCv.h"
#include "ofxGui.h"


class Skeletonizer {
	
	public:
	
		void	initialize(int w, int h);
        void    computeSkeleton2024(cv::Mat &blobMat,
                    int roiMinX, int roiMaxX, int roiMinY, int roiMaxY, int nBlobs);
		void	computeSkeletonImageFromBlobs(cv::Mat &filledContourMat,
											  vector<vector<cv::Point>> &contours,
											  int nCurrentPosCon, int contourThickness,
											  int w, int h);
		void	skeletonize();
		void	clear();
		void	draw(float dx,float dy, float dw,float dh);
	
		inline int thin (int pass, unsigned char *table);
		unsigned char* inputBuff;
		unsigned char* tmpBuffer;
		float	skeletonizationDuration;

		int		roiMinX, roiMaxX;
		int		roiMinY, roiMaxY;
		int		skeletonBufW;
		int		skeletonBufH;
		int		nCurrentPositiveContours;

		unsigned char* skeletonBuffer;
		ofImage	skeletonImage;
	
};


