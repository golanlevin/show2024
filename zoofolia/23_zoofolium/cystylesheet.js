

//==========================================================
// STYLE SHEET
// Generates the parameters that describe the piece.
/*

  /$$$$$$  /$$$$$$$$ /$$     /$$ /$$       /$$$$$$$$
 /$$__  $$|__  $$__/|  $$   /$$/| $$      | $$_____/
| $$  \__/   | $$    \  $$ /$$/ | $$      | $$      
|  $$$$$$    | $$     \  $$$$/  | $$      | $$$$$   
 \____  $$   | $$      \  $$/   | $$      | $$__/   
 /$$  \ $$   | $$       | $$    | $$      | $$      
|  $$$$$$/   | $$       | $$    | $$$$$$$$| $$$$$$$$
 \______/    |__/       |__/    |________/|________/
												   
*/  


//---------------------------------------------
class CyStyleSheet {

	constructor(mom) {
		// Sections are ordered below due to possible dependencies.
		// myRandomReset(THE_CURRENT_HASH);

		let nestedLevel = mom.nestedLevel; 

		//========================================================
		//========================================================
		// CALCULATE FEATURES FOR ARTBLOCKS' calculateFeatures()
		// Cynical extraction of a small handful of art parameters.
		// Requires: getWeightedOption(), myRandom01(), getSkewedGaussian(), 
		// myRandomA(), myRandomAB(), map, constrain
		//
		// MEMBRANE STYLE
		let membraneStyleProbabilities = [
			[ 0,  2],	/* Nothing inside, just empty space. */
			[ 1,  9], 	/* inner and outer loops, connected by all bands */
			[ 2, 11], 	/* cells: inner and outer loops, connected by bands, skipping 2 */
			[ 3, 15], 	/* inner and outer loops, bands skip 12; dimples. nLoops MUST be odd */
			[ 4, 12], 	/* irregularly dashed concentric loops */
			[ 5,  5], 	/* dense tapering bands, no loops */
			[ 6,  6], 	/* bumpy special mode */
			[ 7, 10], 	/* inner and outer loops, connected by all bands plus intermediate bands, dashed */
			[ 8,  5], 	/* inner and outer loops, connected by all bands plus intermediate bands, tapered */
			[ 9,  8], 	/* inner and outer loops, connected by all bands, and doubled bands */
			[10,  8], 	/* irregular cells (modified #2) */
			[11, 10], 	/* irregular #7 */
			[12, 10], 	/* diagonal stripes */
		];
		this.membrane_STYLE_ID = getWeightedOption(membraneStyleProbabilities);

	
		this.THE_SCHEMA = 100; // BOGUS
		if (mom.nestedLevel == 0){
			this.THE_SCHEMA = 106; // 104,105,106 are all good. // getWeightedOption([[104, 6], [105, 4]]);
		} else {
			// Good for elongated: 100
		
			this.THE_SCHEMA = getWeightedOption([[100,5], [101,5], [102,5], [103,5], [104,5], [105,5], [108,5], [206, 5], [207, 2] ]);
			while(this.THE_SCHEMA == mom.parentSchema){
				this.THE_SCHEMA = getWeightedOption([[100,5], [101,5], [102,5], [103,5], [104,5], [105,5], [108,5], [206, 5], [207, 2] ]);
			}

			if (this.THE_SCHEMA == 103){
				while (	(this.membrane_STYLE_ID == 0) || (this.membrane_STYLE_ID == 5) ||
						(this.membrane_STYLE_ID == 8) || (this.membrane_STYLE_ID == 12)){
					this.membrane_STYLE_ID = getWeightedOption(membraneStyleProbabilities);
				}
			}
		}
		
		
		// PAPER STYLE (light, dark)
		this.bUseLighterPaper = (myRandom01() < 0.95);


		// N_MEMBRANE_LAYERS
		this.minOSF = 0.90; 
		this.maxOSF = 1.00;
		this.ORGANISM_SCALE_FACTOR = getSkewedGaussian(this.minOSF, this.maxOSF, 1.0, 0.8);
		this.cachedFieldGamma = getSkewedGaussian(1.5, 4.5, 1.0, -0.75);
		let maxNLayers = (this.ORGANISM_SCALE_FACTOR < 0.9) ? 5 : (this.ORGANISM_SCALE_FACTOR < 1.0) ? 6.2 : 7.0; 
		this.nMembraneLayers = ~~(Math.round(map(Math.pow(myRandomA(1.0), 1.375),0,1,  2.4,maxNLayers))); 
		if (this.cachedFieldGamma > 3.00){ this.nMembraneLayers--; }
		if (this.cachedFieldGamma > 3.90){ this.nMembraneLayers--; }
		if (this.cachedFieldGamma > 4.50){ this.nMembraneLayers--; }
		if ((this.membrane_STYLE_ID == 3) && (Math.abs(this.nMembraneLayers)%2 == 1)) { 
			this.nMembraneLayers = min(2, this.nMembraneLayers--); 
		}

		this.finalSquircularity = 0.5; 
		if (mom.nestedLevel == 0){
			this.finalSquircularity = myRandomAB(0.25, 0.5); 
		}


		if (((this.membrane_STYLE_ID == 2) || (this.membrane_STYLE_ID == 3) || (this.membrane_STYLE_ID == 10)) && (this.nMembraneLayers == 1)) { 
			if (this.cachedFieldGamma > 3.25){
				this.nMembraneLayers = 0;
			} else {
				this.nMembraneLayers = 2; 
			}
		}
		if (this.THE_SCHEMA != 103){
			if (myRandomA(1.0) < 0.012){ 
				this.nMembraneLayers = 0; 
			}
		} else if (this.THE_SCHEMA == 103) {
			this.nMembraneLayers = Math.max(this.nMembraneLayers, 2); 
		}
		if (this.THE_SCHEMA == 105){
			if (myRandom01() < 0.20){ 
				this.nMembraneLayers = Math.min(7, this.nMembraneLayers+1);
			}
			this.nMembraneLayers = Math.max(this.nMembraneLayers, 2); 
		}
		if (this.THE_SCHEMA == 205){
			if (myRandom01() < 0.5){ 
				this.nMembraneLayers = Math.min(7, this.nMembraneLayers+1);
			}
		}
		if (this.THE_SCHEMA == 206){
			this.nMembraneLayers += 2; 
		}
		this.nMembraneLayers = max(0, this.nMembraneLayers); 
		

		// Final determination of nMembraneLayers depends on some amorphous params
		this.amorphousMaskWrinkle = 1.05;
		this.amorphousContourNoiseFalloff = 0.3;
		this.edgeRandomnessChoice = myRandom01(); 
		let schema105noiseStruct = getWeightedOption([[[0.5,0.250],70], [[2.5,0.035],20], [[5.0,0.065],10]]);
		let bSchema105noiseChoice = (myRandom01() < 0.75);
		if ((this.THE_SCHEMA == 100) || (this.THE_SCHEMA == 102)) { 
			if (this.edgeRandomnessChoice < 0.30){ // 30%: odd and smooth
				this.amorphousMaskWrinkle = myRandomAB(2.00, 2.50);
				this.amorphousContourNoiseFalloff = myRandomAB(0.10, 0.25);
			} else if (this.edgeRandomnessChoice < 0.55){ // 25%: wrinkly oval
				this.amorphousMaskWrinkle = myRandomAB(4.00, 7.00);
				this.amorphousContourNoiseFalloff = myRandomAB(0.50, 0.55);
			} else if (this.edgeRandomnessChoice < 0.75){ // 20%: ovoid, very smooth
				this.amorphousMaskWrinkle = myRandomAB(0.50, 0.75);
			} else if (this.edgeRandomnessChoice < 0.90){ // 15%: rectangular
				this.amorphousMaskWrinkle = myRandomAB(0.70, 0.90);
			} else { // 10%: regular
				this.amorphousMaskWrinkle = myRandomAB(1.00, 1.10);
			}
		} else if (this.THE_SCHEMA == 105){
			if (bSchema105noiseChoice){
				this.amorphousMaskWrinkle = schema105noiseStruct[0]*myRandomAB(0.9, 1.0);
			}
			this.amorphousContourNoiseFalloff = myRandomAB(0.40, 0.51);
		} else if (this.THE_SCHEMA == 108){
			let noistruct = getWeightedOption([  [[0.5,0.55],30],    [[1.5,0.35],40],    [[2.7,0.10],30] ]);
			this.amorphousMaskWrinkle = noistruct[0]; 
			this.amorphousContourNoiseFalloff = noistruct[1];
		}
		if ((this.amorphousMaskWrinkle >= 2.25) || (this.amorphousContourNoiseFalloff > 0.5)){
			this.nMembraneLayers += myRandomInt(1,2);
			this.nMembraneLayers = constrain(this.nMembraneLayers, 2, 8); 
		}


		//========================================================
		//========================================================
		/*
		noiseSeed(THE_CURRENT_NOISE_SEED); 
		MAX_SPEED = REST_L * 0.3125; 
		MAX_SPEED2 = MAX_SPEED * MAX_SPEED; 
		MIN_SPRING_DIST = REST_L / 128.0; 
		MIN_SPRING_DIST2 = (MIN_SPRING_DIST*MIN_SPRING_DIST); 
		*/

		//---------------------------------------
		// 0. Membrane settings

		this.radialBandWeights = [0,0];
		switch(this.membrane_STYLE_ID){
			case 11: 
				this.radialBandWeights = getWeightedOption ([
					[[WEIGHT_0,WEIGHT_0],75], 
					[[WEIGHT_1,WEIGHT_0],10], 
					[[WEIGHT_0,WEIGHT_1],15] ]); 
				break;
			case 9: 
				this.radialBandWeights = getWeightedOption ([
					[[WEIGHT_0,WEIGHT_0],75], 
					[[WEIGHT_1,WEIGHT_0],14], 
					[[WEIGHT_1,WEIGHT_1],10],
					[[WEIGHT_2,WEIGHT_1], 1] ]); 
				break;
			case 8: 
				this.radialBandWeights = getWeightedOption ([
					[[WEIGHT_0,WEIGHT_0],10], 
					[[WEIGHT_1,WEIGHT_0],45], 
					[[WEIGHT_2,WEIGHT_1], 2],
					[[WEIGHT_1,WEIGHT_1],40],
					[[WEIGHT_2,WEIGHT_2], 3] ]); 
				break;
			case 7: 
				this.radialBandWeights = getWeightedOption ([
					[[WEIGHT_0,WEIGHT_0],80], 
					[[WEIGHT_0,WEIGHT_1], 4], 
					[[WEIGHT_1,WEIGHT_0],10],
					[[WEIGHT_1,WEIGHT_1], 6] ]); 
				break;
			case 5: 
				this.radialBandWeights = getWeightedOption ([
					[[WEIGHT_0,WEIGHT_0],20], 
					[[WEIGHT_1,WEIGHT_0],75], 
					[[WEIGHT_2,WEIGHT_0], 5] ]); 
				break;
			default: 
				this.radialBandWeights = getWeightedOption ([
					[[WEIGHT_0,WEIGHT_0],80], 
					[[WEIGHT_1,WEIGHT_0],20] ]); 
				break;
		}

		this.bUseVertexShadedLines = true; 
		this.greedyAddTimeout = 3600; // Frames; about 60 seconds.
		this.growthUpdateCycleLength = 2;
		this.temperatureCoolingRate = (15.0/16.0); // use 0.0 for immediate cooling

		this.addStructureFrameCycle = 4; 
		this.maxNProgressivelyAddedBlobs = 80; 
		this.addStructureFrameDuration = 1000; 
		this.schemaOccupancyThreshold = 0.8;
		this.bEnableProgressivelyAddedLoopsOrWheels = false;
		this.progressivelyAddType = -1; 
		this.blobTargetLengthNudgeFactor = myRandomAB(0.75,1.25); 
		this.interiorWheelTargetLengthNudgeFactor = 1.0; 
		this.wheelTargetLengthNudgeFactor = 2.0; 
		this.minDistInRestLengths = 1.5; 
		this.minOccupancyForProgressivelyAddedBlobs = 0.25;
		this.proportionOfParticlesToAddToBlobs = 0.20;
		this.blobInteriorExteriorBalance = 0.5; 
		this.progressivelyAddedBlobStylePair = [0,0];
		this.wheelStylePairMode = WHEEL_PAIR_STYLE_MODE_PARTY;
		this.bEnableExternalRingsOrHairs = true;
		this.flockConfig = getWeightedOption([ [0,70], [1,15], [2,15] ]);
 
		if ((this.THE_SCHEMA >= 100) && (this.THE_SCHEMA < 200)){
			;
		} else if ((this.THE_SCHEMA >= 200) && (this.THE_SCHEMA < 300)){
			this.edgeNoiseScale = 400; // 400-200; 400 default; // can be randomized
			this.edgeNoiseAmp = 50;
		} else if ((this.THE_SCHEMA >= 300) && (this.THE_SCHEMA < 400)){
			this.edgeNoiseScale = 300; 
			this.edgeNoiseAmp = 0.0; 
		}

		//---------------------------------------
		// RADIAL & AMORPHOUS CONTOUR Parameters
		this.bUseAmorphousCellContour = true; 
		


		this.amorphousMaskInverseSpeed2 = 20000;
		this.amorphousMaskInverseSpeed = getSkewedGaussian(3000,10000, 1.0, -1.5);
		this.amorphousMaskRotation = radians(getSkewedGaussian(-1.5, 1.5, 1.0, 0.0)); 
		this.amorphousMaskNoiseAmountCategory = getWeightedOption([[1,80],[2,20]]);

		let bumpShaperOption = getWeightedOption([ [[-1,1],45], [[1,-1],10], [[1,1],15], [[0,2],30] ]);
		this.amorphousBumpShaperA = bumpShaperOption[0]; 
		this.amorphousBumpShaperB = bumpShaperOption[1];

		this.amorphousMaskWaveFrequency = 0;
		this.amorphousMaskWaveAmplitude = 0;

		if (this.THE_SCHEMA == 103) { 
			this.amorphousMaskNoiseAmountCategory = 1;
			this.amorphousMaskWaveFrequency = getWeightedOption([ [4,25],[6,20],[8,20],[10,25],[12,8],[14,2] ]);
			this.amorphousMaskWaveAmplitude = getWeightedOption([ [0.000,17],[0.002,30],[0.005,30],[0.010,20],[0.015,3] ]); 
		}
		switch(this.amorphousMaskNoiseAmountCategory){
			case 1: this.amorphousMaskNoiseAmount = getSkewedGaussian(0.04, 0.12, 1.0, -0.65); break; /* regular */
			case 2: this.amorphousMaskNoiseAmount = getSkewedGaussian(0.12, 0.20, 1.0, 0.0); break; /* amoebic */
		}

		let amorphousMaskAspectRatioCategories = [[1,12],[2,24],[3,64]];
		this.amorphousMaskAspectRatioCategory = getWeightedOption(amorphousMaskAspectRatioCategories);
		if (this.THE_SCHEMA == 103){ 
			while (this.amorphousMaskAspectRatioCategory == 3){
				this.amorphousMaskAspectRatioCategory = getWeightedOption(amorphousMaskAspectRatioCategories);
			}
		}
		switch (this.amorphousMaskAspectRatioCategory){
			case 1: this.amorphousMaskAspectRatio =      getSkewedGaussian(0.95,1.05, 1.0,0.0); break;  /* circular */
			case 2: this.amorphousMaskAspectRatio =      getSkewedGaussian(0.65,0.98, 0.9,0.4); break;  /* wide */
			case 3: this.amorphousMaskAspectRatio = (1.0/getSkewedGaussian(0.65,0.92, 0.9,0.4)); break; /* tall */
		}

		this.amorphousMaskSquircPowX = 1.0; 
		this.amorphousMaskSquircPowY = 1.0;
		if (this.amorphousMaskNoiseAmountCategory == 1){
			switch (this.amorphousMaskAspectRatioCategory){
				case 1: /* circular */
					this.amorphousMaskSquircPowX = getSkewedGaussian(0.8,1.1, 1.5,-0.5); 
					this.amorphousMaskSquircPowY = getSkewedGaussian(0.8,1.1, 1.5,-0.5); 
					break;
				case 2: /* wide */
					this.amorphousMaskSquircPowX = (121.0/128.0); 
					this.amorphousMaskSquircPowY = (121.0/128.0); 
					if(myRandomA(1.0) < 0.666){ this.amorphousMaskSquircPowX = myRandomAB(0.7, 0.9);}
					if(myRandomA(1.0) < 0.002){ this.amorphousMaskSquircPowY = myRandomAB(1.0, 1.2);}
					break;
				case 3: /* tall */
					this.amorphousMaskSquircPowX = (121.0/128.0); 
					this.amorphousMaskSquircPowY = (121.0/128.0); 
					if(myRandomA(1.0) < 0.80){ this.amorphousMaskSquircPowY = getSkewedGaussian(0.5,0.9, 1.5,0.5); }
					if(myRandomA(1.0) < 0.04){ this.amorphousMaskSquircPowX = myRandomAB(1.2, 1.5); }
					break;
			}
		}

		if ((this.THE_SCHEMA == 100) || (this.THE_SCHEMA == 102)) { 
			this.amorphousMaskInverseSpeed = 10000;
			this.amorphousMaskInverseSpeed2 = 4000000;
			if (this.edgeRandomnessChoice < 0.30){ //30%: odd and smooth
				this.amorphousMaskNoiseAmount = myRandomAB(0.10, 0.20);
				this.amorphousMaskRotation *= 1.25; 
			} else if (this.edgeRandomnessChoice < 0.55){ // 25%: wrinkly oval
				this.amorphousMaskInverseSpeed = 8000;
				this.amorphousMaskInverseSpeed2 = 800000;
				this.amorphousMaskRotation = 0; 
				this.amorphousMaskNoiseAmount = myRandomAB(0.04, 0.06); 
				switch (this.amorphousMaskAspectRatioCategory){
					case 2: this.amorphousMaskAspectRatio -= (7.0/128.0); break;  /* wide */
					case 3: this.amorphousMaskAspectRatio += (7.0/128.0); break; /* tall */
				}
			} else if (this.edgeRandomnessChoice < 0.75){ // 20%: ovoid, very smooth
				this.amorphousMaskNoiseAmount = myRandomAB(0.22, 0.32); 
			} else if (this.edgeRandomnessChoice < 0.90){ // 15%: rectangular
				this.amorphousMaskRotation = 0; 
				this.amorphousMaskNoiseAmount = myRandomAB(0.10, 0.15); 
				this.amorphousMaskAspectRatio = myRandomAB(0.4, 0.618); 
				this.amorphousMaskSquircPowX = myRandomAB(0.38, 0.48);
				this.amorphousMaskSquircPowY = this.amorphousMaskSquircPowX;
			} else { // 10%: regular
				this.amorphousMaskNoiseAmount = myRandomAB(0.08, 0.14);
			}
		} else if (this.THE_SCHEMA == 205){
			let edgeNoiseStruct = getWeightedOption([ [[20,15],5], [[40,15],25], [[80,30],40], [[120,40],25], [[320,50],5] ]);
			this.edgeNoiseScale = edgeNoiseStruct[0]; 
			this.edgeNoiseAmp   = edgeNoiseStruct[1]; 
		} else if (this.THE_SCHEMA == 105){
			if (bSchema105noiseChoice){ this.amorphousMaskNoiseAmount = schema105noiseStruct[1]*myRandomAB(0.9, 1.0);}
			this.amorphousMaskInverseSpeed2 = myRandomAB(40000,60000) * ((myRandom01() < 0.5)? -1:1);
			this.amorphousMaskInverseSpeed = 100000 * myRandomAB(0.10, 0.35);
		} 

		//---------------------------------------
		// Parameters for the implicit sites and overall contour
		this.bIsSymmetrical = (myRandomA(1.0) < 0.13); 
		if (this.bUseAmorphousCellContour){this.bIsSymmetrical = false;}
		this.massRandomness = (this.bIsSymmetrical) ? 0.01 : myRandomAB(0.05, 0.20); 
			
		let cfg = this.cachedFieldGamma;
		this.siteWaveAmplitude = (cfg < 2.0) ? map(cfg,1.5,2.0, 0.40,0.30) : map(cfg,2.0,4.0, 0.30,0.20); 
		this.siteWaveSpeed = 800.0;
		if (this.cachedFieldGamma < 2.0){
			this.siteWaveSpeed = map(cfg, 1.5,2.0, 1000,800); 
		} else {
			this.siteWaveSpeed = map(cfg, 2.0,4.0, 800,700); 
		}

		this.implicitConvergeIterations = 4; 
		this.implicitContourTwistStdv = 0.25; 
		this.implicitContourBloatStdv = 0.08; 
		this.implicitContourBendy = 0.15; 
		this.implicitBaseThresholdBoost = 0.0;
		this.implicitContourBendxStdv = 0.20; // 0.54; //0.20; // FIX TODO TONIGHT 0.927710843373494
		switch(this.THE_SCHEMA){
			case 204: 
				this.implicitBaseThresholdBoost = -0.02;
				this.implicitContourBendxStdv = myRandomAB(0.20, 0.33); 
				this.siteWaveAmplitude *= 0.5; 
				break;
			case 209: 
				this.implicitContourBendxStdv = myRandomAB(0.20, 0.33); 
				this.siteWaveAmplitude *= 0.5;
				break;
			case 205: case 206: 
				this.implicitContourBendxStdv = myRandomAB(0.20, 0.55);
				this.siteWaveAmplitude *= 0.5; 
				break;
			case 207:
				this.implicitContourBendxStdv = myRandomAB(0.20, 0.60); 
				this.siteWaveAmplitude *= 0.5; 
				break;
			case 208: 
				this.implicitContourBendxStdv = myRandomAB(0.20, 0.75); 
				this.implicitBaseThresholdBoost = -0.05;
				break;
		}
		if (this.implicitContourBendxStdv > 0.5){
			this.implicitConvergeIterations = 5; 
		}


		// STRUCTURE_TYPE_OFFSETS (11) -----------------------------
		// Parameters for theOffsetCurveStructure
		let randOcA = myRandomA(1.0);
		let randOcB = myRandomA(1.0);
		let randOcC = myRandomA(1.0); 
		let randOcD = myRandomA(1.0);
		let randOcE = myRandomA(1.0);
		this.bDoOffsetRings = (this.bUseAmorphousCellContour) ? (randOcA < 0.90) : (randOcA < 0.95);

		this.membraneInnerWiggleAmp = getWeightedOption([[0.00,75] , [0.07,25]]); 
		this.membraneInnerWiggleFrq = myRandomInt(50,60); 
		this.membrane3variant = getWeightedOption([[0,55],[1,15],[2,15],[3,15]]); 
		this.membrane3pointSkip = getWeightedOption([  [4,5],[6,15],[7,10],[8,200],[9,220],[12,500],[18,30],[24,5],[36,5],[54,5],[72,5] ]); 

		this.bAddMiniNuclei = false;
		if (this.membrane_STYLE_ID == 1) {
			this.bAddMiniNuclei = (myRandom01() < 0.11);
		} else if ((this.membrane_STYLE_ID == 2) || (this.membrane_STYLE_ID == 10)){
			this.bAddMiniNuclei = (myRandom01() < 0.20);
		}
		
		if (this.membrane_STYLE_ID == 4) {this.bDoOffsetRings = false;}
		this.bGappyOffsetCurves = (randOcB < 0.925); // STYLE_ID;


		this.nOffsetRings = 0; 
		let minNOffR = 8; 
		let maxNOffR = 16;
		if (this.bDoOffsetRings){
			let nr = Math.pow(randOcC, 1.3);
			if (this.bGappyOffsetCurves){
				nr = map(nr, 0,1, minNOffR,maxNOffR) / (map(this.ORGANISM_SCALE_FACTOR, this.minOSF,this.maxOSF, 0.75,1.5));
				nr = constrain(nr, minNOffR,maxNOffR); 
			} else {
				nr = constrain(map(nr, 0,1, 3,10), 3,10); 
			}
			this.nOffsetRings = int(Math.round(nr)); 
		}
		this.offsetRingSpacing = map(Math.pow(randOcD, map(this.nOffsetRings,minNOffR,maxNOffR, 1,4)), 0,1, 2,4); //PROPERTY_B; 
		this.firstOffsetRingSpacing = 0.5 + 
			((this.nOffsetRings <= 4) || (this.nOffsetRings >= 8 && this.offsetRingSpacing > 4.0)) ? 1.5 : 
			((randOcE < 0.666) ? 1.5 : 2.5);
		if (this.membrane_STYLE_ID == 9){ this.firstOffsetRingSpacing = 1.5; }



		if (this.nOffsetRings <= 0){ this.bDoOffsetRings = false; } // paranoid
		if (mom.nestedLevel > 0){
			this.bDoOffsetRings = false;
		}





		// STRUCTURE_TYPE_MEMBRANE ---------------------------------
		this.doMembraneExtraInnerMembrane = (myRandomA(1.0) < 0.666); 
		this.membraneExtraInnerMembraneSeparation = myRandomAB(0.3, 0.5); 

		let stylesWithNoExtraInnerMembrane = [0,5];
		if (stylesWithNoExtraInnerMembrane.includes(this.membrane_STYLE_ID)) {
			this.doMembraneExtraInnerMembrane = false;
		}

		this.doMembraneHairs = false; 
		this.doMembraneHairsStubbly = false; 
		this.membraneHairSkip = myRandomInt(1,2); 
		this.membraneHairLengthFactor = getSkewedGaussian (1.0, 2.0, 1.0, -0.5);
		this.membraneHairWeight = (myRandomA(1.0) < 0.3) ? WEIGHT_0 : WEIGHT_1;
		this.membraneHairsPerSeg = 1; 
		if ((!this.bDoOffsetRings) || (this.nOffsetRings <= 0)){
			this.doMembraneHairs = true; 
			let acceptableMembraneStylesForHairs = [0,3,4]; // only certain STYLE_ID's look good with hairs.
			if (!acceptableMembraneStylesForHairs.includes(this.membrane_STYLE_ID)){
				this.membrane_STYLE_ID = acceptableMembraneStylesForHairs[myRandomInt(0,2)];
				if (this.THE_SCHEMA == 103){
					if (this.membrane_STYLE_ID == 0){
						this.membrane_STYLE_ID = acceptableMembraneStylesForHairs[myRandomInt(1,2)];
					}
				}
			}
			
			this.doMembraneHairsStubbly = (myRandom01() < 0.17);
			if (this.doMembraneHairsStubbly){
				this.membraneHairsPerSeg = 2; 
				this.membraneHairWeight = WEIGHT_1;
				this.membraneHairLengthFactor = myRandomAB(0.8, 1.0);
			}
		}




		this.membraneLoopPerimeterReductionFactor = myRandomAB(0.96, 0.99); //0.970; // PROPERTY_A
		this.membraneInnermostRingMass = myRandomAB(0.9, 1.5); 
		// this.membraneRadialBandWeight = (myRandomA(1.0) < 0.8) ? WEIGHT_0 : WEIGHT_1; 

		if (this.THE_SCHEMA == 202){
			// also see setImplicitContourProperties()
			this.siteWaveAmplitude = 0.1;
			this.siteWaveSpeed = 1000.0;
		}


		if (this.THE_SCHEMA == 205){
			this.membraneLoopPerimeterReductionFactor = myRandomAB(1.00, 1.01);
			this.membraneInnermostRingMass = myRandomAB(1.3, 1.6);
			this.siteWaveAmplitude = myRandomAB(0.15, 0.30);
			this.siteWaveSpeed = myRandomAB(1500, 4500);
			if (!this.doMembraneHairsStubbly){
				this.membraneHairLengthFactor = myRandomAB(1.75,2.75); 
			}
			this.bIsSymmetrical = (myRandomA(1.0) < 0.01); 
			if (myRandom01() < 0.02){ this.membraneHairsPerSeg = 2;}

			this.cachedFieldGamma = Math.pow(this.cachedFieldGamma, 0.9);
			if (this.ORGANISM_SCALE_FACTOR < 1.0){
				this.ORGANISM_SCALE_FACTOR = Math.pow(this.ORGANISM_SCALE_FACTOR, 0.5); 
			}
		}
		if (this.THE_SCHEMA == 208){
			this.siteWaveAmplitude = myRandomAB(0.05, 0.09);
			this.bIsSymmetrical = (myRandomA(1.0) < 0.875); 
			this.massRandomness = (this.bIsSymmetrical) ? myRandomAB(0.01, 0.03) : myRandomAB(0.05, 0.10);
			this.membraneHairsPerSeg = getWeightedOption([[1,10],[2,30],[3,45],[4,15]]); 
			this.membraneHairSkip = 1; 

			this.cachedFieldGamma = myRandomAB(1.00, 1.04);
			this.ORGANISM_SCALE_FACTOR = myRandomAB(1.04, 1.12);
			let edgeNoiseConfig =  getWeightedOption([[[50,10],15], [[200,25],35], [[400,40],50]]);
			this.edgeNoiseScale = edgeNoiseConfig[0]; 
			this.edgeNoiseAmp = edgeNoiseConfig[1];
		}

		this.bDoMembrane = (this.nMembraneLayers > 0);
		this.deferredStructureMinimumDistanceThreshold = 2.0; 

		this.bOrientationSensitiveDashedContours = false;
		this.orientationSensitiveOmitDashAngle = radians(25.0); 
		this.orientationSensitiveDashNotchWidth = getSkewedGaussian(0.5,1.5, 1.4, -1.7); // 0.6; 

		this.membrane_bAddDitherDots = false; //00, 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12
		let probabilitiesOfAddingDitherDots =  [22, 12, 26, 30,  0,  1, 16,  8,  0,  0, 40, 10,  0];
		if (this.nMembraneLayers >= 2){
			if ((this.membrane_STYLE_ID >=0) && (this.membrane_STYLE_ID <= 12)){
				let probabilityOfAddingDitherDots = probabilitiesOfAddingDitherDots[this.membrane_STYLE_ID];
				if (this.nMembraneLayers == 2){ probabilityOfAddingDitherDots *= 0.33; }
				if (this.THE_SCHEMA == 206){ 
					probabilityOfAddingDitherDots *= 1.5;
					probabilityOfAddingDitherDots = Math.min(100, probabilityOfAddingDitherDots+35); 
				}
				this.membrane_bAddDitherDots = (myRandom01() < (probabilityOfAddingDitherDots/100.0));
			}
		}

		this.membraneLoopIndent = 0;
		this.loopIndentWeight = WEIGHT_2; 
		const acceptableMembraneStylesForLoopIndent = [0, 1, 2, 3, 5, 7, 8, 9, 10, 11];
		if (acceptableMembraneStylesForLoopIndent.includes(this.membrane_STYLE_ID)){
			if (this.nMembraneLayers > 3){
				let loopIndentProbability = map(this.nMembraneLayers, 4,8, 0.65,0.85, true);  
				if (this.membrane_STYLE_ID == 0){ loopIndentProbability *= 0.6; }
				if (myRandom01() < loopIndentProbability){
					this.membraneLoopIndent = 1; 
				}
			}
		}

		//---------------------------------------
		this.bDrawParticles = (myRandomA(1.0) > 0.01);
		this.particleDrawMode = getWeightedOption([
			[PARTICLE_SIZE_CONSTANT,   78],
			/*[PARTICLE_SIZE_SPEEDBASED, 11],*/
			[PARTICLE_SIZE_VARIEGATED, 11]]
		);
		if (this.THE_SCHEMA == 206){ this.particleDrawMode = PARTICLE_SIZE_VARIEGATED; }

		this.bDrawVoronoiDiagram = true;
		this.bDrawClippedVoronoiCellsOnInteriorStructureBoundaries = (myRandomA(1.0) > 0.01); 
		this.bDrawEncircledSiteBlobs = (myRandomA(1.0) > 0.01);
		this.nVoronoiSubdivs = getWeightedOption([[1, 2],[3, 8],[4, 90]]);

		this.particleDiameter = constrain(myRandomGaussian(1.75, 0.2), 1.0,2.5); 
		this.blobDropoutPercent = myRandomAB(0.01, 0.040); 
		this.nucleusDropoutPercent = myRandomAB(0.01, 0.040); 
		this.bDoFillSiteBlobs = true; 
		this.siteBlobFillColor = (myRandomA(1.0) < 0.1) ? 0 : 255; // 0 or 255
		this.siteBlobStrokeColor = (this.bDoFillSiteBlobs) ? (255 - this.siteBlobFillColor) : 0;

		this.siteBlobScale = getSkewedGaussian(0.50, 0.80, 0.85, 1.4); // 0.85
		if (this.bDoFillSiteBlobs){ this.siteBlobScale -= 0.11;}
		this.siteBlobTightness = getSkewedGaussian(0.30, 0.50, 0.7, -1.7);  // 0.33;
		

		// COMPOSITION --------------------------
		this.nToppings = getWeightedOption([
			[2, 25],
			[3, 50],
			[4, 25]
		]);
		this.toppings = []; 
		for (let i=0; i<this.nToppings; i++){
			let aTopping = getWeightedOption([
				[STRUCTURE_TYPE_LOOP,  20], 
				[STRUCTURE_TYPE_DASH,  15], 
				[STRUCTURE_TYPE_TRUSS, 10],
				[STRUCTURE_TYPE_STAR,   5],
				[STRUCTURE_TYPE_TREE,   5],
				[STRUCTURE_TYPE_CENTI, 10],
				[STRUCTURE_TYPE_BALL,  15],
				[STRUCTURE_TYPE_LINE,  20]
			]);
			while (this.toppings.includes(aTopping)){
				aTopping = getWeightedOption([
					[STRUCTURE_TYPE_LOOP,  20], 
					[STRUCTURE_TYPE_DASH,  15], 
					[STRUCTURE_TYPE_TRUSS, 10],
					[STRUCTURE_TYPE_STAR,   5],
					[STRUCTURE_TYPE_TREE,   5],
					[STRUCTURE_TYPE_CENTI, 10],
					[STRUCTURE_TYPE_BALL,  15],
					[STRUCTURE_TYPE_LINE,  20]
				]);
			}
			this.toppings[i] = aTopping;
		}
		
		// STRUCTURE_TYPE_LINE (0) ---------------------------------
		// [Style, TargetLength, LengthVariance, UseGreedyGrowth]
		let lineStruct = getWeightedOption([
			[[0,20,10, true ], 28] /* plain plain */, 
			[[1,25,10, false], 35] /* NubblesAndBlurps on terminals */,
			[[2,10, 2, true ], 25] /* sperm */,
			[[3,10, 1, false],  4] /* leaf, Sine outline A */,
			[[4,10, 2, false],  4] /* Sine outline B */,
			[[5, 6, 2, false],  4] /* hairy */
		]);
		this.lineStructureStyle = lineStruct[0];
		this.lineStructureLengthTarget = lineStruct[1];
		this.lineStructureLengthVariance = lineStruct[2];
		this.lineStructureUseGreedyGrowth = lineStruct[3];
		this.lineStructureSmoothing = getSkewedGaussian(0.5, 3.5, 0.9, 0.4);
		this.bLinesGrowAtHighestCurvature = (myRandom01() > 0.75);
		this.lineMassMultiplier = 1.0; 

		// STRUCTURE_TYPE_LOOP (1) ---------------------------------
		// [Style, bEncloseBlobs]
		let loopStruct = getWeightedOption([
			[[0, true ], 25] /* shaded line, no fill, no membrane */, 
			[[1, false],  3] /* black shape */, 
			[[2, false], 20] /* white with membrane */, 
			[[3, true ],  5] /* black shape with outer but no inner membrane */,
			[[4, false],  5] /* black with membrane */,
			[[5, true],  42] /* bubble */
		]);
		this.loopStructureStyle = loopStruct[0];
		this.bLoopDisplayEnclosedBlobs = loopStruct[1];
		this.loopStructureSmoothing = getSkewedGaussian(1.5, 3.0, 1.0, 0.6); // averages 2.43
		this.bLoopUseGreedyGrowth = (myRandom01() < 0.01); 
		this.loopMassMultiplier = myRandomAB(1.0,2.0); 
		this.loopInitialSize = 10; // min is 4
		this.loopSizeTarget = myRandomInt(12,60); 
		this.loopSizeVariance = int(this.loopSizeTarget * myRandomAB(0.1, 0.4));
		this.bLoopsGrowAtHighestCurvature = (myRandom01() > 0.75);

		// STRUCTURE_TYPE_DASH (2) ---------------------------------
		let dashStruct = getWeightedOption([
			[0, 10] /* plain dash */, 
			[1, 25] /* cluster of dots */, 
			[2, 45] /* thatch of lines */, 
			[3, 20] /* wedge */
		]);
		this.dashStructureStyle = dashStruct; //myRandomInt(0,3);
		this.dashMassMultiplier = getWeightedOption([[1,15],[1.5,20],[2,40],[3,20],[4,5]]); 
		//print("dashMassMultiplier - " + this.dashMassMultiplier);

		// STRUCTURE_TYPE_TRUSS (3) --------------------------------
		// [Style, MinLength, LengthStDv]
		let trussStruct = getWeightedOption([
			[[0,2, 0.7], 10] /* simple empty loop */,
			[[1,2, 1.1], 25] /* one-eyed, no spine */,
			[[2,4, 1.2],  5] /* intestine */,
			[[3,2, 1.1], 15] /* long thin stripe and eyes */,
			[[4,2, 1.0], 10] /* dashed thick stripe */,
			[[5,3, 0.6], 25] /* segmented */,
			[[6,1, 1.1], 10] /* black outline, pattern fill */
		]);
		this.trussStructureStyle = trussStruct[0]; // myRandomInt(0,6);  
		this.trussStructureMinLen = trussStruct[1];
		this.trussStructureTargetLengthStd = trussStruct[2];
		this.trussStructureTargetLengthMin = this.trussStructureMinLen;
		this.trussesTaperWhenGrowing = (myRandom01() < 0.3);

		// STRUCTURE_TYPE_WHEEL (4) --------------------------------
		this.nWheelRadialBands = myRandomInt(3,4); // was 3,5)
		this.nWheelAnnularLoops = myRandomInt(1,2); // was 1,3
		this.wheelMassMultiplier = myRandomAB(3.0, 4.0); 
		//                                0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19
		this.scrunchTickProbabilities = [ 0,  0,  0, 75, 20,  0,  0, 25, 27,  0,  0, 66,  0,  0, 95,  0,  0,  0,  0,  0];
		this.bDrawAllRadialLines = (myRandom01() < 0.70);
		this.drawRadialLinePercent = getWeightedOption([[0.09,10], [0.20,10], [0.94,80]]);

		// STRUCTURE_TYPE_STAR (5) --------------------------------
		let starStruct = getWeightedOption([
			[0,  5] /* Plain plain */,
			[1, 15] /* Tapered */,
			[2, 10] /* Skinny with nubbles */,
			[3, 25] /* Scary spider */,
			[4, 10] /* Even thickness with nubbles and tapers */,
			[5, 25] /* Tapered with nubbles */,
			[6, 10] /* Taper + anti-taper */
		]);
		this.starStructureStyle = starStruct; // myRandomInt(0,6);
		this.starStructureSizeTarget = int(abs(myRandomGaussian(0.0, 1.1)));  
		this.bDoStarCenterDot = false; 

		// STRUCTURE_TYPE_TREE (6) ---------------------------------
		let treeStruct = getWeightedOption([
			[0,20] /* plain */,
			[1,10] /* taper */,
			[2,45] /* nubbles */,
			[3,25] /* taper & nubbles */
		]);
		this.treeStructureStyle = treeStruct; //myRandomInt(0,3);
		this.bTreeUseGreedyGrowth = false; //(myRandom01() < 0.15);
		let maxTreeGrowth = (this.treeStructureStyle == 3) ? 25 : 50; 
		this.treeGrowthSizeLimit = int(getSkewedGaussian(6, maxTreeGrowth, 1.0, -0.8)); // mean is ~20
		this.treeMassMultiplier = map(this.treeGrowthSizeLimit, 6,maxTreeGrowth, 2.0, 5.0);
		this.maxSpringsPerParticle = myRandomInt(3,4); 
		this.treeStructureBranchDiminishFactor = getSkewedGaussian(0.2, 0.9, 1.1, 1.8); // 0.80;
		this.treeBranchMutualRepulsionFactor = getSkewedGaussian(0.05, 0.75, 0.9, -0.4); // 0.05; 

		// STRUCTURE_TYPE_URCHIN (7) -------------------------------
		this.urchinStructureCounter = myRandomInt(0,3);

		// STRUCTURE_TYPE_CENTI (8) --------------------------------
		let centiStruct = getWeightedOption([
			[0,15] /* plain with eye */,
			[1,15] /* no eye, thin hair */,
			[2,40] /* eye, thick hair */,
			[3,20] /* thin hair, spots */,
			[4,10] /* thin hair, eyes, spots, tail */
		]);
		this.centiStructureStyle = centiStruct; //myRandomInt(0,4); 
		this.centiStructureLength = int(Math.round(getSkewedGaussian(3, 7, 1.6, -0.25)));

		// STRUCTURE_TYPE_BALL (9) ---------------------------------
		let ballStruct = getWeightedOption([
			[PARTY_STYLE, 10] /* everything bagel */,
			[0,4] /* Empty outline with nubbles */,
			[1,5] /* Pizza */,
			[2,25] /* Black ball */,
			[3,20] /* Inner parallel line */,
			[4,10] /* Spiral */,
			[5, 5] /* Small Outlined Eye */,
			[6, 5] /* Big Eye: Pupil */,

			[8, 7] /* Shaded */,
			[10, 1] /* Shaded Empty outline with nubbles */,
			[11, 3] /* Shaded Pizza */,
			[13, 3] /* Shaded Inner parallel line */,
			[14, 2] /* Shaded Spiral */
		]);
		this.ballStructureStyle = ballStruct;
		this.ballStructureEccentricity = getSkewedGaussian(1.0, 1.5, 1.1, -0.3); //1.25; 1.0-1.5
		this.ballStructureSymmetry = getSkewedGaussian(0.0, 0.5, 0.8, -0.3); //0.25; 0.0-0.5
		this.nSpokesPerBall = myRandomInt(6,8); 
		this.ballMassMultiplier = myRandomAB(0.85,1.00); 	
		this.ballForceBalance = myRandomAB(0.3, 0.7); 
		this.ballAttractionStrength = 0.75; // myRandomAB(-0.75, 0.75); 
		this.bBallCenterDot = (myRandom01() < 0.4); 

		// STRUCTURE_TYPE_TAPEWORM ---------------------------------
		this.tapewormStyle = getWeightedOption([[1,65],[5,35]]);
		this.tapewormNumSegsBase = myRandomInt(2,9);
		this.tapewormBBallHead = (myRandomA(1.0) < 0.6);

		// STRUCTURE_TYPE_SLAB -------------------------------------
		this.slabStyle = getWeightedOption([[0,80],[6,20]]); 
		this.slabNSegs = myRandomInt(3,6);

		// STRUCTURE_TYPE_STARBALL  --------------------------------
		this.starBallStarStyle = getWeightedOption([[5,75],[4,20],[0,5]]);
		this.starBallTrussStyle = getWeightedOption([[1,65],[5,25],[6,10]]);
		this.nStarBallSpokes = getWeightedOption([[1,10],[2,5],[3,30],[5,10],[6,10],[7,25],[8,5],[9,5]]); 
		this.starBallSpokeLen = int(15/this.nStarBallSpokes); 

		// SVG EXPORT ---------------------------
		this.HATCH_ANGLE = radians(getSkewedGaussian(35,45, 1.3, 0.0));
		this.HATCH_DENSITY = myRandomInt(1,2); // must be an integer
	}

	

}
