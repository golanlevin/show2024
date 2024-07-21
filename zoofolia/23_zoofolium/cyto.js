
//===============================================================
class Cyto {
	
	constructor(level, providedPoly, doppelganger, dti,dto, inHash0, parentSchema) {

		// print ("inHash = " + inHash);

		// CELL PROPERTIES
		this.REST_L = 10.0; 
		this.MAX_SPEED = this.REST_L * 0.3125; 
		this.MAX_SPEED2 = this.MAX_SPEED * this.MAX_SPEED;
		this.MIN_SPRING_DIST = this.REST_L / 128.0; 
		this.MIN_SPRING_DIST2 = (this.MIN_SPRING_DIST*this.MIN_SPRING_DIST);

		this.TEMPERATURE = 1.0;
		this.bTemperatureCooling = false;
		this.temperatureInitFreezeTime = -99999; 
		this.simulationFrameCount = 0; 
		this.lastFrameTime = 0; 
		this.myMillis = 0.0;

		this.dtInGraphics = dti; 
		this.dtOutGraphics = dto; 


		this.providedMaskPolyline = null;
		this.bHasFinished = false;
		this.nestedLevel = 0;
		if (level && providedPoly){
			this.nestedLevel = level;
			this.providedMaskPolyline = providedPoly;
			this.correspondingIdOfStructureInCell0 = doppelganger;
		}
		this.parentSchema = parentSchema; 
	

		this.theStyleSheet;
		this.THE_PRIMARY_HASH = ""; 
		this.THE_CURRENT_HASH = ""; 
		this.THE_CURRENT_NOISE_SEED = 0;
		
		this.d3Delaunay; 
		this.d3Voronoi;
		this.d3Data = []; 
		this.myParticles = [];
		this.myStructures = [];
		this.myFlocks = []; 

		this.myDistanceTransformer;
		this.nInteriorPoints =  N_INITIAL_INTERIOR_POINTS;
		this.nMaskPoints = 0; 
		this.HOVER_ITEMS;

		this.debugAskTime = 0; 
		this.bShowDebug = !true;
		this.bDrawMask = !true; 
		this.bDrawDistanceTransformDebug = false;
		this.theBoundingBox = { 
			L:Number.POSITIVE_INFINITY, T:Number.POSITIVE_INFINITY, 
			R:Number.NEGATIVE_INFINITY, B:Number.NEGATIVE_INFINITY 
		};

		this.fadeInPhysics = 0.0; 
		this.bSaveScreencapture = false;
		this.canvasDimPriorToScreencapture = BASE_DIM;

		this.bFirstTimeForMask = true;
		this.bCurrentCellStartsBlank = false;
		this.CX = this.CY = 0; 

		this.deferredParticleTargetStructures = [];
		this.deferredStructures = [];
		this.rand20K = [];

		this.resampledNoisyBlobPolyline;
		this.nRenderedSiteBlobs = 0; 
		this.GRABBED_STRUCTURE_ID = -1; 
		this.GRABBED_PARTICLE_ID = -1;

		//------------
		if (bVerbose){ print("setup"); }
		if (inHash0){
			this.THE_PRIMARY_HASH = inHash0;
			this.THE_CURRENT_HASH = inHash0; 
		} else {
			this.THE_CURRENT_HASH = this.THE_PRIMARY_HASH = fxhash;
		}
		// this.THE_CURRENT_HASH = this.THE_PRIMARY_HASH = fxhash = "ooABz68TfTbK4MD7ND69m93TfdoxXiJhWqEfSob5WoRRUhKu2hu";// S=205

		this.myDistanceTransformer = new DistanceTransformer(this);
		this.produceCell(this.THE_CURRENT_HASH);
	}

	//------------------------------
	cyMouseReleased(){
		this.clearGrabbedItems(); 
	}

	//------------------------------
	cyMousePressed(){
		this.clearGrabbedItems(); 
		if (this.myStructures.length > 1){
			if (this.HOVER_ITEMS != null){
				if ((this.HOVER_ITEMS.closestStructureId > -1) && (this.HOVER_ITEMS.closestParticleGlobalId > -1)){
					this.GRABBED_STRUCTURE_ID = this.HOVER_ITEMS.closestStructureId; 
					this.GRABBED_PARTICLE_ID = this.HOVER_ITEMS.closestParticleGlobalId;
					this.myStructures[this.GRABBED_STRUCTURE_ID].whichParticleIsGrabbed = this.HOVER_ITEMS.closestParticleLocalIndex;
				}
			}
		}
	}

	cyWindowResized(){
		;
	}

	//------------------------------
	cyKeyPressed(inKey){

		if ((inKey >= '0') && (inKey <= '9')) {
			let whichType = ~~(inKey);
			this.addNewStructureAtMouseLocation(whichType);
		}

		switch (inKey){
			case ' ':
				this.togglePause(); 
				break;
			case 'd': case 'D':
				this.toggleDebugView(); 
				break;
			case 'o': case 'O':
				this.getBlankCellOnRequest(); 
				break;
			case 'n': case 'N':
				this.getNovelCellOnRequest(); 
				break;
			case 'r': case 'R':
				this.resetCurrentCell(); 
				break;
		
			case 'x': case 'X':
				this.theStyleSheet.bEnableExternalRingsOrHairs = !(this.theStyleSheet.bEnableExternalRingsOrHairs); 
				break;
			case 'c': case 'C': 
				this.theStyleSheet.bDrawParticles = !(this.theStyleSheet.bDrawParticles); 
				break;
			case 'v': case 'V':
				this.theStyleSheet.bDrawVoronoiDiagram = !(this.theStyleSheet.bDrawVoronoiDiagram); 
				break;
			case 'b': case 'B':
				this.theStyleSheet.bDrawEncircledSiteBlobs = !(this.theStyleSheet.bDrawEncircledSiteBlobs); 
				break;
			case 'l': case 'L':
				this.theStyleSheet.bUseVertexShadedLines = !(this.theStyleSheet.bUseVertexShadedLines); 
				break;
			case 'g': case 'G':
				if (this.myStructures.length > 0){
					let lastStructure = this.myStructures.length -1; 
					this.myStructures[lastStructure].growStructureOnRequest(); 
				}
				break;
			case 'i': case 'I': 
				this.printSystemInformation();
				break;

			//-----------------
			case '.':
				this.addParticleGroupAtMouseLocation(); 
				break;

			case 't': 
				this.bDrawDistanceTransformDebug = !this.bDrawDistanceTransformDebug; 
				break;
		}
	}

	//------------------------------
	produceCell(aHashcode){
		if (bVerbose){ print("produceCell"); }
		this.clearSettableGlobals();		
		this.initializeRandomSeed(aHashcode);
		this.initializeStyleSheet();
		this.initializePaper();
		this.initializeAllPhysics(); 


		this.tryToInitializeStructures(); 
		this.initializeFreeParticles();
		this.clearGrabbedItems(); 
	}


	initializePaper(){
		if (bVerbose){ print("initializePaper"); }
		myRandomReset(this.THE_CURRENT_HASH);
	}

	resetCurrentCell(){
		this.produceCell(this.THE_CURRENT_HASH);
	}

	getBlankCellOnRequest(){
		this.bCurrentCellStartsBlank = true;
		let fxh = getRandomFxhash();
		this.produceCell(fxh);
	}

	getNovelCellOnRequest(){
		this.bCurrentCellStartsBlank = false;
		let fxh = getRandomFxhash();
		this.produceCell(fxh);
	}

	pauseIfJustFinished(){
		let bOut = false; 
		let endFrame = (this.nestedLevel == 0) ? fadeInPhysicsNFrames : fadeInPhysicsNFrames;//*3;

		if ((this.bHasFinished == false) && (this.simulationFrameCount == endFrame)){
			this.pause();
			this.bHasFinished = true;
			bOut = true; 
		}
		return bOut; 
	}


	clearSettableGlobals(){
		if (bVerbose){ print("clearSettableGlobals"); }
		this.TEMPERATURE = 1.0;
		this.bTemperatureCooling = false;
		this.temperatureInitFreezeTime = -99999999; 
		this.simulationFrameCount = 0; 
		this.lastFrameTime = 0; 
		this.myMillis = 0.0;

		this.theStyleSheet = null;
		this.THE_CURRENT_NOISE_SEED = 0; 

		this.d3Delaunay = null; 
		this.d3Voronoi = null;
		this.d3Data = []; 
		this.myParticles = [];
		this.myStructures = [];
		this.myFlocks = []; 

		this.nInteriorPoints =  N_INITIAL_INTERIOR_POINTS;
		this.nMaskPoints = 0; 
		this.HOVER_ITEMS = null;

		this.theBoundingBox = { 
			L:Number.POSITIVE_INFINITY, T:Number.POSITIVE_INFINITY, 
			R:Number.NEGATIVE_INFINITY, B:Number.NEGATIVE_INFINITY };

		this.theStyleSheet = null; 
		this.bFirstTimeForMask = true;
		this.fadeInPhysics = 0.0; 
		this.CX = BASE_DIM/2;
		this.CY = BASE_DIM/2;

		this.bHasFinished = false; 
	}

	//===============================================================
	printSystemInformation(){
		let flags = "";
		flags += (this.theStyleSheet.bEnableExternalRingsOrHairs) ? "1" : "0";
		flags += (this.theStyleSheet.bDrawParticles) ? "1" : "0";
		flags += (this.theStyleSheet.bDrawVoronoiDiagram) ? "1" : "0"; 
		flags += (this.theStyleSheet.bDrawEncircledSiteBlobs) ? "1" : "0"; 
		flags += (this.theStyleSheet.bUseVertexShadedLines) ? "1" : "0"; 

		let out = ""; 
		out += ("===========\n");
		out += ("CYTOGRAPHIA by Golan Levin (2023)\n"); 
		out += ("System information: " + navigator.userAgent + "\n");
		out += ("THE_CURRENT_HASH: " + this.THE_CURRENT_HASH + "\n"); 
		out += ("simulationFrameCount: " + this.simulationFrameCount + "\n");
		out += ("render flags: " + flags + "\n"); 
		out += ("user-defined design: " + this.bCurrentCellStartsBlank + "\n");
		out += ("myParticles.length: " + this.myParticles.length + "\n"); 
		out += ("windowWidth: " + windowWidth + "\n"); 
		out += ("frameRate: " + nf(frameRate(),1,2) + "\n"); 
		print(out); 
	}

	//===============================================================
	initializeRandomSeed(fxh){
		this.THE_CURRENT_HASH = fxh; 
		myRandomReset(this.THE_CURRENT_HASH);

		this.rand20K = new Array(20000);
		for (let i=0; i<20000; i++){
			this.rand20K[i] = myRandom01(); 
		}
		this.THE_CURRENT_NOISE_SEED = myRandomInt(0, 32768); 
		noiseSeed(this.THE_CURRENT_NOISE_SEED); 
	}

	//===============================================================
	initializeStyleSheet(){
		this.theStyleSheet = null; 
		myRandomReset(this.THE_CURRENT_HASH);
		this.theStyleSheet = new CyStyleSheet(this); 
		noiseSeed(this.THE_CURRENT_NOISE_SEED); 
		
		if (this.bCurrentCellStartsBlank == true){
			this.theStyleSheet.THE_SCHEMA = 109; 
		}
	}

	setProvidedMaskPolyline(poly){
		this.providedMaskPolyline = poly; 
	}

	//===============================================================
	initializeAllPhysics(){
		this.myParticles = [];
		this.myStructures = [];
		this.deferredParticleTargetStructures = [];
		this.deferredStructures = [];
		this.myFlocks = []; 
		this.d3Data = [];

		this.nInteriorPoints =  N_INITIAL_INTERIOR_POINTS;
		this.simulationFrameCount = 0; 
		this.myMillis = 0; 
		this.fadeInPhysics = 0.0; 
		this.bTemperatureCooling = false; 
		this.TEMPERATURE = 1.0; 
		this.temperatureInitFreezeTime = -99999999;   
		this.GRABBED_STRUCTURE_ID = -1; 
		this.GRABBED_PARTICLE_ID = -1; 

		this.bFirstTimeForMask = true;
		this.generateMask(this.bFirstTimeForMask); 
		myRandomReset(this.THE_CURRENT_HASH);

		// Add Particles [nMaskPoints ... nMaskPoints+nInteriorPoints-1] 
		let nInteriorPointsToActuallyAdd = 0; //~~(nInteriorPoints * 0.1);
		for (let i = this.nMaskPoints; i < (this.nMaskPoints+nInteriorPointsToActuallyAdd); i++) {
			let rr = 0.10 * maskR * Math.pow(myRandomAB(0.0, 0.99), 0.5);
			let rt = myRandomAB(0, TWO_PI);
			let rx = BASE_DIM * (0.5 + rr * Math.cos(rt)); 
			let ry = BASE_DIM * (0.5 + rr * Math.sin(rt));

			let aParticle = new Particle(); 
			aParticle.set(rx, ry);
			aParticle.setDropoutLikelihood(this.theStyleSheet.blobDropoutPercent, this.theStyleSheet.nucleusDropoutPercent); 
			aParticle.bIsABoundarySite = false; 
			this.myParticles.push(aParticle);
		}

		this.copyParticlesToD3Data(1);
		this.copyParticlesToD3Data(2);

		// NOTE: Voronoi diagrams take place in the range (0,1)
		this.d3Delaunay = new d3.Delaunay(this.d3Data);
		this.d3Voronoi = this.d3Delaunay.voronoi([0, 0, VOR_W, VOR_H]);

		for (let i=0; i<10; i++){ 
			this.myFlocks[i] = [];
		}
	}






	//==========================================================
	/* SCHEMA

	  /$$$$$$   /$$$$$$  /$$   /$$ /$$$$$$$$ /$$      /$$  /$$$$$$ 
	 /$$__  $$ /$$__  $$| $$  | $$| $$_____/| $$$    /$$$ /$$__  $$
	| $$  \__/| $$  \__/| $$  | $$| $$      | $$$$  /$$$$| $$  \ $$
	|  $$$$$$ | $$      | $$$$$$$$| $$$$$   | $$ $$/$$ $$| $$$$$$$$
	 \____  $$| $$      | $$__  $$| $$__/   | $$  $$$| $$| $$__  $$
	 /$$  \ $$| $$    $$| $$  | $$| $$      | $$\  $ | $$| $$  | $$
	|  $$$$$$/|  $$$$$$/| $$  | $$| $$$$$$$$| $$ \/  | $$| $$  | $$
	\______/  \______/ |__/  |__/|________/|__/     |__/|__/  |__/
																
	*/

	tryToInitializeStructures(){



		if (bVerbose){ print("tryToInitializeStructures"); }
		try {
			this.initializeStructures(); 
		} catch (theError){
			print(theError);
			// this.recoverFromBadHash(); 
			// exit(); 
		}
	}

	recoverFromBadHash(){
		if (bVerbose){ print("recoverFromBadHash"); }
		this.THE_CURRENT_HASH = this.incrementHashCharAt(this.THE_CURRENT_HASH, 0);
		myRandomReset(this.THE_CURRENT_HASH);
		this.produceCell(this.THE_CURRENT_HASH);
	}

	incrementHashCharAt(aHashStr, index){
		// Usage: ahash = incrementHashCharAt(ahash, whichCharToIncrement);
		index = 2 + (index%(aHashStr.length-2));
		let oldChar = aHashStr.charAt(index);
		let oldCharAlphabetPlace = alphabet.indexOf(oldChar);
		let newCharAlphabetPlace = (oldCharAlphabetPlace+1)%alphabet.length;
		let newChar = alphabet.charAt(newCharAlphabetPlace);
		
		let out = aHashStr.substring(0,index);
		out += newChar;
		out += aHashStr.substring(index+1);
		return out;
	}

										  
	//===============================================================
	initializeStructures(){
		if (bVerbose){ print("initializeStructures"); }


		let bIsRoot = (this.nestedLevel == 0);
		myRandomReset(this.THE_CURRENT_HASH);
		this.addNewStructure(STRUCTURE_TYPE_MEMBRANE, 0, 0); 

		if (this.theStyleSheet.bDoOffsetRings){ 
			this.addNewStructure(STRUCTURE_TYPE_OFFSETS, 0, 0); 
		}

		switch (this.theStyleSheet.THE_SCHEMA){

				case 106: {
					let nPrexistingStructures = this.myStructures.length;
					const decoStyles = [
						{ // 0 
							itemGroupsToAdd: [
								{
									nItemsToAdd: 9,
									itemType: STRUCTURE_TYPE_WHEEL,
									itemDelay: 5,
									itemAddPeriod: 10,
									itemTargetSize: 110,
									itemTargetSizeRandomness: 20,
									itemDeferredParticlesFrac: 0.05, 
									itemNParticleBoosts: 4,
									itemNParticlesPerBoost: 30,
								},
								{
									nItemsToAdd: 3,
									itemType: STRUCTURE_TYPE_LOOP,
									itemDelay: 110,
									itemAddPeriod: 60,
									itemTargetSize: 10,
									itemTargetSizeRandomness: 3,
									itemDeferredParticlesFrac: 0.0, 
									itemNParticleBoosts: 0,
									itemNParticlesPerBoost: 0
								}
							],
							nMainParticles: 30,
							nMainParticleAddFrame: 240,
							bAddDecorations: true
						},

						
						{ // 1
							itemGroupsToAdd: [
								{
									nItemsToAdd: 1,
									itemType: STRUCTURE_TYPE_WHEEL,
									itemDelay: 5,
									itemAddPeriod: 1,
									itemTargetSize: 130,
									itemTargetSizeRandomness: 30,
									itemDeferredParticlesFrac: 0.12, 
									itemNParticleBoosts: 6,
									itemNParticlesPerBoost: 25
								},
								{
									nItemsToAdd: 11,
									itemType: STRUCTURE_TYPE_LOOP,
									itemDelay: 20,
									itemAddPeriod: 10,
									itemTargetSize: 45,
									itemTargetSizeRandomness: 10,
									itemDeferredParticlesFrac: 0.05, 
									itemNParticleBoosts: 2,
									itemNParticlesPerBoost: 30
								},
							],
							nMainParticles: 10,
							nMainParticleAddFrame: 240,
							bAddDecorations: true
						},


						{ // 2
							itemGroupsToAdd: [
								{
									nItemsToAdd: 1,
									itemType: STRUCTURE_TYPE_WHEEL,
									itemDelay: 5,
									itemAddPeriod: 1,
									itemTargetSize: 150,
									itemTargetSizeRandomness: 30,
									itemDeferredParticlesFrac: 0.15, 
									itemNParticleBoosts: 6,
									itemNParticlesPerBoost: 30
								},
								{
									nItemsToAdd: myRandomInt(1,2),
									itemType: STRUCTURE_TYPE_WHEEL,
									itemDelay: 25,
									itemAddPeriod: 1,
									itemTargetSize: 15,
									itemTargetSizeRandomness: 20,
									itemDeferredParticlesFrac: 0.20, 
									itemNParticleBoosts: 3,
									itemNParticlesPerBoost: 10
								},
								{
									nItemsToAdd: 7,
									itemType: STRUCTURE_TYPE_LOOP,
									itemDelay: 30,
									itemAddPeriod: 10,
									itemTargetSize: 50,
									itemTargetSizeRandomness: 0,
									itemDeferredParticlesFrac: 0.10, 
									itemNParticleBoosts: 3,
									itemNParticlesPerBoost: 20
								},
							],
							nMainParticles: 20,
							nMainParticleAddFrame: 240,
							bAddDecorations: true
						},














						/*
						{ // 2
							nWheels: 7,
							wheelSchedule: 10,
							targetSize: 150,
							initialDeferredParticlesFrac: 1.0,
							nParticlesPerBoost: 30,
							nParticleBoosts: 3,
							nMainParticles: 700,
							nMainParticleAddFrame: 27
						},
						{ // 3
							nWheels: 7,
							wheelSchedule: 10,
							targetSize: 150,
							initialDeferredParticlesFrac: 1.0,
							nParticlesPerBoost: 30,
							nParticleBoosts: 3,
							nMainParticles: 50,
							nMainParticleAddFrame: 300
						}
						*/
					];

					let currentDecoStyle = 2; // fiddle with this!
					let areaPerParticle = (sqrt(3)/4.0)*sq(this.REST_L); 

					let nItemGroupsToAdd = decoStyles[currentDecoStyle].itemGroupsToAdd.length;
					let itemCount = nPrexistingStructures; 
					for (let g=0; g<nItemGroupsToAdd; g++){
				
						let itemGroup = decoStyles[currentDecoStyle].itemGroupsToAdd[g];
						let nItemsToAdd = itemGroup.nItemsToAdd;
						
						for (let i=0; i<nItemsToAdd; i++){
							let itemType        = itemGroup.itemType;
							let nParticleBoosts = itemGroup.itemNParticleBoosts;
							let itemDelay       = itemGroup.itemDelay;
							let itemAddPeriod   = itemGroup.itemAddPeriod;
							let deferFrame 		= itemDelay + i*itemAddPeriod;
							let targetSize      = itemGroup.itemTargetSize + myRandomInt(0, itemGroup.itemTargetSizeRandomness);
							
							let wheelCircumference = this.REST_L * targetSize / 2;
							let wheelArea = PI * sq(wheelCircumference/TWO_PI);
							let nMaxParticlesPerWheel = wheelArea / areaPerParticle; 
							let nParticleFrac = itemGroup.itemDeferredParticlesFrac;
							let nInitialDeferredParticles = int(nParticleFrac * nMaxParticlesPerWheel); 

							let itemOverrideStruct = {
								'style': 0,
								'targetSize':  targetSize,
								'bAddDeferredParticleGroup':true, 
								'howManyDeferredParticles': nInitialDeferredParticles,
								'delayToAddParticles':50  }; 
							this.addDeferredStructure(0, itemType, 1, deferFrame, itemOverrideStruct);

							if (nParticleBoosts > 0){
								for (let j=0; j<nParticleBoosts; j++){
									let itemNParticlesPerBoost = itemGroup.itemNParticlesPerBoost;
									this.addDeferredParticleGroup(itemCount, itemNParticlesPerBoost, deferFrame + 100+j*50);
								}
							}
							itemCount++; 
						} 
					}

					// Add structure decorations to the main cell
					if (decoStyles[currentDecoStyle].bAddDecorations){
						let decoAddtime = 10 + itemCount*10;
						let decoStructType = getWeightedOption([
							[STRUCTURE_TYPE_TREE,30],
							[STRUCTURE_TYPE_LINE,30],
							[STRUCTURE_TYPE_STAR,30],
							[STRUCTURE_TYPE_BALL,10]
						]);
						
						let nDecoStructs = myRandomInt(3,8);
						this.addDeferredStructure(0, decoStructType, nDecoStructs, decoAddtime, null);
						// print ("addDeferredStructure " + decoStructType + " " + nDecoStructs); 
					}

					// Add some deferred particles to the main cell
					let nMainParticles = decoStyles[currentDecoStyle].nMainParticles;
					if (nMainParticles > 0){
						let nMainParticleAddFrame = decoStyles[currentDecoStyle].nMainParticleAddFrame;
						this.addDeferredParticleGroup(0, nMainParticles, nMainParticleAddFrame);
					}
				} 
				break;



				case 206:{
					this.theStyleSheet.bEnableProgressivelyAddedLoopsOrWheels = (myRandom01() < 0.15); 
					this.theStyleSheet.bLoopsGrowAtHighestCurvature = false;
					this.theStyleSheet.bLoopUseGreedyGrowth = false; 
					this.theStyleSheet.progressivelyAddType == STRUCTURE_TYPE_WHEEL;
					this.theStyleSheet.blobInteriorExteriorBalance = 1.0;
	
					this.theStyleSheet.siteBlobFillColor = 255;
					this.theStyleSheet.bLoopDisplayEnclosedBlobs = true; 
					this.theStyleSheet.blobTargetLengthNudgeFactor = 0.9; 
					this.theStyleSheet.maxNProgressivelyAddedBlobs = 10;
					this.theStyleSheet.bDrawVoronoiDiagram = getWeightedOption([[true,80], [false,20]]); 
					this.theStyleSheet.progressivelyAddType = getWeightedOption([[STRUCTURE_TYPE_LOOP,35], [STRUCTURE_TYPE_WHEEL,65]]); 
					this.theStyleSheet.bDrawEncircledSiteBlobs = getWeightedOption([[true,80], [false,20]]); 
					if (this.theStyleSheet.progressivelyAddType == STRUCTURE_TYPE_LOOP){ 
						this.theStyleSheet.bDrawEncircledSiteBlobs = true;}
					
					this.theStyleSheet.addStructureFrameDuration = int(getSkewedGaussian(350,800, 1.0,-0.22));
					this.theStyleSheet.addStructureFrameCycle = int(getSkewedGaussian(5,45, 0.45,-0.20)); 
					this.theStyleSheet.proportionOfParticlesToAddToBlobs = 0.5;
					this.theStyleSheet.minOccupancyForProgressivelyAddedBlobs = 0.5; 
					this.theStyleSheet.minDistInRestLengths = 2.0;
	
					const nBlobsToAdd = getWeightedOption([[1,75], [2,25]]);  
					this.resampledNoisyBlobPolyline = new ofPolyline();
					for (let i=0; i<this.nMaskPoints; i++){
						this.resampledNoisyBlobPolyline.add(this.myParticles[i].p.x, this.myParticles[i].p.y, 0); 
					}
					const mainContourArea = Math.abs(polygonArea(this.resampledNoisyBlobPolyline.points)); 
					const sqrtMainContourArea = Math.sqrt(mainContourArea);
					const blobTargetSizeReductionFactor = myRandomAB(0.80, 0.90); 
					const blobTargetSize = blobTargetSizeReductionFactor * sqrtMainContourArea / nBlobsToAdd;  
					this.theStyleSheet.progressivelyAddedBlobStylePair = getWeightedOption(wheelStylePairs);
					
					// Add one or two big wheels, sized proportional to main cell
					let firstAddedStructure = null; 
					for (let i=0; i<nBlobsToAdd; i++){
						let transformResult = this.myDistanceTransformer.computeDistanceTransform(false, -1, 
							this.myParticles, this.myStructures); 
						let rx = transformResult.dtx;
						let ry = transformResult.dty; 
						if ((ry > 0) && (rx > 0)){
							let blobStyle = this.theStyleSheet.progressivelyAddedBlobStylePair[0];
							let overrideStruct = {'style':blobStyle, 'initSize':5, 'targetSize':blobTargetSize};
							firstAddedStructure = this.addNewStructure(STRUCTURE_TYPE_WHEEL, rx,ry, overrideStruct); 
						}
					}
					if ((nBlobsToAdd == 1) && firstAddedStructure){
						let centiTarget = firstAddedStructure.id; 
						if (firstAddedStructure.bDisplayVoronoiCells || firstAddedStructure.bDisplayVoronoiEdges){
							if (myRandom01() < 0.8){
								this.addDeferredParticleGroup(firstAddedStructure.id, myRandomInt(25,50), 60);
							}
							centiTarget = 0; 
						} else {
							firstAddedStructure.bDisplayEnclosedBlobs = false;
						}
						if (myRandom01() < 0.4){ // add a centi to the main first blob
							let centiStyle = myRandomInt(2,5);
							let centiLen = 33;// getWeightedOption([[4, 75], [8,15], [14,10]]); 
							let centiStruct = {'style':centiStyle, 'initSize':centiLen};  
							this.addDeferredStructure(centiTarget, STRUCTURE_TYPE_CENTI, 1, 100, centiStruct);
						}
					}
			
					// Add some delayed filler balloons
					let nFillerBalloons = getWeightedOption([[0,2], [1,3], [2,25], [3,50], [4,20]]); 
					nFillerBalloons = min(nFillerBalloons, Math.floor(sqrtMainContourArea/100)); 
					let balloonStylePair = getWeightedOption(loopStylePairs);
					const balloonStartTime = 250; 
					for (let i=0; i<nFillerBalloons; i++){
						let overrideStruct = {
							'style': balloonStylePair[0],
							'targetSize': myRandomInt(30,45), 
							'bAddDeferredParticleGroup':true, 
							'howManyDeferredParticles':40,
							'delayToAddParticles':60}; 
						this.addDeferredStructure(0, STRUCTURE_TYPE_LOOP, 1, balloonStartTime+i*20, overrideStruct);
					}
	
					// Add some extra particles.
					let bDoAddExtraParticles = getWeightedOption([[true,20], [false,80]]); 
					if (bDoAddExtraParticles && (sqrtMainContourArea > 400)){
						const nParticlesToAdd = 100 - nFillerBalloons*10 + int((1.0-blobTargetSizeReductionFactor)*100);
						const lastFillerBalloonTime = balloonStartTime + nFillerBalloons * 20; 
						this.addDeferredParticleGroup(0, nParticlesToAdd, lastFillerBalloonTime+20);
					}
				}	
				break;


				case 207: 
					// Note: impliciter.baseThreshold has also been adjusted
					/// theStyleSheet.bDrawVoronoiDiagram = false;
					this.theStyleSheet.bDrawEncircledSiteBlobs = (this.rand20K[5] < 0.80);
					this.theStyleSheet.siteBlobFillColor = 255;
					this.theStyleSheet.siteBlobStrokeColor = 0;
					this.theStyleSheet.wheelMassMultiplier = 5.0; 
		
					let nAddedStructures = this.myStructures.length; 
					let bAttemptToDecorateUrchins = false;
					
					let balloonFactor = myRandomAB(0.50, 0.85); 
					const balloonStartTime = 30; 
					this.resampledNoisyBlobPolyline = new ofPolyline();
					for (let i=0; i<this.nMaskPoints; i++){
						this.resampledNoisyBlobPolyline.add(this.myParticles[i].p.x, this.myParticles[i].p.y, 0); 
					}
					const mainContourArea = Math.abs(polygonArea(this.resampledNoisyBlobPolyline.points)); 
					let nFillerBalloons = int(2 + 6.0 * Math.pow(myRandom01(), 2.0)); 
					let balloonPerim = int(balloonFactor * TWO_PI*(Math.sqrt((mainContourArea/nFillerBalloons)/PI))/this.REST_L); 
					let balloonStylePair = getWeightedOption([ [[0,2],10], [[0,5],20], [[0,1],15], [[2,5],15], [[5,2],10], [[2,1],20], [[5,1],10] ]);
					let howManyDeferredParticles = int(1.5 * (mainContourArea/750)/nFillerBalloons);

					this.theStyleSheet.blobDropoutPercent = 0; 
					if ((balloonStylePair[0] == 0) || (balloonStylePair[0] == 2) || (balloonStylePair[0] == 5)){
						this.theStyleSheet.blobDropoutPercent = getWeightedOption([[0.00,85], [0.75,10], [0.95,5]]); 
					}
					let bDoOneDifferent = getWeightedOption([[true,30],[false,70]]);
		
					for (let i=0; i<nFillerBalloons; i++){
						let style = balloonStylePair[0];
						let targetSize = balloonPerim; 
						let nDeferredParticles = howManyDeferredParticles;
						if (bDoOneDifferent){
							if (i==0){ 
								style = balloonStylePair[1];
								targetSize = int(1.5 * (balloonPerim * nFillerBalloons)/(nFillerBalloons+1.5));
								nDeferredParticles = int(howManyDeferredParticles/8);
							} 
						}
						let overrideStruct = {
							'style': style,
							'initSize': max(5, int(balloonPerim/4)),
							'targetSize': targetSize, 
							'bAddDeferredParticleGroup':true, 
							'howManyDeferredParticles':nDeferredParticles,
							'delayToAddParticles':20}; 
						this.addDeferredStructure(0, STRUCTURE_TYPE_LOOP, 1, balloonStartTime+i*20, overrideStruct);
						nAddedStructures++;
					}
		
					// Add some extra particles.
					let bDoAddExtraParticles = getWeightedOption([[true,20], [false,80]]); 
					if (bDoAddExtraParticles){
						const nParticlesToAdd = 100 - nFillerBalloons*10;
						const lastFillerBalloonTime = balloonStartTime + nFillerBalloons * 20; 
						if (nParticlesToAdd){
							this.addDeferredParticleGroup(0, nParticlesToAdd, lastFillerBalloonTime+20);
						}
					}
					// Add a flock.
					if (!bAttemptToDecorateUrchins && (nFillerBalloons > 0)){
						let balloonIdForDashFlock = (nAddedStructures) - nFillerBalloons;
						if (bDoOneDifferent) balloonIdForDashFlock++;
						let nDashes = getWeightedOption([[5,70], [20,20]]) + myRandomInt(0,5); 
						this.addDeferredInteriorDecorationSet([balloonIdForDashFlock], 100,nDashes, STRUCTURE_TYPE_DASH);
					}
				break;


			//--------------------------------------------------------
			case 104: 

				this.theStyleSheet.bLoopsGrowAtHighestCurvature = false;
				this.theStyleSheet.bLoopUseGreedyGrowth = false; 
				this.theStyleSheet.bDrawParticles = getWeightedOption([[false,75], [true,25]]);
				if (bIsRoot){
					this.theStyleSheet.bDrawParticles = getWeightedOption([[true,80], [false,20]]);
				}

				this.theStyleSheet.siteBlobFillColor = 255;

				let nObstacles = 0;
				let nTrusses = getWeightedOption([[0,10], [1,55], [2,30], [3,5]]);
				if (nTrusses == 0){
					if (this.theStyleSheet.nMembraneLayers == 0){ 
						nTrusses = 1;
					} else { 
						this.theStyleSheet.bDrawParticles = true; 
					}
				}
				// Make some trusses that cross over the entire cell.
				let trussStyle = getWeightedOption([[2,30], [3,5], [4,25], [5,20], [6,20]]); 
				let maxTrussLen = 140;
				for (let i=0; i<nTrusses; i++){
					let transformResult = this.myDistanceTransformer.computeDistanceTransform(false, -1, 
						this.myParticles, this.myStructures); 
					let rx = transformResult.dtx;
					let ry = transformResult.dty; 
					if ((ry > 0) && (rx > 0)){
						let trussTargetLen = int(maxTrussLen * myRandomAB(0.5, 1.0)); 
						let overrideStruct = {'style':trussStyle, 'initSize':5,'targetSize':trussTargetLen};
						this.addNewStructure(STRUCTURE_TYPE_TRUSS, rx,ry, overrideStruct); 
						maxTrussLen *= 0.5; 
						nObstacles++;
					}
					if (myRandom01() < 0.4){
						trussStyle = getWeightedOption([[2,30], [3,5], [4,25], [5,20], [6,20]]); 
					}
				}
				
				let bAddFillerBalloons = true; 
				let bAddAdditionalDecos = true;

				// Inflated loop balloons
				let decoAddtime = 100;
				let bPutDecoInAllBlobs = true;
				if (bAddFillerBalloons){
					let nFillerBalloons = getWeightedOption([[5,20],[7,30],[11,35],[13,10],[17,5]]);
					if (bIsRoot){ 
						// nFillerBalloons = getWeightedOption([[9,5],[11,35],[13,40],[17,15],[19,5]]);
					}
					/// print(" nFillerBalloons = " + nFillerBalloons + " " + bIsRoot); 

					let balloonStylePair = getWeightedOption(loopStylePairs);
					let balloonFillPow = myRandomAB(1.75,2.00);
					let tsMax = 65; 
					let tsMin = 40; 

					let tsRup = 1.0; //(bIsRoot) ? myRandomAB(1.0,1.5) : 1.0; 
					let npRup = (bIsRoot) ? myRandomAB(1.0,2.0) : 1.0; 
					// print("RUP " + nFillerBalloons + " " +  nf(tsRup,1,2) + " " + nf(npRup,1,2));

					for (let i=0; i<nFillerBalloons; i++){
						let deferFrame = i*20 + ((nObstacles>0)?40:5);
						let whichStyleOfPair = (myRandom01() < 0.2) ? 1 : 0; 
						let targetSize = int(map(nFillerBalloons,4,13, tsMax,tsMin));
						if (bIsRoot){
							if (myRandom01() < 0.1){
								targetSize += 20; 
							}
						}

						if ((whichStyleOfPair == 1) && (balloonStylePair[0] != balloonStylePair[1])){
							targetSize = int(targetSize * myRandomAB(0.50, 0.75)); 
						}
						let nDeferredParticles = int( Math.pow((targetSize/TWO_PI), balloonFillPow));
						if (bIsRoot){
							nDeferredParticles = int(nDeferredParticles * npRup); 
							if (myRandom01() < 0.1){
								nDeferredParticles = int(nDeferredParticles * 1.5); 
							}
						}

						

						let loopOverrideStruct = {
							'style': balloonStylePair[whichStyleOfPair],
							'targetSize':  targetSize,
							'bAddDeferredParticleGroup':true, 
							'howManyDeferredParticles': nDeferredParticles,
							'delayToAddParticles':60  }; 
						this.addDeferredStructure(0, STRUCTURE_TYPE_LOOP, 1, deferFrame, loopOverrideStruct);
					}

					decoAddtime = 90 + nObstacles*10 + nFillerBalloons*20;
					let decoTarget = 2+nObstacles+ myRandomInt(0, nFillerBalloons-1);
					let decoType1 = getWeightedOption([[STRUCTURE_TYPE_BALL,40],[STRUCTURE_TYPE_TRUSS,60]]);
					this.addDeferredStructure(decoTarget, decoType1, myRandomInt(1,5), decoAddtime, null);
				

					// Put some decorations inside all of the blobs
					bPutDecoInAllBlobs = (myRandom01() < 0.75); 
					if (bPutDecoInAllBlobs){
						let nucStyleOptions = [[0,15],[1,10],[2,40],[3,10],[5,10],[6,15]];
						let nucStyle = getWeightedOption(nucStyleOptions); 
						let nucTargetSize = myRandomInt(10,12);
						let maxNdecos = 3+nObstacles+nFillerBalloons;

						for (let i=(1+nObstacles); i<maxNdecos; i++){
							let ts = nucTargetSize + getWeightedOption([[0,70],[2,30]]);

							let overrideStruct = {'style':nucStyle, 'initSize':2, 'targetSize': ts }
							if (i == decoTarget){ overrideStruct.style = getWeightedOption(nucStyleOptions); }
							let dat = decoAddtime + 5 + i*3;
							this.addDeferredStructure(i, STRUCTURE_TYPE_LOOP, 1, dat, overrideStruct);
						}
					}
				}

				// Put some decorations in the overall cell
				if (bAddAdditionalDecos){
					let nMainDecoSets = 1; 
					if ((!bPutDecoInAllBlobs) || (myRandom01() < 0.1)){ nMainDecoSets = 2; }
					for (let i=0; i<nMainDecoSets; i++){
						this.theStyleSheet.lineStructureLengthTarget = 6;
						this.theStyleSheet.lineStructureLengthVariance = 2;
						this.theStyleSheet.lineStructureUseGreedyGrowth = false;
						let decoStruct2 = getWeightedOption([
							[[STRUCTURE_TYPE_DASH, 7,28],25],
							[[STRUCTURE_TYPE_LINE, 5,15], 35],
							[[STRUCTURE_TYPE_STAR, 1,5],  40]]);
						let nDeco2 = myRandomInt(decoStruct2[1], decoStruct2[2]);
						let timeDeco2 = decoAddtime + (i+1)*60;
						this.addDeferredStructure(0, decoStruct2[0], nDeco2, timeDeco2, null);
					}
				}

				break;

			//---------------------------------------------------------------
			case 103:
				{
					this.theStyleSheet.bLoopsGrowAtHighestCurvature = false;
					this.theStyleSheet.bLoopUseGreedyGrowth = false; 
					this.theStyleSheet.progressivelyAddType == STRUCTURE_TYPE_LOOP;
					let membraneStructureId = 0;
					let nDividerTrusses = 0; //getWeightedOption([[2,45],[3,50],[4,5]]); 
					if (nDividerTrusses > 0){
						this.addDividerTruss(membraneStructureId, nDividerTrusses); 
					}

					let rxs = [];
					let idsOfBlobs = [];
					let nBlobsToAdd = 2; 
					
					let bInitializeWithWheels = !false; 
					let initialAddType = STRUCTURE_TYPE_LOOP; 
					this.theStyleSheet.progressivelyAddedBlobStylePair = getWeightedOption(loopStylePairs);
					let blobTargetSize = getWeightedOption([[50,30], [150,60], [250,10]]) + myRandomInt(-5,5); 

					if (bInitializeWithWheels){
						this.resampledNoisyBlobPolyline = new ofPolyline();
						for (let i=0; i<this.nMaskPoints; i++){
							this.resampledNoisyBlobPolyline.add(this.myParticles[i].p.x, this.myParticles[i].p.y, 0); 
						} let contourArea = Math.abs(polygonArea(this.resampledNoisyBlobPolyline.points)); 
						let areaBasedWheelSize = int(TWO_PI*(Math.sqrt((contourArea/nBlobsToAdd)/PI))/this.REST_L);
						let wheelSizes = [int(areaBasedWheelSize*1.0), int(areaBasedWheelSize*1.52), int(areaBasedWheelSize*2.33) ]

						initialAddType = STRUCTURE_TYPE_WHEEL; 
						this.theStyleSheet.progressivelyAddedBlobStylePair = getWeightedOption(wheelStylePairs);
						this.theStyleSheet.bDrawEncircledSiteBlobs = false; 
						this.theStyleSheet.bDrawVoronoiDiagram = !false;
						let whichSize = getWeightedOption([[0,40], [1,30], [2,30]]);
						blobTargetSize = wheelSizes[whichSize];
					}
				
					for (let i=0; i<nBlobsToAdd; i++){
						let transformResult = this.myDistanceTransformer.computeDistanceTransform(
							false, -1, this.myParticles, this.myStructures); 
						let rx = transformResult.dtx;
						let ry = transformResult.dty; 
						if ((ry > 0) && (rx > 0)){
							rxs.push(rx) ; 
							let blobStyle = this.theStyleSheet.progressivelyAddedBlobStylePair[0];
							let overrideStruct = {'style':blobStyle, 'initSize':5, 'targetSize':blobTargetSize};
							this.addNewStructure(initialAddType, rx,ry, overrideStruct); 
							idsOfBlobs.push(this.myStructures.length-1); 
							this.myStructures[this.myStructures.length-1].bDisplayVoronoiCells = this.myStructures[idsOfBlobs[0]].bDisplayVoronoiCells;
							this.myStructures[this.myStructures.length-1].bDisplayVoronoiEdges = this.myStructures[idsOfBlobs[0]].bDisplayVoronoiEdges;
						}
						if (i==1){
							if (((rxs[0] > 0.5) && (rxs[1] > 0.5)) ||
								((rxs[0] < 0.5) && (rxs[1] < 0.5))){
									nBlobsToAdd = 4; 
							}
						}
					}
				
					this.theStyleSheet.bEnableProgressivelyAddedLoopsOrWheels = true;
					if ((blobTargetSize < 200) && (!bInitializeWithWheels)){
						this.theStyleSheet.bLoopDisplayEnclosedBlobs = (myRandomA(1.0) < 0.25);
						this.theStyleSheet.bLoopUseGreedyGrowth = false; 
						this.theStyleSheet.siteBlobFillColor = 255;
						this.theStyleSheet.progressivelyAddType = STRUCTURE_TYPE_LOOP;
						this.theStyleSheet.maxNProgressivelyAddedBlobs = 100;
						this.theStyleSheet.addStructureFrameDuration = int(getSkewedGaussian(350,800, 1.0,-0.22));
						this.theStyleSheet.addStructureFrameCycle = int(getSkewedGaussian(5,45, 0.45,-0.20)); 
						this.theStyleSheet.blobTargetLengthNudgeFactor = myRandomAB(0.75,1.00); 
						this.theStyleSheet.proportionOfParticlesToAddToBlobs = getWeightedOption([[0.00,80], [0.15,10], [0.50,10]]); 
						this.theStyleSheet.blobInteriorExteriorBalance = getWeightedOption([[0.8,1], [1.0,99]]); 
						this.theStyleSheet.minDistInRestLengths = getSkewedGaussian(0.25,4.00, 0.75,-0.50);
						this.theStyleSheet.minOccupancyForProgressivelyAddedBlobs = myRandomAB(0.15, 0.25); // NEEDS ATTENTION
					}
					
					if (( blobTargetSize < 100) || ( blobTargetSize > 200)){
						let whichType = getWeightedOption([
							[STRUCTURE_TYPE_DASH, 25], 
							[STRUCTURE_TYPE_STAR, 25],
							[STRUCTURE_TYPE_TRUSS,35],
							[STRUCTURE_TYPE_LINE, 10],
							[STRUCTURE_TYPE_BALL,  5],
						]); 
						this.addDeferredInteriorDecorationSet(idsOfBlobs, this.simulationFrameCount+200,40, whichType);
					} else {
						let nDashes = 100; //getWeightedOption([[10,50], [50,50]]); 
						this.addDeferredInteriorDecorationSet(idsOfBlobs, this.simulationFrameCount+200,nDashes, STRUCTURE_TYPE_DASH);
						if (myRandomA(1.0) < 0.50) {
							let nBalls = getWeightedOption([[1,80], [5,20]]); 
							this.addDeferredInteriorDecorationSet(idsOfBlobs, this.simulationFrameCount+150,nBalls, STRUCTURE_TYPE_BALL);
						} else {
							this.addDeferredInteriorDecorationSet(idsOfBlobs, this.simulationFrameCount+150,2, STRUCTURE_TYPE_CENTI);
						}
					}
					if (bInitializeWithWheels){
						if ((blobTargetSize < 300) || (nBlobsToAdd < 4)){
							let nFillerBalloons = getWeightedOption([[2,5], [4,75], [6,20]]); 
							let balloonStylePair = getWeightedOption(loopStylePairs);
							for (let i=0; i<nFillerBalloons; i++){
								let overrideStruct = {
									'style': balloonStylePair[0],
									'targetSize': myRandomInt(30,50), 
									'bAddDeferredParticleGroup':true, 
									'howManyDeferredParticles':40,
									'delayToAddParticles':60}; 
								this.addDeferredStructure(0, STRUCTURE_TYPE_LOOP, 1, 250+i*20, overrideStruct);
							}
						}

						if (this.myStructures[idsOfBlobs[0]].bDisplayVoronoiEdges == false){
							this.theStyleSheet.bDrawEncircledSiteBlobs = true;
						}
					}
				}
				break;

				//--------------------------------------------------------
			case 108: // Flocks with a truss and nucleus
				{
					// Add a long truss to mix things up
					let bAddInterruptingTruss = (myRandom01() < 0.625);
					let interruptingTrussTargetLen = 50;
					const massiveTrussLen = myRandomInt(320,400); 
					let indexOfTruss = -1;
					if (bAddInterruptingTruss){
						let trussStyle = getWeightedOption([[0,5],[1,5],[2,27],[3,25],[4,20],[5,15],[6,3]]); 
						let maxTrussLen = 150;
						let transformResult = this.myDistanceTransformer.computeDistanceTransform(false, -1, this.myParticles, this.myStructures); 
						let rx = transformResult.dtx; 
						let ry = transformResult.dty; 
						if ((ry > 0) && (rx > 0)){
							interruptingTrussTargetLen = int(maxTrussLen * myRandomAB(0.5, 1.0)); 
							if ((this.theStyleSheet.THE_SCHEMA == 108) && (this.REST_L <= 10)){
								if (myRandom01() < 0.25){ interruptingTrussTargetLen = massiveTrussLen;}
							}
							let overrideStruct = {'style':trussStyle, 'initSize':5,'targetSize':interruptingTrussTargetLen};
							this.addNewStructure(STRUCTURE_TYPE_TRUSS, rx,ry, overrideStruct); 
							indexOfTruss = this.myStructures.length-1;
						}
					}

					// Add some wheel obstacles
					let nWheelObstacles = getWeightedOption([[0,30], [1,35], [2,25], [3,10]]); 
					if (interruptingTrussTargetLen == massiveTrussLen){ 
						nWheelObstacles = max(0, nWheelObstacles-1);}
					if (!bAddInterruptingTruss && (myRandom01() < 0.75)){
						nWheelObstacles = max(1, nWheelObstacles);}
					let wheelObstacleSize = 58 + 2*myRandomInt(0,3); 
					let wheelObstacleSizeInit = wheelObstacleSize;
					let indexOfFirstWheel = -1;
					let bFirstWheelIsHuge = false;
					let styleOfWheels = (nWheelObstacles > 1) ? 
						getWeightedOption([[9,55], [0,10],[5,10],[7,10],[17,5],  [1,1],[3,1],[6,1],[13,6],[16,1] ]) : 
						getWeightedOption([[9,55], [11,15],[17,15],[16,5], [5,7],[6,3]]);
					if ((nWheelObstacles == 1) && (bAddInterruptingTruss == false)){
						if (myRandom01() < 0.6){ 
							wheelObstacleSize = 96; 
							bFirstWheelIsHuge = true;
						}
					}
					for (let i=0; i<nWheelObstacles; i++){
						let transformResult = this.myDistanceTransformer.computeDistanceTransform(false, -1, this.myParticles, this.myStructures); 
						let rx = transformResult.dtx; 
						let ry = transformResult.dty; 
						let overrideStruct = {'style':styleOfWheels, 'initSize':wheelObstacleSize,'targetSize':wheelObstacleSize}; 
						this.addNewStructure(STRUCTURE_TYPE_WHEEL, rx,ry, overrideStruct);
						if (i==0){ indexOfFirstWheel = this.myStructures.length-1; }
						wheelObstacleSize -= 20; 
					}
					// Add some goodies inside the first wheel
					if (indexOfFirstWheel > 0){

						if (bFirstWheelIsHuge){
							let bAddParticlesToFirstWheel = (myRandom01() < 0.375);
							let bAddTinyWheelToFirstWheel = (myRandom01() < 0.284);
							let bAddBallToFirstWheel      = (myRandom01() < 0.284);
							
							if (bAddParticlesToFirstWheel){
								let nr = getWeightedOption([ [40,70], [80,25], [100,5] ]);
								this.addDeferredParticleGroup(indexOfFirstWheel, myRandomInt(nr/2,nr), 8);
								let doit = getWeightedOption([ [[1,0],70], [[1,1],20], [[0,1],10] ]);
								if (doit[0] == 1){ this.myStructures[indexOfFirstWheel].bDisplayVoronoiCells = true; }
								if (doit[1] == 1){ this.myStructures[indexOfFirstWheel].bDisplayEnclosedBlobs = true; }
							}
							if (bAddTinyWheelToFirstWheel){
								let oStruct = {
									'style':getWeightedOption([[0,20],[6,10],[7,15],[8,5],[9,10],[10,10],[16,15],[17,15]]),
									'initSize':10, 'targetSize':10
								}
								this.addDeferredStructure(indexOfFirstWheel, STRUCTURE_TYPE_WHEEL, 1, 60, oStruct);
							}
							if (bAddBallToFirstWheel){
								this.addDeferredStructure(indexOfFirstWheel, STRUCTURE_TYPE_BALL, 1, 60, null);
							}
							if (!bAddBallToFirstWheel && !bAddTinyWheelToFirstWheel && !bAddParticlesToFirstWheel){
								if (myRandom01() < 0.25){
									let starStyle = getWeightedOption([[1,10],[3,88],[6,2]]);
									let starSize = myRandomInt(3,6);
									let starStruct = {'style':starStyle, 'initSize':0, 'nSpokes':myRandomInt(5,7), 'targetSize':starSize};
									this.addDeferredStructure(indexOfFirstWheel, STRUCTURE_TYPE_STAR, 1, 60, starStruct);
								}
							}
						}
						if (styleOfWheels == 11){
							this.addDeferredParticleGroup(indexOfFirstWheel, myRandomInt(20,50), 8);
						} else {
							let transformResult = this.myDistanceTransformer.computeDistanceTransform(
								false, indexOfFirstWheel, this.myParticles, this.myStructures); 
							let rx = transformResult.dtx; let ry = transformResult.dty; 
							let whichStuffing = getWeightedOption([ 
								[STRUCTURE_TYPE_WHEEL,90],
								[STRUCTURE_TYPE_URCHIN,5],
								[-1, 5]
							]);

							switch (whichStuffing){
								case -1: 
									break;
								case STRUCTURE_TYPE_URCHIN:
									this.addNewStructure(STRUCTURE_TYPE_URCHIN, rx,ry, null);
									break;
								case STRUCTURE_TYPE_WHEEL:
									let interiorWheelStyle = getWeightedOption([[0,25],[6,15],[7,24],[8,5],[9,15],[10,11],[16,5]]);
									while (interiorWheelStyle == styleOfWheels){
										interiorWheelStyle = getWeightedOption([[0,25],[6,15],[7,24],[8,5],[9,15],[10,11],[16,5]]);
									}
									let delta = 2*myRandomInt(5,11);
									let overrideStruct = {
										'style':interiorWheelStyle, 
										'initSize':wheelObstacleSizeInit-delta, 
										'targetSize':wheelObstacleSizeInit-delta}; 
									this.addNewStructure(STRUCTURE_TYPE_WHEEL, rx,ry, overrideStruct);
									let indexOfInteriorWheel = this.myStructures.length-1;
									
									let prob = myRandom01(); 
									if (prob < 0.20){ // Balls
										let ballNum = 1+2*myRandomInt(1,3);
										this.addDeferredStructure(indexOfInteriorWheel, STRUCTURE_TYPE_BALL, ballNum, 10, null);
									} else if (prob < 0.55){ // Truss pips
										let trussStyle2 = getWeightedOption([[0,30],[3,40],[4,20],[6,10]]); 
										let trussTargetLen = (trussStyle2 == 6) ? 1 : myRandomInt(2,3);
										let trussNum = (trussTargetLen == 3) ? 1+2*myRandomInt(1,2) : 1+2*myRandomInt(1,5);
										let trussStruct = {'style':trussStyle2, 'initSize':trussTargetLen,'targetSize':trussTargetLen};
										this.addDeferredStructure(indexOfInteriorWheel, STRUCTURE_TYPE_TRUSS, trussNum, 10, trussStruct);
									} else if (prob < 0.95){ // Smorgasbord
										this.addDeferredStructure(indexOfInteriorWheel, STRUCTURE_TYPE_STAR, myRandomInt(2,5), 11,null);
										this.addDeferredStructure(indexOfInteriorWheel, STRUCTURE_TYPE_TREE, myRandomInt(1,2), 12,null);
										this.addDeferredStructure(indexOfInteriorWheel, STRUCTURE_TYPE_CENTI, myRandomInt(1,2), 14,null);
										this.addDeferredStructure(indexOfInteriorWheel, STRUCTURE_TYPE_LOOP, 1, 18,null);
									} else if (prob < 1.00){ // compounds
										this.myStructures[indexOfInteriorWheel].bDisplayEnclosedBlobs = false; 
										this.myStructures[indexOfInteriorWheel].bDisplayVoronoiCells = false;
										let compStr = getWeightedOption([[STRUCTURE_TYPE_TICK,20],[STRUCTURE_TYPE_STARBALL,70],[STRUCTURE_TYPE_SLAB,10]]); 
										this.addNewCompoundStructure(compStr, rx, ry, null);
									}
									break;
							}
						}
					} 
					
					// Add additional loops
					let nLoopRanges = getWeightedOption([ [[1,5],65],  [[6,10],30],  [[11,20],5] ]);
					let nAdditionalLoops = myRandomInt(nLoopRanges[0],nLoopRanges[1]);
					if (bAddInterruptingTruss){ nAdditionalLoops = max(1, nAdditionalLoops-1);}
					if (nWheelObstacles > 0)  { nAdditionalLoops = max(1, nAdditionalLoops-1);}

					let additionalLoopStyle = getWeightedOption([[2,15], [4,5], [5,50], [6,30]]);
					let bLoopStyleParty = getWeightedOption([[false,80], [true,20]]);
					let loopSmallSize = myRandomInt(10,12);
					let loopLargeSize = myRandomInt(16,19);
					if (nWheelObstacles == 0) { loopSmallSize += 3; }
					this.theStyleSheet.loopSizeVariance = 0;

					let nLargeLoops = 0; 
					for (let i=0; i<nAdditionalLoops; i++){ 
						let loopSize = getWeightedOption([[loopSmallSize,70], [loopLargeSize,30]]);
						if (loopSize == loopLargeSize){ nLargeLoops++;}
						if ((i == (nAdditionalLoops-1)) && (nLargeLoops == 0)){ loopSize = 15; }
						
						let overrideStruct = {
							'style': ((bLoopStyleParty) ? getWeightedOption([[2,15], [4,15], [5,40], [6,30]]) : additionalLoopStyle),
							'targetSize': loopSize,
							'howManyDeferredParticles': getWeightedOption([[10,25], [0,75]]),
							'bAddDeferredParticleGroup': true,
							'delayToAddParticles':20
						};  
						this.addDeferredStructure(0, STRUCTURE_TYPE_LOOP, 1, 2+i*5, overrideStruct);
					}

					// Lengthen our truss if it's lonely
					if ((indexOfTruss > 0) && (nAdditionalLoops < 5) && (indexOfFirstWheel == -1)){
						if (myRandom01() < 0.666) {
							if (interruptingTrussTargetLen != massiveTrussLen){
								this.myStructures[indexOfTruss].growthSizeLimit += myRandomInt(90,120);
								this.myStructures[indexOfTruss].bGrowing = true; 
							}
						}
					}

					// Add flocks!
					let transformResult = this.myDistanceTransformer.computeDistanceTransform(false, -1, this.myParticles, this.myStructures); 
					if (transformResult.area == 0){ transformResult.area = 10000; }
					let factors = getWeightedOption([[[1.0,1.0],20], [[0.4,0.4],20], [[1.1,0.15],15], [[0.15,1.1],20], [[0.2,0.2],5], [[1.0,0.0],15], [[0.0,1.0],5] ]);
					let nDashes = int(factors[0] * transformResult.area / 125);
					let nLines  = int(factors[1] * transformResult.area / 175);
					if (interruptingTrussTargetLen == massiveTrussLen){
						nLines = int(nLines * myRandomAB(0.10, 0.35)); 
					}
					this.addDeferredInteriorDecorationSet([0], 5, nLines, STRUCTURE_TYPE_LINE);
					this.addDeferredInteriorDecorationSet([0], 5, nDashes, STRUCTURE_TYPE_DASH);

					if ((factors[0] < 0.25) || (factors[1] < 0.25)){
						if (myRandom01() < 0.5){
							let nParticlesToAdd = getWeightedOption([[50,85], [100,15]]);
							this.addDeferredParticleGroup(0, nParticlesToAdd, 120);
						}
					}
					if (nLines == 0){
						if ((nWheelObstacles == 0) || (myRandom01() < 0.1)){
							let nTrusses = int(nDashes * 0.1);
							this.addDeferredInteriorDecorationSet([0], 5, nTrusses, STRUCTURE_TYPE_TRUSS);
						}
					}
					// Add some rare junk
					if (nWheelObstacles == 0){
						if (myRandom01() < 0.3){
							let transformResult = this.myDistanceTransformer.computeDistanceTransform(false, -1, this.myParticles, this.myStructures); 
							let rx = transformResult.dtx; let ry = transformResult.dty; 
							let nThings = getWeightedOption([[1,85], [2,10], [3,5]]);
							let thingType = getWeightedOption([
								[STRUCTURE_TYPE_STAR,45], 
								[STRUCTURE_TYPE_BALL,25], 
								[STRUCTURE_TYPE_TRUSS,20],
								[STRUCTURE_TYPE_TREE,10]
							]);
							for (let i=0; i<nThings; i++){
								this.addNewStructure(thingType, rx,ry, null);
							}
						}
					}
				}
				break;

			case 105:
				{
					this.theStyleSheet.wheelStylePairMode = WHEEL_PAIR_STYLE_MODE_HALFMONOCULTURE;
					this.theStyleSheet.deferredStructureMinimumDistanceThreshold = 1.1;
					this.theStyleSheet.bEnableProgressivelyAddedLoopsOrWheels = false;
					this.theStyleSheet.bLoopsGrowAtHighestCurvature = false;
					this.theStyleSheet.bDrawEncircledSiteBlobs = false;
					this.theStyleSheet.bLoopUseGreedyGrowth = false; 
					this.theStyleSheet.lineStructureUseGreedyGrowth = false;

					let outerWheelSize = 64;
					let outerWheelRandomness = 0; 
					let bAddMainParticles = false;
					let bAddUrchin = false;
					let bMainUrchinGetsAnInnerWheel = true;
					let bAddDashMedium = false;
					let bAddLineMedium = false;
					let crowdingFactor = 0.40; 
					let contourArea = 100000; 
					let bInflateInnerWheelsWithPoints = false;
					let bAddedDividerTruss = false;
					let bAllContentsAreUrchins = false;
					let iterationToAddUrchin = 1; 
					let bAddIckyStar = false;
					let bStarsLonga = false;
					let bAddIckyCenti = false;
					let bAddExtraGoody = false;
					let bAddTrussSet = false;
					let bAddFillerBalloons = false;
					let bAddFreakyTruss = false;
					let bAddExtraTrussCollection = false;

					let nBlobsToAdd = 3;
					const innerAddBaseFrame = 45; 
					const pixelsPerSegment = 10.41;

					if (this.theStyleSheet.THE_SCHEMA == 105){ // amorphous

						let nDividerTrusses = 0; 
						let bTryToAddDividerTruss = (myRandom01() < 0.0005);
						if (bTryToAddDividerTruss){ 
							nDividerTrusses = getWeightedOption([[2,30],[3,67],[4,3]]); 
							bAddedDividerTruss = this.addDividerTruss(0, nDividerTrusses); 
						} 
						if (bAddedDividerTruss){
							this.theStyleSheet.doMembraneExtraInnerMembrane = true;
						}

						this.theStyleSheet.bDrawEncircledSiteBlobs = false;
						this.theStyleSheet.wheelStylePairMode = getWeightedOption([
							[WHEEL_PAIR_STYLE_MODE_PARTY,30],
							[WHEEL_PAIR_STYLE_MODE_MONOCULTURE,8],
							[WHEEL_PAIR_STYLE_MODE_HALFMONOCULTURE,62]]);

						if (this.theStyleSheet.wheelStylePairMode == WHEEL_PAIR_STYLE_MODE_HALFMONOCULTURE){
							this.theStyleSheet.bDrawVoronoiDiagram = getWeightedOption([[true,55], [false,45]]); 
						} else{	
							this.theStyleSheet.bDrawVoronoiDiagram = getWeightedOption([[true,15], [false,85]]); }
						if (this.theStyleSheet.bDrawVoronoiDiagram == false){
							if (myRandom01() < 0.15){
								bInflateInnerWheelsWithPoints = true;
								this.theStyleSheet.bDrawEncircledSiteBlobs = true; 
							}
						}

						bAddMainParticles = getWeightedOption([[true,35],[false,65]]); 
						if (bAddMainParticles){
							bAddDashMedium = getWeightedOption([[true,20],[false,80]]); 
						} else {	
							bAddDashMedium = getWeightedOption([[true,10],[false,90]]); 
							if (!bAddDashMedium){
								bAddLineMedium = getWeightedOption([[true,15],[false,85]]); 
							}
						}
						
						let outerWheelSizeLimits = getWeightedOption([[[55,65],5], [[70,80],80], [[80,110],15]]); 
						let owsMin = outerWheelSizeLimits[0]; 
						let owsMax = outerWheelSizeLimits[1];
						outerWheelSize = myRandomInt(owsMin,owsMax);

						crowdingFactor = myRandomAB(0.40, 0.45); 
						if (this.nestedLevel == 0){
							// crowdingFactor += 0.10; 
						} else {
							crowdingFactor *= 0.8; 
						}

						outerWheelRandomness = getWeightedOption([[0,15], [32,85]]); 
						if (outerWheelRandomness == 0){
							this.theStyleSheet.wheelStylePairMode = WHEEL_PAIR_STYLE_MODE_MONOCULTURE;
						}
						if(this.nestedLevel == 0){
							outerWheelRandomness+=16; 
						}

						if (bAddMainParticles == false){
							bAddUrchin = getWeightedOption([[true,47], [false,53]]);
						} else {
							bAddUrchin = getWeightedOption([[true,10], [false,90]]);
						}
						bAllContentsAreUrchins = false; //(myRandom01() < 0.125); 


						if (bAddUrchin){
							if (myRandom01() < 0.75){ 
								bAddLineMedium = false; 
							}
							if (this.nestedLevel > 0){
								crowdingFactor -= 0.10;
							}
							if (this.theStyleSheet.bDrawVoronoiDiagram){
								if (myRandom01() < 0.15) {
									this.theStyleSheet.bDrawVoronoiDiagram = false;
								}
							}
						} 
						iterationToAddUrchin = (myRandom01() < 0.15) ? 0:1; /// 1 is off-center

						bAddIckyCenti = (myRandom01() < 0.03);
						bAddExtraTrussCollection = (myRandom01() < 0.07);
						if (!bAddedDividerTruss){
							bAddIckyStar = (myRandom01() < 0.75); 
							if (bAddIckyStar){ bStarsLonga = (myRandom01() > 0.95); }
							if (!bAddIckyCenti && !bAddIckyStar){
								bAddExtraGoody = (myRandom01() < 0.02);
								bAddIckyCenti = (myRandom01() < 0.18);
							}
						} else {
							bAddIckyStar = (myRandom01() < 0.333);
							if (!bAddIckyStar){
								bAddExtraGoody = (myRandom01() < 0.03);
							} else {
								bAddExtraGoody = (myRandom01() < 0.01);
							}
						}
						
						this.resampledNoisyBlobPolyline = new ofPolyline();
						for (let i=0; i<this.nMaskPoints; i++){
							this.resampledNoisyBlobPolyline.add(this.myParticles[i].p.x, this.myParticles[i].p.y, 0); 
						} contourArea = Math.abs(polygonArea(this.resampledNoisyBlobPolyline.points)); 
						nBlobsToAdd = int((contourArea*4)/(PI*sq(outerWheelSize*pixelsPerSegment/TWO_PI))*crowdingFactor);

						if (!bAddDashMedium && !bAddMainParticles && !bAddedDividerTruss && !bAddIckyStar && (nBlobsToAdd > 6)){
							if (myRandom01() < 0.85){ bAddFillerBalloons = true; }
						}
						
						if (!bAddedDividerTruss){
							let trussProb = map(nBlobsToAdd,2,9, 0.60,0.00, true);
							if (myRandom01() < trussProb){
								bAddFreakyTruss = true;
							}
						}
					} 

					if (bAddExtraTrussCollection){ 
						this.addDeferredInteriorDecorationSet([0], 240, myRandomInt(10,25), STRUCTURE_TYPE_TRUSS);
					}
					if (bAddUrchin && (myRandom01()<0.2)){ nBlobsToAdd = max(1, nBlobsToAdd-1);}

					let wheelStylePair = getWeightedOption(wheelStylePairs);
					let urchinStructureId = -1; 
					let lastDeferTime = 0; 
					let bDoIntenstines = (myRandom01() < 0.01);// rare

					for (let i=0; i<nBlobsToAdd; i++){
						let transformResult = this.myDistanceTransformer.computeDistanceTransform(false, -1, this.myParticles, this.myStructures); 
						let rx = transformResult.dtx;
						let ry = transformResult.dty; 
						if ((ry > 0) && (rx > 0)){

							// Add urchin if called for
							if ((i==iterationToAddUrchin) && (bAddUrchin == true)){
								let urchinSpineLen = getWeightedOption([[2,15],[3,50],[4,30],[5,3],[6,1],[7,1]]); 
								let urchinStyle = getWeightedOption([[0,20],[1,40],[2,10],[3,25],[4,5]]);
								let urchinLen = 60;
								let overrideStructUrchin = {'style':urchinStyle, 'spineLen':urchinSpineLen, 'urchinLen':urchinLen};
								this.addNewStructure(STRUCTURE_TYPE_URCHIN, rx,ry, overrideStructUrchin);
								urchinStructureId = this.myStructures.length-1;
								let whenToAdd = innerAddBaseFrame + i;

								if (bMainUrchinGetsAnInnerWheel){
									let innerWheelSize = Math.round(urchinLen * 0.70);
									let iwsty = myRandomInt(4,12);
									if (myRandom01() < 0.30){
										iwsty = getWeightedOption([[15,30],[16,70]]);
										if (innerWheelSize%4 != 0){ innerWheelSize += (4-innerWheelSize%4);}
									}
									let overrideStructInner = {
										'style': iwsty,
										'initSize':5, 
										'targetSize': innerWheelSize,
										'bAddDeferredParticleGroup': false,///
										'howManyDeferredParticles': 10,
										'delayToAddParticles':30
									};  
									this.addDeferredStructure(urchinStructureId, STRUCTURE_TYPE_WHEEL, 1, whenToAdd, overrideStructInner);
								} 
							
							// Add wheels with inner wheels
							} else {
								
								// Usual case
								let innerWheelStyle = 0;
								let outerWheelStyle = 0; 
								if (this.theStyleSheet.wheelStylePairMode == WHEEL_PAIR_STYLE_MODE_MONOCULTURE){
									outerWheelStyle = wheelStylePair[0];
									innerWheelStyle = wheelStylePair[1];
								} else if (this.theStyleSheet.wheelStylePairMode == WHEEL_PAIR_STYLE_MODE_PARTY){
									wheelStylePair = getWeightedOption(wheelStylePairs);
									outerWheelStyle = wheelStylePair[0];
									innerWheelStyle = wheelStylePair[1];
								} else if (this.theStyleSheet.wheelStylePairMode == WHEEL_PAIR_STYLE_MODE_HALFMONOCULTURE){
									let count = 0; 
									outerWheelStyle = wheelStylePair[0];
									let wsp = getWeightedOption(wheelStylePairs);
									while ((count < 100) && (wsp[0] != wheelStylePair[0])){
										wsp = getWeightedOption(wheelStylePairs); count++;
									}
									innerWheelStyle = wsp[1];
								} 
								if (bDoIntenstines){ 
									innerWheelStyle = getWeightedOption([[15,15],[16,85]]); 
									outerWheelStyle = getWeightedOption([[15, 5],[16,95]]); 
								}

								// Add outer wheels
								let ows = outerWheelSize + int(outerWheelRandomness * myRandomAB(-1,1)); 
								if ((outerWheelStyle == 16) && (ows%4 != 0)){ ows += (4-ows%4);}
								if ((i==2) && (myRandom01() < 0.5) && (nBlobsToAdd < 7)) { ows = Math.floor(ows * 1.25); }

								let dows = 0; 
								if (this.nestedLevel == 0){dows = int(ows * 0.5);}
								let overrideStructOuter = {'style':outerWheelStyle, 'initSize':5, 'targetSize':ows+dows};
								this.addNewStructure(STRUCTURE_TYPE_WHEEL, rx,ry, overrideStructOuter); 
							
								// Add inner wheels
								let toWhichStructureId = this.myStructures.length-1; 
								let whenToAdd = innerAddBaseFrame + i;
								let innerWheelSize = ows-24;
								let nParticlesToAddToInner = int(innerWheelSize * myRandomAB(0.05, 0.20));
								if(this.nestedLevel == 0){
									nParticlesToAddToInner = int(innerWheelSize * myRandomAB(0.15, 0.30));
								}

								let overrideStructInner = {
									'style': innerWheelStyle,
									'initSize':6, 
									'targetSize': innerWheelSize,
									'bAddDeferredParticleGroup': getWeightedOption([[false,20],[bInflateInnerWheelsWithPoints,80]]),
									'howManyDeferredParticles': nParticlesToAddToInner,
									'delayToAddParticles':30
								};  
								this.addDeferredStructure(toWhichStructureId, STRUCTURE_TYPE_WHEEL, 1, whenToAdd, overrideStructInner);
								lastDeferTime = max(lastDeferTime, whenToAdd); 

								
							}
						}
					}
					
					if (bAddFillerBalloons){
						let nFillerBalloons = 2; 
						let reduce = 0.25; 
						if (this.theStyleSheet.THE_SCHEMA == 105){
							nFillerBalloons = getWeightedOption([[1,5],[2,10],[3,30],[4,30],[5,20],[6,5]]);
							reduce = 0.10; 
						}

						let balloonScale = Math.round( map(contourArea, 100000,200000, 50,100, true) - (nBlobsToAdd*7.5));
						balloonScale = constrain(balloonScale, 10,100);
						let particleFrac = myRandomAB(0.2, 0.4);
						let balloonStyle = getWeightedOption([[1,5],[2,15],[5,25],[6,55]]);
						if (this.theStyleSheet.bDrawEncircledSiteBlobs){ 
							this.theStyleSheet.bDrawEncircledSiteBlobs = (myRandom01() < 0.28);
						}

						for (let j=0; j<nFillerBalloons; j++){
							let targetSize = balloonScale * (1.0 - j*reduce); 
							let howManyDeferredParticles = int(particleFrac * PI * sq(targetSize / TWO_PI));
							let overrideStruct = {
								'style': balloonStyle,
								'initSize': 5,
								'targetSize': targetSize, 
								'bAddDeferredParticleGroup':true, 
								'howManyDeferredParticles':howManyDeferredParticles,
								'delayToAddParticles':30}; 
							this.addDeferredStructure(0, STRUCTURE_TYPE_LOOP, 1, lastDeferTime+(j+1)*31, overrideStruct);
							if (this.theStyleSheet.wheelStylePairMode == WHEEL_PAIR_STYLE_MODE_PARTY){
								balloonStyle = getWeightedOption([[1,10],[2,15],[5,25],[6,50]]);
							}
						}
					} else {
						if (bAddExtraGoody){
							let transformResult = this.myDistanceTransformer.computeDistanceTransform(false, -1, this.myParticles, this.myStructures); 
							let rx = transformResult.dtx; let ry = transformResult.dty;
							if ((ry > 0) && (rx > 0)){
								if (myRandom01() < 0.15){
									let ts = getWeightedOption([[3,75],[6,25]]);
									let nSegs = getWeightedOption([[2,10],[3,55],[4,5],[5,30]]);
									let overrideStruct = {'style':ts, 'nSegments':nSegs, 'initSize':1, 'targetSize':1, 'initAng':(PI*0.25), 'bBallHead':false};
									this.addNewCompoundStructure (STRUCTURE_TYPE_TAPEWORM, rx, ry, overrideStruct); 
								} else {
									let as = getWeightedOption([[6,55],[2,40],[5,5]]);
									let na = (as == 5) ? getWeightedOption([[2,75],[4,25]]) : myRandomInt(4,5);
									let tl = getWeightedOption([[0,80],[1,20]]);
									let overrideStruct = {'antennaStyle':as, 'nAntennae':na, 'targLenSet':tl};
									this.addNewCompoundStructure (STRUCTURE_TYPE_TICK, rx, ry, overrideStruct); 
								}
							}
						}
					}
					

					if (bMainUrchinGetsAnInnerWheel || !bAddUrchin){
						let bAllFillingsSame = false;
						let nBallsSame = 0; 
						let nTrussSame = 0;
						if ((outerWheelRandomness == 0) && 
							(this.theStyleSheet.wheelStylePairMode == WHEEL_PAIR_STYLE_MODE_MONOCULTURE)){
							bAllFillingsSame = (myRandom01() < 0.9);
							if (myRandom01() < 0.5){
								nBallsSame = getWeightedOption([[0,5],[1,30],[2,45],[3,20]]);
							} else {
								nTrussSame = getWeightedOption([[0,5],[1,20],[3,55],[5,30]]);
							}
						}

						let hypotheticalLastIndex = this.myStructures.length-1 + nBlobsToAdd;
						this.theStyleSheet.treeStructureStyle = getWeightedOption([[0,40],[2,60]]);
						this.theStyleSheet.treeGrowthSizeLimit = myRandomInt(9,13); 
						this.theStyleSheet.maxSpringsPerParticle = 7; 
						this.theStyleSheet.treeStructureBranchDiminishFactor = 0.45;
						this.theStyleSheet.treeBranchMutualRepulsionFactor = 0.05;

						for (let i=0; i<nBlobsToAdd; i++){
							let toWhichStructureId = hypotheticalLastIndex-i;
							let nBallsToAdd = 0;
							let nTrussToAdd = 0;
							if (bAllFillingsSame){
								nBallsToAdd = nBallsSame; 
								nTrussToAdd = nTrussSame; 
							} else {
								if (myRandom01() < 0.85){ nBallsToAdd = getWeightedOption([[0,10],[1,30],[2,35],[3,25]]);} 
								if (myRandom01() < 0.85){ nTrussToAdd = getWeightedOption([[0,10],[1,20],[3,50],[5,30]]);}
							}

							if (bInflateInnerWheelsWithPoints && (myRandom01() < 0.95)){
								// do nothing; show point blobs instead.
							} else {
								if ((nBallsToAdd + nTrussToAdd) == 0){
									if (myRandom01() < 0.85){
										this.addDeferredInteriorDecorationSet([toWhichStructureId], lastDeferTime+40+i*6, 1, STRUCTURE_TYPE_STAR);
									} else {
										this.addDeferredInteriorDecorationSet([toWhichStructureId], lastDeferTime+40+i*6, 1, STRUCTURE_TYPE_TREE);
									}
								} else {
									this.addDeferredInteriorDecorationSet([toWhichStructureId], lastDeferTime+40+i*6, nBallsToAdd, STRUCTURE_TYPE_BALL);
									this.addDeferredInteriorDecorationSet([toWhichStructureId], lastDeferTime+43+i*6, nTrussToAdd, STRUCTURE_TYPE_TRUSS);
								}
							}
						}
					}

					
					// Add some flotsam.
					if (bAddDashMedium){
						let nDashesToAdd = getWeightedOption([[10,10],[30,70],[50,20]]);
						for (let i=0; i<nDashesToAdd; i++){
							this.addDeferredStructure(0, STRUCTURE_TYPE_DASH, 1, lastDeferTime+10+i*3, null);
						}
					}

					if (bAddLineMedium && !bAddedDividerTruss){
						let nLinesToAdd = getWeightedOption([[5,60],[10,30],[15,10]]);
						if (bAddIckyStar){
							nLinesToAdd = getWeightedOption([[5,60],[7,35],[9,5]]);
						}
						for (let i=0; i<nLinesToAdd; i++){
							this.addDeferredStructure(0, STRUCTURE_TYPE_LINE, 1, lastDeferTime+15+i*3, null);
						}
					}
					if (bAllContentsAreUrchins){
						if ((bAddLineMedium == false) && 
							(bAddDashMedium == false) && 
							(bAddMainParticles == false) && 
							(nBlobsToAdd <= 5)){

							let starSize = myRandomInt(6,11);
							let starStruct = {'style':3, 'initSize':0, 'nSpokes':7, 'targetSize':starSize};
							this.addDeferredStructure(0, STRUCTURE_TYPE_STAR, 1, lastDeferTime+33, starStruct);
						} else {
							if (!bAddLineMedium){
								if (bAddIckyCenti){
									let centiLen = getWeightedOption([[10,45],[15,30],[25,25]]);
									let centiStruct = {'style':myRandomInt(2,4), 'initSize':centiLen};  
									this.addDeferredStructure(0, STRUCTURE_TYPE_CENTI, 1, lastDeferTime+34, centiStruct);
								} else {
									this.addDeferredInteriorDecorationSet([0], lastDeferTime+44, myRandomInt(5,10), STRUCTURE_TYPE_TRUSS);
									if (myRandom01() < 0.15){
										this.addDeferredInteriorDecorationSet([0], lastDeferTime+45, myRandomInt(10,20), STRUCTURE_TYPE_TRUSS);
									}
								}
							} 
						}
					} else if (this.theStyleSheet.THE_SCHEMA == 105){
						if (bAddIckyCenti){
							let centiLen = getWeightedOption([[6,80],[10,20]]);
							let centiStruct = {'style':myRandomInt(0,4), 'initSize':centiLen};  
							this.addDeferredStructure(0, STRUCTURE_TYPE_CENTI, 1, lastDeferTime+34, centiStruct);
						}
						if (bAddIckyStar){
							let starStyle = getWeightedOption([[1,30],[3,70]]); 
							let starSize = ((bStarsLonga) ? 12:2) + myRandomInt(0,2);
							let starStruct = {'style':starStyle, 'initSize':0, 'targetSize':starSize};
							this.theStyleSheet.bDoStarCenterDot = (myRandom01() < 0.90);
							this.addDeferredStructure(0, STRUCTURE_TYPE_STAR, 1, this.simulationFrameCount+7, starStruct);
						}
					}
					
					if (bAddMainParticles){
						if (this.theStyleSheet.THE_SCHEMA != 105){
							let nParticlesToAdd = getWeightedOption([[40,66], [80,33]]); 
							this.addDeferredParticleGroup(0, nParticlesToAdd, this.simulationFrameCount+5);
						} else {
							let nParticlesToAdd = getWeightedOption([[50,15], [100,50], [200,25], [250,10]]); 
							if (bAddDashMedium){ nParticlesToAdd = min(nParticlesToAdd, 100);}
							let nParticlesToAddPerCycle = 25;
							let nParticleAddingCycles = int(nParticlesToAdd/nParticlesToAddPerCycle); 
							for (let i=0; i<nParticleAddingCycles; i++){
								this.addDeferredParticleGroup(0, nParticlesToAddPerCycle, 10+i*25);
							}
						}
					}

					if (bAddUrchin && (urchinStructureId > 0)){
						let nDecorationSets = 2;
						for (let j=0; j<nDecorationSets; j++){
							let decorationStruct = getWeightedOption([
								[[STRUCTURE_TYPE_STAR,2,3],  35],
								[[STRUCTURE_TYPE_TRUSS,3,5], 45],
								[[STRUCTURE_TYPE_BALL,1,3],   5],
								[[STRUCTURE_TYPE_LINE,1,3],  10],
								[[STRUCTURE_TYPE_CENTI,1,2],  5]
							]); 
							let decorationType = decorationStruct[0];
							let nDecorations = myRandomInt(decorationStruct[1], decorationStruct[2]);
							this.addDeferredInteriorDecorationSet([urchinStructureId], lastDeferTime+60+j*3, nDecorations, decorationType);
						}
					}
					if (bAddFreakyTruss){
						let tsty = getWeightedOption([[2,80],[3,15],[5,5]]);
						let tlen = Math.floor(0.20 * Math.sqrt(contourArea/PI));
						let trussStruct = {'style':tsty, 'initSize':1, 'targetSize':tlen};
						this.addDeferredStructure(0, STRUCTURE_TYPE_TRUSS, 1, this.simulationFrameCount+3, trussStruct);
					}
				}
				break;


			case 102: // Progressively add nested loops or wheels.
				this.theStyleSheet.bEnableProgressivelyAddedLoopsOrWheels = true;
				this.theStyleSheet.bLoopDisplayEnclosedBlobs = true;
				this.theStyleSheet.bLoopUseGreedyGrowth = false; 
				this.theStyleSheet.siteBlobFillColor = 255;
			
				let bAddBigBlankBlobArea = (myRandomA(1.0) < 0.55); 
				let nInitialVisibleBlobs = myRandomInt(0,2); 

				this.theStyleSheet.progressivelyAddType = (myRandomA(1.0) < 0.5) ? STRUCTURE_TYPE_LOOP : STRUCTURE_TYPE_WHEEL;
				if (nInitialVisibleBlobs == 0){ this.theStyleSheet.progressivelyAddType = STRUCTURE_TYPE_LOOP; }

				this.theStyleSheet.maxNProgressivelyAddedBlobs = myRandomInt(40,100);
				this.theStyleSheet.addStructureFrameDuration = int(getSkewedGaussian(350,1000, 1.0,-0.22));
				this.theStyleSheet.addStructureFrameCycle = int(getSkewedGaussian(5,45, 0.45,-0.20)); 
				this.theStyleSheet.blobTargetLengthNudgeFactor = myRandomAB(0.75,1.00); 
				this.theStyleSheet.wheelTargetLengthNudgeFactor = getWeightedOption([[1.5,15], [2.0,65], [2.5,20]]);
				this.theStyleSheet.interiorWheelTargetLengthNudgeFactor = getWeightedOption([[0.70,30],[1.0,35],[1.75,25],[2.1,10]]);
				this.theStyleSheet.proportionOfParticlesToAddToBlobs = getSkewedGaussian(0.00,0.30, 1.25,-1.0);
				this.theStyleSheet.blobInteriorExteriorBalance = getWeightedOption([[0.25,45], [0.50,5], [0.90,50]]);    
				this.theStyleSheet.minDistInRestLengths = getSkewedGaussian(0.25,4.00, 0.75,-0.50);
				this.theStyleSheet.minOccupancyForProgressivelyAddedBlobs = myRandomAB(0.22, 0.45); // NEEDS ATTENTION
				if (this.theStyleSheet.progressivelyAddType == STRUCTURE_TYPE_WHEEL){
					this.theStyleSheet.progressivelyAddedBlobStylePair = getWeightedOption(wheelStylePairs);
				} else {
					this.theStyleSheet.progressivelyAddedBlobStylePair = 
						getWeightedOption([ [[0,0],10], [[0,2],15], [[2,5],20], [[0,5],20], [[2,4],25], [[3,3],8], [[2,3],2] ]);
				}

				this.theStyleSheet.wheelStylePairMode = getWeightedOption([
					[WHEEL_PAIR_STYLE_MODE_PARTY,20],
					[WHEEL_PAIR_STYLE_MODE_MONOCULTURE,30],
					[WHEEL_PAIR_STYLE_MODE_HALFMONOCULTURE,50]]);
				if (this.theStyleSheet.progressivelyAddType == STRUCTURE_TYPE_WHEEL){	
					this.theStyleSheet.minDistInRestLengths = 2.5;
				}

				let bAddIckyCentipedes = false;
				if (bAddBigBlankBlobArea || (nInitialVisibleBlobs == 0)){
					let transformResult = this.myDistanceTransformer.computeDistanceTransform(false, -1, this.myParticles, this.myStructures); 
					let rx = transformResult.dtx;
					let ry = transformResult.dty;
					if ((ry > 0) && (rx > 0)){
						let firstWheelStyle = getWeightedOption([[9,40], [13,60]]); 
						let firstWheelTargetSize = (firstWheelStyle == 13) ? 100 : getWeightedOption([[60,20],[100,70],[160,10]]); 
						let overrideStruct = {'style':firstWheelStyle, 'initSize':50, 'targetSize':firstWheelTargetSize}; 
						this.addNewStructure(STRUCTURE_TYPE_WHEEL, rx,ry, overrideStruct); 
						this.addDeferredInteriorDecorationSet([this.myStructures.length-1], this.simulationFrameCount+25, 100, -1);

						if (myRandom01() < 0.3){
							if ((firstWheelStyle == 13) && (this.theStyleSheet.membrane_bAddDitherDots == false)){
								let nDeferredParticles = getWeightedOption([[40,75],[80,20],[160,5]]);
								this.addDeferredParticleGroup(0, nDeferredParticles, 30);
							}
						}
					}
				} else {
					bAddIckyCentipedes = (myRandom01() < 0.6); 
					if (bAddIckyCentipedes){
						let transformResult = this.myDistanceTransformer.computeDistanceTransform(false, -1, this.myParticles, this.myStructures); 
						let rx = transformResult.dtx;
						let ry = transformResult.dty;
						let nIckyCentipedes = getWeightedOption([[1,75],[2,15],[3,7],[4,3]]);
						let prevSize = 8;
						for (let i=0; i<nIckyCentipedes; i++){
							let overrideStruct = {
								'style': myRandomInt(1,N_CENTI_STYLES-1),
								'initSize': (prevSize = prevSize + myRandomInt(8,12))
							};
							this.addNewStructure(STRUCTURE_TYPE_CENTI, rx,ry, overrideStruct);
						}
					}
				}

				let bAddedStarball = false; 
				for (let j=0; j<nInitialVisibleBlobs; j++){
					let transformResult = this.myDistanceTransformer.computeDistanceTransform(false, -1, this.myParticles, this.myStructures); 
					let rx = transformResult.dtx;
					let ry = transformResult.dty;
					if ((ry > 0) && (rx > 0)){
						let blobInitSize = 32;
						let blobTargetSize = 64; 
						let nParticlesToAdd = 10; 
						let addType = STRUCTURE_TYPE_LOOP;
						
						let dstVal = this.myDistanceTransformer.getDistanceTransformValueAtLocation (rx, ry);
						blobInitSize = Math.round(TWO_PI * dstVal / 54.0); 
						blobInitSize = Math.min(32, blobInitSize); 
						blobTargetSize = blobInitSize*2; 

						if (this.theStyleSheet.progressivelyAddType == STRUCTURE_TYPE_LOOP){
							addType = STRUCTURE_TYPE_LOOP;
							nParticlesToAdd = Math.round(100 * Math.pow(myRandomA(1.0), 1.5));
						} else if (this.theStyleSheet.progressivelyAddType == STRUCTURE_TYPE_WHEEL){
							addType = STRUCTURE_TYPE_WHEEL;
							blobTargetSize *= 2; 
							nParticlesToAdd = getWeightedOption([[0,40],[10,25],[40,15],[80,20]]);
						}
						let style = this.theStyleSheet.progressivelyAddedBlobStylePair[0];
						let overrideStruct = {'style':style, 'initSize':blobInitSize,'targetSize':blobTargetSize};
						this.addNewStructure(addType, rx,ry, overrideStruct); 
						this.addDeferredParticleGroup(this.myStructures.length-1, nParticlesToAdd, 10 + j*20);

						if ((!bAddedStarball) && (myRandom01() < 0.025)){
							this.addNewCompoundStructure(STRUCTURE_TYPE_STARBALL, rx, ry, null);
							bAddedStarball = true; 
						}
					}
				}

				// Add a small flock of dashes
				if (this.theStyleSheet.THE_SCHEMA == 102){
					if (this.theStyleSheet.amorphousMaskAspectRatio > 0.618){
						let bAddDashFlock = (myRandom01() < 0.40); 
						if (bAddDashFlock){
							let nDashesToAdd = getWeightedOption([[7,70], [15,25], [30,4], [50,1]]) + myRandomInt(0,2); 
							this.addDeferredInteriorDecorationSet([0], 300, nDashesToAdd, STRUCTURE_TYPE_DASH);
						}
					}
				}

				// Add some possible extra stuff
				let trussletProbability = map(nInitialVisibleBlobs,0,2, 0.33,0.11);
				let bAddTrusslet = (myRandom01() < trussletProbability); 
				if (bAddTrusslet){
					let nTrusslets = getWeightedOption([[1,50],[2,30],[3,20]]); 
					for (let i=0; i<nTrusslets; i++){
						let transformResult = this.myDistanceTransformer.computeDistanceTransform(false, -1, this.myParticles, this.myStructures); 
						let rx = transformResult.dtx;
						let ry = transformResult.dty;
						if ((ry > 0) && (rx > 0)){
							let initAng = myRandomA(TWO_PI);
							let trussStyle = getWeightedOption([[1,25],[2,25],[3,20],[6,30]]); 
							let overrideStruct = {'style':trussStyle, 'initSize':1, 'targetSize':1, 'initAng':initAng};
							this.addNewStructure(STRUCTURE_TYPE_TRUSS, rx,ry, overrideStruct); 
						}
					}
				} else {
					let probabilityOfLineSet = 0.10; 
					if (bAddIckyCentipedes){ probabilityOfLineSet += 0.15; }
					let bAddLineSet = (myRandom01() < probabilityOfLineSet); 
					if (bAddLineSet){
						this.theStyleSheet.lineStructureUseGreedyGrowth = false;
						let howManyLines = getWeightedOption([[3,65],[24,35]]);  
						howManyLines += myRandomInt(0,5); 
						let lineStyle = getWeightedOption([[2,15],[6,85]]); 
						let lineLenBoost = getWeightedOption([[2,85],[24,15]]); 
						for (let i=0; i<howManyLines; i++){
							let transformResult = this.myDistanceTransformer.computeDistanceTransform(false, -1, this.myParticles, this.myStructures); 
							let rx = transformResult.dtx; 
							let ry = transformResult.dty; 
							if ((rx > 0) && (ry > 0)){
								let lineLen = myRandomInt(8,16);
								if (howManyLines < 20){ lineLen += lineLenBoost; }
								let lineStruct = {'style':lineStyle, 'initSize':1, 'targetSize':lineLen};
								this.addNewStructure(STRUCTURE_TYPE_LINE, rx,ry, lineStruct); 
							}
						}
					} else {
						let addExtraLoopBlob = (myRandom01() < 0.10); 
						if (addExtraLoopBlob){
							let overrideStruct = {
								'style':getWeightedOption([[2,90],[3,10]]), 
								'initSize':10, 
								'targetSize':getWeightedOption([[30,85],[90,15]]), 
								'bAddDeferredParticleGroup':true,
								'howManyDeferredParticles':myRandomInt(11,15),
								'delayToAddParticles':30
							};
							this.addDeferredStructure(0, STRUCTURE_TYPE_LOOP, 1, 200, overrideStruct);
						} else {
							let addExtraParticles = (myRandom01() < 0.125); 
							if (addExtraParticles){
								this.addDeferredParticleGroup(0, 100, 120);
							}
						}
					}
				}
				break;


			//---------------------------------------------------------------
			case 100: 

				let rnbPolyline = new ofPolyline();
				for (let i=0; i<this.nMaskPoints; i++){
					rnbPolyline.add(this.myParticles[i].p.x, this.myParticles[i].p.y, 0); 
				} 
				let rnbPolylineArea = Math.abs(polygonArea(rnbPolyline.points)); 
				let nucleusSize = int(0.8 * Math.sqrt(rnbPolylineArea)); 
				this.addStructureSprawlingWheels(1, nucleusSize);
				let nucleusId = this.myStructures.length-1;
				let nParticlesToAddPerCycle = myRandomInt(1,4);
				for (let i=1; i<=(nucleusSize/20); i++){
					this.addDeferredParticleGroup (nucleusId, nParticlesToAddPerCycle, 10+i*4); 
				}

				this.theStyleSheet.schemaOccupancyThreshold = myRandomAB(0.90, 0.95);
				let nWheelsInNucleus = getWeightedOption([[1,5],[2,10],[3,30],[4,40],[5,5]]); 
				for (let j=1; j<=nWheelsInNucleus; j++){
					let wheelStyle = getWeightedOption([[0,5],[2,15],[3,5],[4,10],[6,5],[7,15],[8,15],[11,10],[15,8],[16,12]]);
					let sizeOfItemToAdd = int(max(10, nucleusSize * myRandomAB(0.05,0.35))); 
					if (wheelStyle == 16){ if (sizeOfItemToAdd%4 != 0){ sizeOfItemToAdd += (4-sizeOfItemToAdd%4);}}

					let overrideStruct = {'style':wheelStyle, 'initSize':8,'targetSize':sizeOfItemToAdd};
					this.addDeferredStructure(nucleusId, STRUCTURE_TYPE_WHEEL, 1, j*50, overrideStruct);
				}
				this.addStructureToppings();
				this.addStructureOfTypeIfNoneExist(STRUCTURE_TYPE_LOOP, myRandomInt(0,2));
				for (let i=0; i<this.myStructures.length; i++){ // inflate some loops
					if (this.myStructures[i].type == STRUCTURE_TYPE_LOOP){
						if (myRandomA(1.0) < 0.25){
							let nParticlesToAdd = int(map(Math.pow(myRandomA(1.0), 0.5), 0,1, 10,30));
							this.addDeferredParticleGroup(i, nParticlesToAdd, 10+i*15);
						}
					}
				}

				for (let i=0; i<2; i++){
					let decorationType = getWeightedOption([
						[STRUCTURE_TYPE_LINE,10],
						[STRUCTURE_TYPE_TRUSS,30],
						[STRUCTURE_TYPE_STAR,30],
						[STRUCTURE_TYPE_BALL,930]]); 
					if (!this.doesStructureExistOfType(decorationType)){
						let overrideStruct = null;
						switch(decorationType){
							case STRUCTURE_TYPE_BALL: 
								let ballStyle = getWeightedOption([[1,1],[2,30],[3,4],[5,25],[6,28],[7,1], [8,3],[10,1],[13,5],[14,2] ]);
								overrideStruct = {'style':ballStyle};
								break;
							case STRUCTURE_TYPE_TRUSS:
								let initAng = myRandomA(TWO_PI);
								let trussStyle = getWeightedOption([[3,20],[4,30],[5,30],[6,20]]);
								let trussLen = myRandomInt(3,7);
								overrideStruct = {'style':trussStyle, 'initSize':1, 'targetSize':trussLen, 'initAng':initAng};
								break;
							case STRUCTURE_TYPE_STAR:
								let starStyle = getWeightedOption([[1,5],[3,50],[4,25],[5,20]]);
								let starSize = myRandomInt(3,4);
								let starSpokes = myRandomInt(5,9);
								overrideStruct = {'style':starStyle, 'nSpokes':starSpokes, 'initSize':1, 'targetSize':starSize};
								break;
						}
						this.addDeferredStructure(nucleusId, decorationType, 1, 275+i, overrideStruct);
					}
				}
				break;

			//---------------------------------------------------------------
			case 101: // CONTOUR_MODE_AMORPHOUS, multiple sprawling wheels

				let mainBlobPolyline = new ofPolyline();
				for (let i=0; i<this.nMaskPoints; i++){
					mainBlobPolyline.add(this.myParticles[i].p.x, this.myParticles[i].p.y, 0); 
				}
				let nSprawlingWheelsToAdd = getWeightedOption([[3,25],[4,45],[5,29],[6,1]]); 

				// Add general particles
				let bAddManyParticlesAtStart = ((nSprawlingWheelsToAdd <= 4) && (myRandom01() < 0.6));
				if (bAddManyParticlesAtStart){
					this.theStyleSheet.bDrawParticles = true; 
					let transformResult = this.myDistanceTransformer.computeDistanceTransform(false, -1, this.myParticles, this.myStructures); 
					let cx = transformResult.dtx; 
					let cy = transformResult.dty; 
					if ((cx > 0) && (cy > 0)){
						let howMany = getWeightedOption([[100,50],[400,35],[700,15]]); 
						for (let j=0; j<howMany; j++){
							this.addParticleAt(cx, cy);
						}
					}
				}
				
				// Add sprawling wheels
				this.addStructureSprawlingWheels(nSprawlingWheelsToAdd);
				
				// Add main area decorations
				if (nSprawlingWheelsToAdd <= 4){
					if (!bAddManyParticlesAtStart){
						let transformResult = this.myDistanceTransformer.computeDistanceTransform(false, -1, this.myParticles, this.myStructures); 
						let cx = transformResult.dtx; 
						let cy = transformResult.dty; 
						if ((cx > 0) && (cy > 0)){
							let situation = myRandom01();
							if (situation < 0.50){
								let compoundType = getWeightedOption([[STRUCTURE_TYPE_TICK,60],[STRUCTURE_TYPE_STARBALL,40]]); 
								this.addNewCompoundStructure(compoundType, cx, cy, null);
							} else if (situation < 0.85) {
								if (myRandom01() < 0.15){
									let trusStyle = getWeightedOption([[1,10],[2,20],[3,20],[4,10],[5,40]]);
									let trusDims = getWeightedOption([ [[1,12],50], [[2,5],35], [[3,4],15] ]);
									let trusCount = trusDims[0]; let trusSize = trusDims[1];
									let trusStruct = {'style':trusStyle, 'initSize':1,'targetSize':trusSize};
									this.addDeferredStructure([0], STRUCTURE_TYPE_TRUSS, trusCount, this.simulationFrameCount+5, trusStruct);
								} else {
									let trusCount = 1 + 2*myRandomInt(1,3);
									this.addDeferredInteriorDecorationSet([0], this.simulationFrameCount+5, trusCount, STRUCTURE_TYPE_TRUSS);
								}
							} 
						}
					} else {
						let bAdded = false;
						if (myRandom01() < 0.45){
							bAdded = true;
							let nDashesMin = getWeightedOption([[4,45],[24,35],[60,20]]);
							let nDashesMax = nDashesMin * 2; 
							let nDashes = myRandomInt(nDashesMin, nDashesMax); 
							this.addDeferredInteriorDecorationSet([0], this.simulationFrameCount+15, nDashes, STRUCTURE_TYPE_DASH);
							if (nDashesMin == 60){ this.theStyleSheet.bDrawEncircledSiteBlobs = false; }
						}
						if (myRandom01() < 0.60){
							bAdded = true; 
							let spineLen = myRandomInt(2,4); 
							let urchinStyle = myRandomInt(0,3); 
							let urchinLen = (myRandom01() < 0.6) ? myRandomInt(10,16) : myRandomInt(28,40);
							let urchinStruct = {'style':urchinStyle, 'spineLen':spineLen, 'urchinLen':urchinLen};
							let transformResult = this.myDistanceTransformer.computeDistanceTransform(false, -1, this.myParticles, this.myStructures); 
							let cx = transformResult.dtx; 
							let cy = transformResult.dty; 
							if ((cx > 0) && (cy > 0)){
								this.addNewStructure(STRUCTURE_TYPE_URCHIN, cx,cy, urchinStruct); 
								let urchinId = this.myStructures.length-1;
								if (urchinLen >= 28){
									this.theStyleSheet.loopSizeVariance = 0;
									this.theStyleSheet.loopSizeTarget = urchinLen; 
									this.theStyleSheet.bLoopsGrowAtHighestCurvature = false;
									this.addDeferredStructure([urchinId], STRUCTURE_TYPE_LOOP, 1, this.simulationFrameCount+13, null);
								} 
							}
						}
						if (!bAdded){
							this.addDeferredStructure([0], STRUCTURE_TYPE_LINE, 1, this.simulationFrameCount+3, null);
						}
					}
				} else {
					if (myRandom01() < 0.50){
						this.addDeferredParticleGroup(0, 50, this.simulationFrameCount+5);
					} 
					let ballProb = 0.9;
					for (let b=0; b<3; b++){
						if (myRandom01() < ballProb){
							let ballStyle = getWeightedOption([[1,5],[2,10],[3,30],[5,30],[8,20],[14,5]]);
							let ballOverrideStruct = {'style':ballStyle};
							this.addDeferredStructure(0, STRUCTURE_TYPE_BALL, 1, this.simulationFrameCount+10*b, ballOverrideStruct);
						} ballProb *= 0.6; 
					}
				}

				// Add stuff inside the main wheels
				for (let i=0; i<this.myStructures.length; i++){ 
					if (this.myStructures[i].type == STRUCTURE_TYPE_WHEEL){
						let bAddInnerWheels = false;
						if (myRandomA(1.0) < 0.5){
							let nParticlesToAdd = int(this.myStructures[i].growthSizeLimit / 5);
							let when = nParticlesToAdd; // cute hack
							this.addDeferredParticleGroup(i, nParticlesToAdd, when);
						} else {
							bAddInnerWheels = true;
						}
					
						if (bAddInnerWheels || (myRandomA(1.0) < 0.75)){
							let nInteriorStructures = getWeightedOption([[1,65],[2,35]]); 
							let bDuplicateWheelStyle = (myRandomA(1.0) < 0.5);
							let wheelStyle = getWeightedOption([[0,5],[1,5],[2,15],[3,15],[4,10],[6,5],[7,15],[8,19],[11,10],[12,1]]);
							for (let j=0; j<nInteriorStructures; j++){
								let dstSize = this.myStructures[i].growthSizeLimit;
								let maxSizePct = (nInteriorStructures == 1) ? 0.35 : 0.25;
								let sizeOfItemToAdd = int(max(10, dstSize * myRandomAB(0.1,maxSizePct))); 
								if ((j > 0) && (!bDuplicateWheelStyle)){
									wheelStyle = getWeightedOption([[0,5],[1,5],[2,15],[3,15],[4,10],[6,5],[7,15],[8,19],[11,10],[12,1]]);
								}
								let overrideStruct = {'style':wheelStyle, 'initSize':8,'targetSize':sizeOfItemToAdd};
								this.addDeferredStructure(i, STRUCTURE_TYPE_WHEEL, 1, 100+i*30+j*15, overrideStruct);
							}
						}
					}
				}
				break;
		}

		// Adjust loopIndentWeight based on area
		let mainPolyline = new ofPolyline();
		for (let i=0; i<this.nMaskPoints; i++){
			mainPolyline.add(this.myParticles[i].p.x, this.myParticles[i].p.y, 0); 
		} let mainPolylineArea = Math.abs(polygonArea(mainPolyline.points)); 
		let mainPolylineAreaSqrt = Math.sqrt(mainPolylineArea); // 300...500
		let loopIndentWeightProb =  map(mainPolylineAreaSqrt, 350,500, 0,1, true);
		loopIndentWeightProb = Math.pow(loopIndentWeightProb, 0.5);
		this.theStyleSheet.loopIndentWeight = (myRandom01() < loopIndentWeightProb) ? WEIGHT_2 : WEIGHT_1;
	}

	//--------------------------------------------------------
	executeProgressivelyAddedBlobs(){
		if (this.theStyleSheet.bEnableProgressivelyAddedLoopsOrWheels){
			const addStructureFrameCycle = this.theStyleSheet.addStructureFrameCycle;
			const addStructureFrameDuration = this.theStyleSheet.addStructureFrameDuration;
			if ((this.simulationFrameCount > 0) &&
				(this.simulationFrameCount < addStructureFrameDuration) && 
				(this.simulationFrameCount%addStructureFrameCycle == 0)){

				let blobCount = 0; 	
				for (let i=0; i<this.myStructures.length; i++){
					if (this.myStructures[i].type == this.theStyleSheet.progressivelyAddType){ blobCount++; }
				}

				if (blobCount < this.theStyleSheet.maxNProgressivelyAddedBlobs){ 
					myRandomReset(this.THE_CURRENT_HASH); // Reset, then advance the RNG
					const nRandomIterations = (this.myStructures.length * 31) + this.simulationFrameCount; 
					for (let i=0; i<nRandomIterations; i++){let r = myRandom01();}

					// Determine which previous structure to put a new structure in.
					let containingStructureId = -1; 
					let aProbability = myRandom01();
					if ((aProbability < this.theStyleSheet.blobInteriorExteriorBalance) && (this.myStructures.length > 1)){
						let prevWheelList = []; 
						for (let i=0; i<this.myStructures.length; i++){
							if (this.myStructures[i].type == this.theStyleSheet.progressivelyAddType){
								prevWheelList.push([i,0]); 
							}
						} 

						for (let i=0; i<prevWheelList.length; i++){
							let probability = int(100.0*(Math.pow((prevWheelList.length-i)/prevWheelList.length,  1.5  )));
							prevWheelList[i][1] = probability; 
						}
						if (prevWheelList.length > 0){	
							let countAttempts = 0; 			
							let whichId = getWeightedOption(prevWheelList); 
							while ((countAttempts < 10) && (this.myStructures[whichId].STYLE_ID >= 10)){
								whichId = getWeightedOption(prevWheelList); 
								countAttempts++;
							}
							containingStructureId = whichId; 
						}
					}

					// Check if there's room
					let distanceTransformResult = this.myDistanceTransformer.computeDistanceTransform(
						false, containingStructureId, this.myParticles, this.myStructures); 
					let px = distanceTransformResult.dtx; 
					let py = distanceTransformResult.dty; 
					if ((px > 0) && (py > 0)){
						let occupancy = distanceTransformResult.occupancy;
						let closestDistInRestLengths = (distanceTransformResult.minDist)/this.REST_L;
						let bCellIsEmpty = (distanceTransformResult.minDist == -1);

						if (bCellIsEmpty || (closestDistInRestLengths > this.theStyleSheet.minDistInRestLengths)){
							let bDoit = true; 

							if (this.theStyleSheet.progressivelyAddType == STRUCTURE_TYPE_WHEEL){
								if (containingStructureId == -1){
									if (occupancy < this.theStyleSheet.minOccupancyForProgressivelyAddedBlobs) { 
										bDoit = false; 
									}
								} else if ((this.myStructures[containingStructureId].STYLE_ID >= 10)){
									bDoit = false; 
								}
							}

							if (bDoit){
								// Determine size of blob to add
								let blobTargetLengthNudgeFactor = this.theStyleSheet.blobTargetLengthNudgeFactor;
								if (this.theStyleSheet.progressivelyAddType == STRUCTURE_TYPE_WHEEL){
									blobTargetLengthNudgeFactor *= this.theStyleSheet.wheelTargetLengthNudgeFactor; 
									if (containingStructureId != -1){ 
										blobTargetLengthNudgeFactor *= this.theStyleSheet.interiorWheelTargetLengthNudgeFactor; 
									}
								}
								let blobTargetSize = int(closestDistInRestLengths*TWO_PI * blobTargetLengthNudgeFactor);

								// Determine blob style
								let styleToAdd = 0;
								if (this.theStyleSheet.progressivelyAddType == STRUCTURE_TYPE_LOOP){
									let loopStylePair = this.theStyleSheet.progressivelyAddedBlobStylePair;
									styleToAdd = (myRandomA(1.0)<0.5) ? loopStylePair[0] : loopStylePair[1];
									if ((styleToAdd == 4) && (blobTargetSize > 16)) { styleToAdd = loopStylePair[0]; }

								} else if (this.theStyleSheet.progressivelyAddType == STRUCTURE_TYPE_WHEEL){
									let wheelStylePair = this.theStyleSheet.progressivelyAddedBlobStylePair;
									if (this.theStyleSheet.wheelStylePairMode == WHEEL_PAIR_STYLE_MODE_MONOCULTURE){
										if (containingStructureId == -1){ // if this is a primary-level structure
											styleToAdd = wheelStylePair[0];
										} else { // if this is being added to an enclosing structure
											let grandparent = this.myStructures[containingStructureId].getEnclosingStructureId(); 
											if (grandparent == -1){ styleToAdd = wheelStylePair[1];
											} else {
												let containingStructureStyle = this.myStructures[containingStructureId].STYLE_ID;
												wheelStylePair = this.getRandomWheelStylePairGivenFirstStyle(containingStructureStyle);
												styleToAdd = wheelStylePair[1];
											}
										}
									} else if (this.theStyleSheet.wheelStylePairMode == WHEEL_PAIR_STYLE_MODE_HALFMONOCULTURE){
										if (containingStructureId == -1){ // if this is a primary-level structure
											styleToAdd = wheelStylePair[0];
										} else { // if this is being added to an enclosing structure
											let containingStructureStyle = this.myStructures[containingStructureId].STYLE_ID;
											wheelStylePair = this.getRandomWheelStylePairGivenFirstStyle(containingStructureStyle);
											styleToAdd = wheelStylePair[1];
										}
									} else if (this.theStyleSheet.wheelStylePairMode == WHEEL_PAIR_STYLE_MODE_PARTY){
										if (containingStructureId == -1){ // if this is a primary-level structure
											wheelStylePair = getWeightedOption(wheelStylePairs);
											styleToAdd = wheelStylePair[0];
										} else { // if this is being added to an enclosing structure
											let containingStructureStyle = this.myStructures[containingStructureId].STYLE_ID;
											wheelStylePair = this.getRandomWheelStylePairGivenFirstStyle(containingStructureStyle);
											styleToAdd = wheelStylePair[1];
										}
									} 
								}
								let overrideStruct = {'style':styleToAdd, 'initSize':5, 'targetSize':blobTargetSize};
								this.addNewStructure(this.theStyleSheet.progressivelyAddType, px, py, overrideStruct);
								this.myStructures[this.myStructures.length-1].setEnclosingStructureId(containingStructureId);
								
								if ((this.theStyleSheet.progressivelyAddType == STRUCTURE_TYPE_WHEEL)|| 
									(this.theStyleSheet.progressivelyAddType == STRUCTURE_TYPE_LOOP)){
									let pct = this.theStyleSheet.proportionOfParticlesToAddToBlobs;
									if (myRandomA(1.0) < 0.60){
										let nParticlesToAdd = int((PI * closestDistInRestLengths * closestDistInRestLengths) * pct);
										this.addDeferredParticleGroup(this.myStructures.length-1, nParticlesToAdd, this.simulationFrameCount+13);
									}
									
									if (myRandomA(1.0) < 0.50){ 
										let radiusEstimate = blobTargetSize/TWO_PI;
										if (radiusEstimate > 4){
											let nToTryAdding = int(blobTargetSize/5); // int(Math.sqrt(blobTargetSize)); 
											this.addDeferredInteriorDecorationSet([this.myStructures.length-1], this.simulationFrameCount+21, nToTryAdding, -1);
										}
									}
								}

							}
						}
					}
				}
			}
		}
	}


	//------------------------------------
	installParticlesInEmptyRegion(){
		if ((this.theStyleSheet.THE_SCHEMA != 109)){
			if (this.theStyleSheet.bDrawParticles){

				// count free particles
				let freeParticleCount = 0; 
				for (let i=0; i<this.myParticles.length; i++) {
					if (this.myParticles[i].isFree ){ freeParticleCount++; }
				}
				if (freeParticleCount < 10){
					let transformResult = this.myDistanceTransformer.computeDistanceTransform(false, -1, this.myParticles, this.myStructures); 
					if (transformResult.occupancy > 0.45){
						let cx = transformResult.dtx; 
						let cy = transformResult.dty; 
						if ((cx > 0) && (cy > 0)){
			
							let howMany = int(map(transformResult.occupancy, 0.45,0.75, 0,100, true ));
							for (let j=0; j<howMany; j++){
								this.addParticleAt(cx + myRandom01(), cy + myRandom01());
							}
						}
					}
				}
			}
		}
	}


	//------------------------------------
	addDividerTruss(membraneStructureId, maxNDividerTrusses){

		let bDidIt = false;
		if ((this.theStyleSheet.bUseAmorphousCellContour) && 
			(this.theStyleSheet.amorphousMaskNoiseAmountCategory == 1) && 
			(this.theStyleSheet.amorphousMaskAspectRatio < 1.20)){

			let membraneParticleIndices = this.myStructures[membraneStructureId].particleIndices;
			if (membraneParticleIndices.length >= this.nMaskPoints){
				let nDividerTrusses = getWeightedOption([[2,15],[3,30],[4,35],[5,20]]); 
				if (maxNDividerTrusses){ nDividerTrusses = maxNDividerTrusses;}

				let mpiA = membraneParticleIndices.length - 1*Math.floor(this.nMaskPoints/4);
				let mpiB = membraneParticleIndices.length - 3*Math.floor(this.nMaskPoints/4);

				let piA = this.myParticles[membraneParticleIndices[mpiA]];
				let piB = this.myParticles[membraneParticleIndices[mpiB]];
				let dx = piA.p.x - piB.p.x; 
				let dy = piA.p.y - piB.p.y;
				let nRestLengths = Math.floor(0.7 * Math.sqrt(dx*dx + dy*dy)/this.REST_L); 

				let overrideStruct = {
					'style': getWeightedOption([[0,50],[3,30],[5,20]]), 
					'initSize': nRestLengths, 
					'targetSize': nRestLengths, 
					'initAng': 1.5 * PI
				};

				for (let j=0; j<nDividerTrusses; j++){
					let k = j- int(nDividerTrusses/2); 
					let px = (BASE_DIM/2 + k*this.REST_L);
					let py = (BASE_DIM/2);
					
					bDidIt = true;
					this.addNewStructure(STRUCTURE_TYPE_TRUSS, px,py, overrideStruct);
					let dividerStructureId = this.myStructures.length-1;
					let dividerParticleIndices = this.myStructures[dividerStructureId].particleIndices;
					let mi, mpi, dpi, mpis, dpis, aSpring; 

					dpis = [0,1,1,0]; 
					mpis = [0,-1,0,-1];
					for (let r=0; r<4; r++){
						dpi = dividerParticleIndices[dpis[r]]; 
						mi = mpiA + k + mpis[r];
						mpi = membraneParticleIndices[mi]; 
						aSpring = new Spring(this.myParticles);
						aSpring.setParticleIndicesAndRestLength(dpi,mpi, this.REST_L, SPRING_K); 
						this.myStructures[dividerStructureId].springs.push(aSpring);
					}
					dpis = [-2,-1,-2,-1];
					mpis = [-1,0,0,-1];
					for (let r=0; r<4; r++){
						dpi = dividerParticleIndices[dividerParticleIndices.length+dpis[r]]; 
						mi = mpiB - k + mpis[r];
						mpi = membraneParticleIndices[mi]; 
						aSpring = new Spring(this.myParticles);
						aSpring.setParticleIndicesAndRestLength(dpi,mpi, this.REST_L, SPRING_K); 
						this.myStructures[dividerStructureId].springs.push(aSpring);
					}
				}
			}
		}
		return bDidIt;
	}

	//===============================================================
	getRandomWheelStylePairGivenFirstStyle (firstStyle){
		let out = [0,0];
		if (firstStyle < 10){
			let count = 0; 
			let aRandomWheelStylePair = getWeightedOption(wheelStylePairs);
			while ((aRandomWheelStylePair[0] != firstStyle) && (count < 1000)){
				aRandomWheelStylePair = getWeightedOption(wheelStylePairs);
				count++;
			}
			out = aRandomWheelStylePair;
		}
		return out; 
	}

	//------------------------------------
	doesStructureExistOfType(whichType){
		let out = false; 
		for (let i=0; i<this.myStructures.length; i++){
			if (this.myStructures[i].type == whichType){
				out = true;
			}
		}
		return out;
	}




	//------------------------------------
	addStructureOfTypeIfNoneExist(whichType, howMany){
		if (howMany > 0){
			let structuresOfThisTypeExist = this.doesStructureExistOfType(whichType); 
			if (!structuresOfThisTypeExist){
				for (let i=0; i<howMany; i++){
					let transformResult = this.myDistanceTransformer.computeDistanceTransform(false, -1, this.myParticles, this.myStructures); 
					let rx = transformResult.dtx; 
					let ry = transformResult.dty; 
					if ((rx > 0) && (ry > 0)){
						this.addNewStructure(whichType, rx,ry); 
					}
				}
			}
		}
	}

	//------------------------------------
	addDeferredInteriorDecorationSet(toWhichStructureIds, baseTime, maxN, whichTypeToAdd){

		let ballStyle = getWeightedOption([[0,10],[2,10],[3,40],[4,10],[5,20],[8,10]]);
		let lineStyle = ((this.theStyleSheet.THE_SCHEMA == 108)) ?  
			getWeightedOption([[0,5],[1,8],[2,25],[3,25],[4,20],[5,10],[6,7]]) : 
			getWeightedOption([[1,25],[2,10],[3,30],[4,28],[5,7]]);
			lineStyle  = 4; //
		let starStyle = getWeightedOption([[0,5],[1,50],[2,10],[3,30],[4,1],[5,2],[6,2]]);
		let trusStyle = getWeightedOption([[0,5],[1,20],[2,10],[3,35],[5,25],[6,5]]);
		let centStyle = getWeightedOption([[0,15],[1,20],[2,25],[3,25],[5,15]]);
		let centSize  = getWeightedOption([[3,15],[4,40],[5,25],[6,5],[7,15]]);

		let blankBlobFillChoice = -1; //
		if (whichTypeToAdd != -1){
			blankBlobFillChoice = whichTypeToAdd;
		} else if (this.theStyleSheet.progressivelyAddType == STRUCTURE_TYPE_WHEEL){
			blankBlobFillChoice = getWeightedOption([
				[-1, 0],
				[STRUCTURE_TYPE_STAR,10],
				[STRUCTURE_TYPE_TRUSS,30],
				[STRUCTURE_TYPE_BALL,30],
				[STRUCTURE_TYPE_LINE,25],
				[STRUCTURE_TYPE_CENTI,5]
			]); 

		} else if (this.theStyleSheet.progressivelyAddType = STRUCTURE_TYPE_LOOP){
			blankBlobFillChoice = getWeightedOption([
				[-1, 0],
				[STRUCTURE_TYPE_STAR,30],
				[STRUCTURE_TYPE_TRUSS,20],
				[STRUCTURE_TYPE_BALL,0],
				[STRUCTURE_TYPE_LINE,30],
				[STRUCTURE_TYPE_CENTI,20]
			]); 
		}

		for (let s=0; s<toWhichStructureIds.length; s++){
			let toWhichStructureId = toWhichStructureIds[s];

			let sizeOfContainer = 99999;
			if (toWhichStructureId > -1){
				if (this.myStructures[toWhichStructureId]){
					sizeOfContainer = this.myStructures[toWhichStructureId].growthSizeLimit; 
				}
			}

			if (blankBlobFillChoice == -1){
				this.addDeferredParticleGroup(toWhichStructureId, 100, 20);
			} else {

				for (let j=0; j<maxN; j++){
					switch(blankBlobFillChoice){
						case STRUCTURE_TYPE_DASH:
							this.addDeferredStructure(toWhichStructureId, STRUCTURE_TYPE_DASH, 1, baseTime+j*3+s, null);
							break;
						case STRUCTURE_TYPE_LOOP:
							this.addDeferredStructure(toWhichStructureId, STRUCTURE_TYPE_LOOP, 1, baseTime+13+j*5+s, null);
							break;
						case STRUCTURE_TYPE_CENTI:
							let cSize = centSize + myRandomInt(-1,1);
							if (sizeOfContainer < 40){cSize = min(cSize, 5);}
							let centStruct = {'style':centStyle, 'initSize':cSize, 'targetSize':cSize};
							this.addDeferredStructure(toWhichStructureId, STRUCTURE_TYPE_CENTI, 1, baseTime+26+j*4+s, centStruct);
							break;
						case STRUCTURE_TYPE_STAR: 
							let starSize = getWeightedOption([[0,75],[1,20],[2,5]]);
							if (sizeOfContainer < 40){starSize = min(starSize, 1);}
							let starStruct = {'style':starStyle, 'initSize':0, 'targetSize':starSize};
							this.addDeferredStructure(toWhichStructureId, STRUCTURE_TYPE_STAR, 1, baseTime+17+j*9+s, starStruct);
							break;
						case STRUCTURE_TYPE_TREE:
							this.addDeferredStructure(toWhichStructureId, STRUCTURE_TYPE_TREE, 1, baseTime+15+j*11+s, null);
							break;
						case STRUCTURE_TYPE_TRUSS: 
							let trusSize = getWeightedOption([[2,70],[3,24],[4,5],[5,1]]);
							if (sizeOfContainer < 40){trusSize = min(trusSize, 4);}
							let trusStruct = {'style':trusStyle, 'initSize':1,'targetSize':trusSize};
							this.addDeferredStructure(toWhichStructureId, STRUCTURE_TYPE_TRUSS, 1, baseTime+23+j*4+s, trusStruct);
							break;
						case STRUCTURE_TYPE_BALL: 
							let ballStruct = {'style':ballStyle};
							this.addDeferredStructure(toWhichStructureId, STRUCTURE_TYPE_BALL, 1, baseTime+19+j*13+s, ballStruct);
							break;
						case STRUCTURE_TYPE_LINE:
							let lineLen = myRandomInt(5,9);
							if (sizeOfContainer < 40){lineLen = min(lineLen, 7);}
							
							let lineStruct = {'style':lineStyle, 'initSize':1, 'targetSize':lineLen};
							this.addDeferredStructure(toWhichStructureId, STRUCTURE_TYPE_LINE, 1, baseTime+16+j*7+s, lineStruct);
							this.theStyleSheet.lineStructureUseGreedyGrowth = false;
							break;
					}
				}
			}
		}
	}

	//------------------------------------
	addStructureToppings(){
		// Disperse collections of structures within the main interior
		let nStructuresAdded = 0; 
		let interiorContour = this.getMembraneInteriorContour(); 
		if (interiorContour && (interiorContour.length > 0)){

			let nToppings = this.theStyleSheet.nToppings;
			let approxNCollectionParticlesToAdd = 450/nToppings; //150; 

			let toppingStructs = [];
			for (let j=0; j<nToppings; j++){
				let typeOfStructureToGenerate = this.theStyleSheet.toppings[j]; 
				let nParticlesPerItem = 10;
				switch(typeOfStructureToGenerate){
					case STRUCTURE_TYPE_LINE:  // #0 
						this.theStyleSheet.lineStructureUseGreedyGrowth = false; //clobber 
						if (this.theStyleSheet.lineStructureStyle <= 2){ approxNCollectionParticlesToAdd *= 2; }
						nParticlesPerItem = this.theStyleSheet.lineStructureLengthTarget; break;
					case STRUCTURE_TYPE_LOOP:  // #1
						nParticlesPerItem = this.theStyleSheet.loopSizeTarget; break;
					case STRUCTURE_TYPE_DASH:  // #2
						nParticlesPerItem = 3; break;
					case STRUCTURE_TYPE_TRUSS: // #3
						nParticlesPerItem = 2 + 2*(this.theStyleSheet.trussStructureMinLen); break;
					case STRUCTURE_TYPE_STAR:  // #5
						nParticlesPerItem = 1 + 6*(1 + this.theStyleSheet.starStructureSizeTarget); break;
					case STRUCTURE_TYPE_TREE:  // #6
						nParticlesPerItem = this.theStyleSheet.treeGrowthSizeLimit; break;
					case STRUCTURE_TYPE_CENTI: // #8
						nParticlesPerItem = 2*(this.theStyleSheet.centiStructureLength); break;
					case STRUCTURE_TYPE_BALL:  // #9
						nParticlesPerItem = 3 + 1 + this.theStyleSheet.nSpokesPerBall; break;
				}
				let nStructuresToGenerate = int(approxNCollectionParticlesToAdd / nParticlesPerItem); 
				let aToppingStruct = {
					'type': typeOfStructureToGenerate,
					'nToGenerate': nStructuresToGenerate,
				};
				toppingStructs.push(aToppingStruct); 
			}
			toppingStructs.sort((a,b) => a.nToGenerate - b.nToGenerate);

			for (let j=0; j<toppingStructs.length; j++){
				let nStructuresToGenerate = toppingStructs[j].nToGenerate;
				let typeOfStructureToGenerate = toppingStructs[j].type;
				for (let i=0; i< nStructuresToGenerate; i++){
					let transformResult = this.myDistanceTransformer.computeDistanceTransform(false, -1, this.myParticles, this.myStructures); 
					let rx = transformResult.dtx; //// * (BASE_DIM/width);
					let ry = transformResult.dty; //// * (BASE_DIM/height);
					let occupancy = transformResult.occupancy;
					if (occupancy > this.theStyleSheet.schemaOccupancyThreshold){
						this.addNewStructure(typeOfStructureToGenerate, rx,ry); 
						nStructuresAdded++; 
					} else {
						break;
					}
				}
			}
		}
		return nStructuresAdded; 
	}

	//----------------------------
	addDeferredStructure(toWhichStructureId, typeOfStructureToAdd, howMany, whichSimulationFrame, overrideStruct){
		let deferredStructureStruct = {
			'id': toWhichStructureId,
			'type': typeOfStructureToAdd,
			'when': whichSimulationFrame,
			'how': overrideStruct,
			'howMany': howMany
		};
		this.deferredStructures.push(deferredStructureStruct); 
	}

	//----------------------------
	executeDeferredStructures(){
		
		// Special cases: 
		// Handle (deferred) installation of letters & particles
		if (this.bCurrentCellStartsBlank == false){

			if (this.simulationFrameCount == 600){
				this.installParticlesInEmptyRegion();
			}

			//---------------------
			// Main case: Handle all other deferred structures
			for (let i=0; i<this.deferredStructures.length; i++){
				let when = this.deferredStructures[i].when; 
				if (this.simulationFrameCount == when){ 

					let toWhichStructureId = this.deferredStructures[i].id;

					if ((toWhichStructureId >= -1) && (toWhichStructureId < this.myStructures.length)){
						if (!this.myStructures[toWhichStructureId].getFull()){

							let transformResult = this.myDistanceTransformer.computeDistanceTransform(
								false, toWhichStructureId, this.myParticles, this.myStructures); 
								
							let closestDistFactor = (transformResult.minDist )/this.REST_L;
							if (closestDistFactor > this.theStyleSheet.deferredStructureMinimumDistanceThreshold){ // 1.0 - 2.0
								let px = transformResult.dtx;
								let py = transformResult.dty; 

								if ((px > 0) && (py > 0)){
									let typeOfStructureToGenerate = this.deferredStructures[i].type; 
									let overrideStruct = this.deferredStructures[i].how; 
									let howMany = this.deferredStructures[i].howMany;
									for (let j=0; j<howMany; j++){
										let pxr = px + 0.5*myRandomAB(-1,1);
										let pyr = py + 0.5*myRandomAB(-1,1);
										this.addNewStructure(typeOfStructureToGenerate, pxr,pyr, overrideStruct);
										this.myStructures[this.myStructures.length-1].setEnclosingStructureId(toWhichStructureId);
									}
									if (overrideStruct != null){
										if (overrideStruct.bAddDeferredParticleGroup != null){
											let howManyParticles = 50; 
											if (overrideStruct.howManyDeferredParticles != null){
												howManyParticles = overrideStruct.howManyDeferredParticles;
											}
											let whenParticles = this.simulationFrameCount + 100; 
											if (overrideStruct.delayToAddParticles != null){
												whenParticles = this.simulationFrameCount + overrideStruct.delayToAddParticles;
											};
											this.addDeferredParticleGroup(this.myStructures.length-1, howManyParticles, whenParticles);
										}
									}
								} 
							} else if (closestDistFactor < 0.5){
								this.myStructures[toWhichStructureId].setFull(true);
							}
						}
					}
				}
			}
		}
	}


	addDeferredParticleGroup(toWhichStructureId, howManyParticles, whichSimulationFrame){
		let deferredParticleGroupStruct = {
			'id': toWhichStructureId,
			'size': howManyParticles,
			'when': whichSimulationFrame
		};
		this.deferredParticleTargetStructures.push(deferredParticleGroupStruct); 
	}

	executeDeferredParticleGroups(){
		for (let i=0; i<this.deferredParticleTargetStructures.length; i++){
			let when = this.deferredParticleTargetStructures[i].when; 
			if (this.simulationFrameCount == when){

				let whichStructureId = this.deferredParticleTargetStructures[i].id;
				if ((whichStructureId >= 0) && (whichStructureId < this.myStructures.length)){
					let transformResult = this.myDistanceTransformer.computeDistanceTransform(
						false, whichStructureId, this.myParticles, this.myStructures); 
					let px = transformResult.dtx;
					let py = transformResult.dty;

					let howMany = this.deferredParticleTargetStructures[i].size;
					for (let j=0; j<howMany; j++){
						this.addParticleAt(px, py);
					}
				}
			}
		}
	}


	addStructureSprawlingWheels(nSprawlingWheels, wts){
		let bEnsureNoRepeatStyles = false;
		if ((nSprawlingWheels > 1) && (nSprawlingWheels <= 4)){ bEnsureNoRepeatStyles = true;}
		let prevSprawlingWheelStyles = [];
		let idsOfSprawlingWheelStructures = []; 

		for (let i=0; i<nSprawlingWheels; i++){
			let transformResult = this.myDistanceTransformer.computeDistanceTransform(false, -1, this.myParticles, this.myStructures); 
			let px = transformResult.dtx; 
			let py = transformResult.dty;

			let wheelTargetSize = wts;
			if (!wheelTargetSize){
				let nPer = int(360/nSprawlingWheels); // 360,180,120,90,72
				wheelTargetSize = (nSprawlingWheels-i)*nPer;  
			} 

			// Ensure there are no style repeats if we only have a few items.
			let wheelStyle = getWeightedOption([[0,5],[16,8],[2,15],[3,13],[4,10],[6,5],[7,13],[8,19],[10,1],[11,10],[15,1]]);
			if (i==0){
				prevSprawlingWheelStyles[0] = wheelStyle;
			} else if (bEnsureNoRepeatStyles){
				let tryCount = 0; 
				while (prevSprawlingWheelStyles.includes(wheelStyle) && (tryCount < 100)){
					wheelStyle = getWeightedOption([[0,5],[16,5],[2,15],[3,15],[4,10],[6,5],[7,15],[8,18],[11,10],[12,2]]);
					tryCount++; 
				}
				prevSprawlingWheelStyles[i] = wheelStyle;
			}

			if (wheelStyle == 16){ if (wheelTargetSize%4 != 0){ wheelTargetSize += (4-wheelTargetSize%4);}}
			let overrideStruct = {
				'style': wheelStyle,
				'initSize': 8,
				'targetSize': wheelTargetSize
			};
			this.addNewStructure(STRUCTURE_TYPE_WHEEL, px,py, overrideStruct);
			let lastStructureIndex = this.myStructures.length -1; 
			idsOfSprawlingWheelStructures.push(lastStructureIndex); 

			// Special case for structure settings: If there's only one sprawling wheel, 
			// of if the sprawling wheel is black, ensure that it shows enclosed blobs.
			lastStructureIndex = this.myStructures.length -1; 
			if ((nSprawlingWheels == 1) || (this.myStructures[lastStructureIndex].STYLE_ID == 12)){
				this.myStructures[lastStructureIndex].bDisplayEnclosedBlobs = true;
			}
		}
		// Ensure that at least one of the structures are able to enclose blobs
		let aSprawlingWheelShowsItsParticles = false;
		for (let i=0; i<idsOfSprawlingWheelStructures.length; i++){
			let ithId = idsOfSprawlingWheelStructures[i];
			if ((this.myStructures[ithId].bDisplayEnclosedBlobs) ||
				(this.myStructures[ithId].bDisplayVoronoiCells)){
				aSprawlingWheelShowsItsParticles = true;
			}
		}
		if (aSprawlingWheelShowsItsParticles == false){
			let pickOne = myRandomInt(0, idsOfSprawlingWheelStructures.length-1);
			this.myStructures[pickOne].bDisplayEnclosedBlobs = true;
		}
	}

	progressivelyAddStructures(){
		let now = millis(); 
		let millisElapsedSinceFreeze = now - this.temperatureInitFreezeTime;
		let bPaused = (millisElapsedSinceFreeze < (nSecondsToFreeze*1000));
		if (!bPaused){
			this.executeDeferredParticleGroups();
			this.executeDeferredStructures(); 
			this.executeProgressivelyAddedBlobs();
		}
	}

	//===============================================================
	initializeFreeParticles(){
		this.updateSimulation(); 
		this.updateParticles(); 
		for (let i=0; i<N_INITIAL_PARTICLE_ITERATIONS; i++){ 
			this.advanceFreeParticles(); 
		}
		this.clearForces();
	}

	togglePause(){
		let now = millis(); 
		let millisElapsedSinceFreeze = now - this.temperatureInitFreezeTime;
		let bPaused = (millisElapsedSinceFreeze < (nSecondsToFreeze*1000));
		if (bPaused){ // unpause
			this.TEMPERATURE = 1.0; 
			this.temperatureInitFreezeTime = -99999999;  
			this.bTemperatureCooling = false;  
		} else {
			this.TEMPERATURE = 0.0; 
			this.bTemperatureCooling = true;
			this.temperatureInitFreezeTime = now; 
		}
	}

	pause(){
		this.TEMPERATURE = 0.0; 
		this.bTemperatureCooling = true;
		this.temperatureInitFreezeTime = millis(); 
	}


	//===============================================================
	toggleDebugView(){
		this.bShowDebug = !this.bShowDebug;
		if (this.bShowDebug){ 
			this.debugAskTime = millis();
		}
	}


	//===============================================================
	addNewStructureAtMouseLocation(whichType, overrideStruct){

		let aPolyline = this.getMembraneInteriorContour();  
		if (aPolyline && (aPolyline.length > 0)){
			let nVerts = aPolyline.length;

			let zoomScale = 1.0; 
			const mx = ((mouseX/width  - 0.5) / zoomScale + 0.5) * BASE_DIM; 
			const my = ((mouseY/height - 0.5) / zoomScale + 0.5) * BASE_DIM; 
			let bMouseInside = pointInsideVerts (mx, my, aPolyline, nVerts);
			if (bMouseInside){	
				this.addNewStructure(whichType, mx,my, overrideStruct);
			} else {
				let transformResult = this.myDistanceTransformer.computeDistanceTransform(false, -1, this.myParticles, this.myStructures); 
				let rx = transformResult.dtx;
				let ry = transformResult.dty; 
				if ((ry > 0) && (rx > 0)){
					this.addNewStructure(whichType, rx,ry, overrideStruct);
				}
			}
		}
	}



	//===============================================================
	addNewStructure(whichType, cx, cy, overrideStruct=null) {


		let compoundStructureList = [STRUCTURE_TYPE_TICK, STRUCTURE_TYPE_TAPEWORM, STRUCTURE_TYPE_SLAB, STRUCTURE_TYPE_STARBALL];
		if (compoundStructureList.includes(whichType)){
			this.addNewCompoundStructure(whichType, cx, cy, overrideStruct);
			return null; 
		} else {
			let id = this.myStructures.length; 
			let aStructure = new CyStructure(this, whichType, cx, cy, id, overrideStruct);
			if (aStructure){
				this.myStructures.push(aStructure);
				if (aStructure.bFlocking){ 
					this.myFlocks[whichType].push(aStructure.id);
				}
			}
			return aStructure;
		}
	}


	//===============================================================
	addNewCompoundStructure(whichType, cx, cy, overrideStruct=null){

		switch (whichType){
			//------------------------------
			case STRUCTURE_TYPE_STARBALL:
				if (!overrideStruct){
						overrideStruct = {
						"starStyle":this.theStyleSheet.starBallStarStyle, 
						"trussStyle":this.theStyleSheet.starBallTrussStyle, 
						"initSize": myRandomInt(0,this.theStyleSheet.starBallSpokeLen),
						"nSpokes":this.theStyleSheet.nStarBallSpokes
					}
				}
				let starOverrideStruct = {
					"style":overrideStruct.starStyle, 
					"initSize":1+overrideStruct.initSize,
					"targetSize":0,
					"nSpokes":overrideStruct.nSpokes,
				}
				this.addNewStructure(STRUCTURE_TYPE_STAR,cx,cy, starOverrideStruct);
				let starStructureId = this.myStructures.length-1;

				let nSpokes = overrideStruct.nSpokes;
				let skip = ((nSpokes > 2) && (nSpokes%2 == 0)) ? 3:1;
				for (let s=0; s<nSpokes; s+=skip){
					let ii = 1 + (1+overrideStruct.initSize)*nSpokes + s;
					let iii = this.myStructures[starStructureId].particleIndices[ii];
					let tx = this.myParticles[iii].p.x; 
					let ty = this.myParticles[iii].p.y;  
					let trussOverrideStruct = {
						"style":overrideStruct.trussStyle,
						"initSize":1, "targetSize":1,
					}
					this.addNewStructure(STRUCTURE_TYPE_TRUSS,tx,ty, trussOverrideStruct);
					let trussStructureId = this.myStructures.length-1;

					let trussIndex0 = this.myStructures[trussStructureId].particleIndices[0];
					this.myStructures[starStructureId].particleIndices[ii] = trussIndex0;

					let nSprings = this.myStructures[starStructureId].springs.length;
					let springId = nSprings - nSpokes + s;
					this.myStructures[starStructureId].springs[springId].setIQ(trussIndex0);
					this.myParticles[iii].setIsPartOfStructure(-1);
				}
				break;

			//------------------------------
			case STRUCTURE_TYPE_SLAB:
				if (!overrideStruct){
					let nSegments = this.theStyleSheet.slabNSegs + myRandomInt(0,1);
					let slabStyle = this.theStyleSheet.slabStyle;
					overrideStruct = {'style':slabStyle, 'initSize':nSegments, 'targetSize':1, 'initAng':0.01};
				}
				this.addNewStructure(STRUCTURE_TYPE_TRUSS,cx,cy+this.REST_L*0, overrideStruct);
				let t0 = this.myStructures.length-1;
				this.addNewStructure(STRUCTURE_TYPE_TRUSS,cx,cy+this.REST_L*1, overrideStruct);
				let t1 = this.myStructures.length-1;

				for (let i=0; i<overrideStruct.initSize; i++){
					let prevt1i = this.myStructures[t1].particleIndices[2*i];
					let mount0i = this.myStructures[t0].particleIndices[2*i+1];
					this.myStructures[t1].particleIndices[2*i] = mount0i;
					this.myStructures[t1].springs[i*5+0].setIP( mount0i);
					if (i < (overrideStruct.initSize-1)){
						let mount0j = this.myStructures[t0].particleIndices[(i+1)*2+1];
						this.myStructures[t1].springs[i*5+3].setIP( mount0i);
						this.myStructures[t1].springs[i*5+4].setIP( mount0j);
						if (i>0){
							this.myStructures[t1].springs[i*5+1].setIP( mount0i-1);
							this.myStructures[t1].springs[i*5+1].setIQ( this.myStructures[t1].particleIndices[2*i+1]);
						} else {
							this.myStructures[t1].springs[i*5+1].setIP( 0);
							this.myStructures[t1].springs[i*5+1].setIQ( 1);
						}
					} 
					this.myParticles[prevt1i].setIsPartOfStructure(-1);
				}
				break;

			//------------------------------
			case STRUCTURE_TYPE_TAPEWORM:
				let nSegments = 5;
				let bBallHead = true;
				if (overrideStruct){
					nSegments = overrideStruct.nSegments;
					bBallHead = overrideStruct.bBallHead;
				} else {
					nSegments = this.theStyleSheet.tapewormNumSegsBase + myRandomInt(0,1);
					bBallHead = this.theStyleSheet.tapewormBBallHead;
					let tws = this.theStyleSheet.tapewormStyle;
					overrideStruct = {'style':tws, 'nSegments':nSegments, 'initSize':1, 
						'targetSize':1, 'initAng':(PI*0.25), 'bBallHead':bBallHead};
				}

				let tx = cx; 
				let ty = cy; 
				let prevTrussRearParticleIndex = 0;
				let prevTrussStructureIndex = 0; 
				if (bBallHead){
					let ballHeadStyle = (this.theStyleSheet.ballStructureStyle + 3)%6;
					let ballOverrideStruct = {'style':ballHeadStyle};
					this.addNewStructure(STRUCTURE_TYPE_BALL,tx,ty, ballOverrideStruct);
					prevTrussStructureIndex = this.myStructures.length-1;
					prevTrussRearParticleIndex = this.myStructures[prevTrussStructureIndex].particleIndices[1];
				} else {
					this.addNewStructure(STRUCTURE_TYPE_TRUSS,tx,ty, overrideStruct);
					prevTrussStructureIndex = this.myStructures.length-1;
					let nParticlesInPrevTrussStructure = this.myStructures[prevTrussStructureIndex].particleIndices.length;
					prevTrussRearParticleIndex = this.myStructures[prevTrussStructureIndex].particleIndices[nParticlesInPrevTrussStructure-1];
				}

				for (let j=1; j<nSegments; j++){
					tx += this.REST_L * Math.sqrt(2); 
					this.addNewStructure(STRUCTURE_TYPE_TRUSS,tx,ty, overrideStruct);
					let currTrussStructureIndex = this.myStructures.length-1;
					let currTrussFrontParticleIndex = this.myStructures[currTrussStructureIndex].particleIndices[0];

					this.myStructures[currTrussStructureIndex].springs[0].setIP(prevTrussRearParticleIndex);
					this.myStructures[currTrussStructureIndex].springs[1].setIP(prevTrussRearParticleIndex);
					this.myStructures[currTrussStructureIndex].springs[3].setIP(prevTrussRearParticleIndex);
					this.myStructures[currTrussStructureIndex].particleIndices[0] = prevTrussRearParticleIndex;
					this.myParticles[currTrussFrontParticleIndex].setIsPartOfStructure(-1);

					prevTrussStructureIndex = currTrussStructureIndex;
					let nParticlesInPrevTrussStructure = this.myStructures[prevTrussStructureIndex].particleIndices.length;
					prevTrussRearParticleIndex = this.myStructures[prevTrussStructureIndex].particleIndices[nParticlesInPrevTrussStructure-1];
				}
				break;
			//-------------------------------
			case STRUCTURE_TYPE_TICK: 
				let antennaStyle = getWeightedOption([[6,55],[2,40],[5,5]]);
				let nAntennae = (antennaStyle == 5) ? getWeightedOption([[2,75],[4,25]]) : myRandomInt(4,5);
				let targLenSet = getWeightedOption([[0,80],[1,20]]);
				if (overrideStruct){
					antennaStyle = overrideStruct.antennaStyle;
					nAntennae = overrideStruct.nAntennae;
					targLenSet = overrideStruct.targLenSet; 
				}

				this.addNewStructure(STRUCTURE_TYPE_BALL,cx,cy);
				let ballStructureIndex = this.myStructures.length-1;
				let ballCenterParticleIndex = this.myStructures[ballStructureIndex].particleIndices[0];
				let ballMountParticleIndex = this.myStructures[ballStructureIndex].particleIndices[1];

				let bcx = this.myParticles[ballCenterParticleIndex].p.x;
				let bcy = this.myParticles[ballCenterParticleIndex].p.y;
				let bmpix = this.myParticles[ballMountParticleIndex].p.x;
				let bmpiy = this.myParticles[ballMountParticleIndex].p.y;
				let initAng = Math.atan2 (bmpiy-bcy, bmpix-bcx);

				for (let m=0; m<nAntennae; m++){
					let targLen = (targLenSet == 0) ? myRandomInt(4, 5) : 3;
					let lineOverrideStruct = {'style':antennaStyle, 'initSize': 2, 'targetSize': targLen, "initAng": initAng};
					this.addNewStructure(STRUCTURE_TYPE_LINE, bmpix,bmpiy, lineOverrideStruct);
					let lineStructureIndex = this.myStructures.length-1;
					this.myStructures[lineStructureIndex].bUseGreedyGrowth = false;
					let prevLineParticleIndex = this.myStructures[lineStructureIndex].particleIndices[0];

					this.myStructures[lineStructureIndex].springs[0].setIP(ballMountParticleIndex);
					this.myStructures[lineStructureIndex].particleIndices[0] = ballMountParticleIndex;
					this.myParticles[prevLineParticleIndex].setIsPartOfStructure(-1);
				}
				break;
		}
	}

	addParticleAt(px, py){
		let mx = px + 0.1*myRandomAB(-1,1);
		let my = py + 0.1*myRandomAB(-1,1);
		let aParticle = new Particle(); 
		aParticle.set(mx,my);
		aParticle.setDropoutLikelihood(this.theStyleSheet.blobDropoutPercent, this.theStyleSheet.nucleusDropoutPercent); 
		this.myParticles.push(aParticle);
		this.nInteriorPoints++;

		this.copyParticlesToD3Data(1);
		this.copyParticlesToD3Data(2);
	}


	addParticleGroupAtMouseLocation(){
		let nParticlesToAdd = 50; 
		if (this.myParticles.length < (MAX_N_PARTICLES - nParticlesToAdd)){
			
			let aPolyline = this.getMembraneInteriorContour();  
			if (aPolyline && (aPolyline.length > 0)){
				let nVerts = aPolyline.length; 
				let zoomScale = 1.0;
				let mx = ((mouseX/width  - 0.5) / zoomScale + 0.5) * BASE_DIM; 
				let my = ((mouseY/height - 0.5) / zoomScale + 0.5) * BASE_DIM; 

				let bMouseInside = pointInsideVerts (mx, my, aPolyline, nVerts);
				if (!bMouseInside){	
					let transformResult = this.myDistanceTransformer.computeDistanceTransform(
						false, -1, this.myParticles, this.myStructures); 
					let rx = transformResult.dtx;
					let ry = transformResult.dty; 
					if ((ry > 0) && (rx > 0)){ mx = rx; my = ry; }
				}

				for (let i=0; i<nParticlesToAdd; i++){
					this.addParticleAt(mx, my); 
				}
			}
		}
	}

	drawMask(GFX_P5){
		if (this.bDrawMask){
			GFX_P5.fill(designBgCol);
			GFX_P5.noStroke(); 
			GFX_P5.beginShape(); 
			for (let i=0; i<this.nMaskPoints; i++){
				let rx = this.myParticles[i].p.x;
				let ry = this.myParticles[i].p.y;
				GFX_P5.vertex(rx, ry); 
			}
			GFX_P5.endShape(CLOSE); 
		}
	}




	//===============================================================
	updateDebugView(){
		if (this.bShowDebug){
			let elapsed = millis() - this.debugAskTime; 
			if (elapsed > 60000){
				this.toggleDebugView(); 
			}
		}
	}


	//===============================================================
	drawDesign(graphicsTargetP5){
		// Render the appropriate things into the p5 canvas. 
		let GFX_P5 = graphicsTargetP5;
		if (GFX_P5){

			this.updateSimulation(); 
			this.updateParticles(); 
			this.manageCursor();  

			let GFX_P5_CTX = GFX_P5.canvas.getContext("2d");
			GFX_P5_CTX.lineCap = "round";
			GFX_P5_CTX.lineJoin = "round";
			// GFX_P5.background(designBgCol); // remove

			GFX_P5.push();
			GFX_P5.scale(width/BASE_DIM); 
			GFX_P5.translate(BASE_DIM/2, BASE_DIM/2); 
			// GFX_P5.scale(zoomScale, zoomScale); 
			GFX_P5.translate(0-BASE_DIM/2, 0-BASE_DIM/2); 
			
			//---------------------
			// RENDERING
			this.drawMask(GFX_P5);
			this.drawParticles(GFX_P5, GFX_P5_CTX); 
			this.progressivelyAddStructures(); 
			this.renderStructures(GFX_P5, GFX_P5_CTX); 
			this.determineWhichBlobsToDraw(); 
			this.renderEncircledSiteBlobs(GFX_P5, GFX_P5_CTX);
			this.renderSelectVoronoiCells(GFX_P5);
			this.drawDebugInformation(GFX_P5); 
			
			GFX_P5.pop(); 
		}
	}

	//===============================================================
	getContoursForHatchedShapes(TX,TY,TS) {
		
		let out = []; 
		let hatchBuffer = createGraphics(width*2,height*2, P2D);
		hatchBuffer.pixelDensity(1);

		const hbh = hatchBuffer.height;
		const hbw = hatchBuffer.width; 
		const hcx = hatchBuffer.width/2;
		const hcy = hatchBuffer.height/2;
		const hatchAngle = this.theStyleSheet.HATCH_ANGLE;

		//---------------
		// 1. Draw a rotated version of the input graphics into the offscreen buffer. 
		// Shapes to be hatched should be drawn as white shapes on a black background.
		const FIX_SCALE = (this.nestedLevel == 0) ? TS : (1.8 * TS);
		hatchBuffer.background(0,0,0);  // hatch
		hatchBuffer.noStroke();
		hatchBuffer.push();
		hatchBuffer.translate(hcx, hcy); 
		hatchBuffer.rotate(hatchAngle); 
		hatchBuffer.scale(FIX_SCALE); // compensate later
		hatchBuffer.translate(-hcx, -hcy); 

		// Hatch structures as appropriate.
		const nStructures = this.myStructures.length;
		for (let i = 0; i < nStructures; i++) {
			let ithStructure = this.myStructures[i]; 
			let contours = ithStructure.getContours();

			for (let j=0; j<contours.length; j++){
				const aStyledPolyline = contours[j]; 
				if (aStyledPolyline.bClosed){
					let fillStyle = aStyledPolyline.fillStyle; 
					if (fillStyle != FILL_NONE){
						switch(fillStyle){
							case FILL_PATTERN: 
							case FILL_BLACK:
								hatchBuffer.fill(255,255,255); break; // hatch
							case FILL_WHITE:
								hatchBuffer.fill(0,0,0); break; // hatch
						}

						const verts = aStyledPolyline.verts;
						const N = verts.length;
						if (N > 0){
							const tightness = 1.0/3.0; 
							let p1 = ithStructure.getVertexPoint(verts, 0, 0, tightness);
							if (p1){
								hatchBuffer.beginShape(); 
								hatchBuffer.vertex(p1.x, p1.y);
								for (let k=0; k<N; k++){
									let p2 = ithStructure.getVertexPoint(verts, k,    1, tightness);
									let p3 = ithStructure.getVertexPoint(verts, k+1, -1, tightness);
									let p4 = ithStructure.getVertexPoint(verts, k+1,  0, tightness);
									hatchBuffer.bezierVertex(p2.x,p2.y, p3.x,p3.y, p4.x,p4.y);
								}
								hatchBuffer.endShape(CLOSE);
							}
						}
					} 
				}
			}
		}

		// Hatch enclosed blobs as appropriate. 
		if (this.theStyleSheet.bDrawEncircledSiteBlobs){
			let d3Polygons = this.d3Voronoi.cellPolygons();
			let aD3Polygon = d3Polygons.next();
			let siteId = 0;
			hatchBuffer.stroke(0,0,0);  // hatch
			hatchBuffer.strokeWeight(1);
			let bDoFillSiteBlobs = this.theStyleSheet.bDoFillSiteBlobs;
			if (bDoFillSiteBlobs){ 
				hatchBuffer.fill(255 - this.theStyleSheet.siteBlobFillColor); 
			}
			
			while (!aD3Polygon.done) {
				if (this.myParticles[siteId].bDrawSiteBlob){ 
					if (!this.myParticles[siteId].bNeverDisplayAsBlob){
						let bBlobIsPartOfAStructure = !(this.myParticles[siteId].isPartOfStructure == -1); 
						if (!bBlobIsPartOfAStructure){
							let cellVertices = aD3Polygon.value;
							let nCellVertices = cellVertices.length-1;
							let cx = this.myParticles[siteId].c.x;
							let cy = this.myParticles[siteId].c.y;
							this.drawSiteBlob(hatchBuffer, true, cellVertices, nCellVertices, cx, cy)
						}
					}
				}
				aD3Polygon = d3Polygons.next();
				siteId++; 
			}
		}

		hatchBuffer.pop();

		//---------------
		// 2. Compute hatch lines in the rotated graphics.
		let hatchLines = [];
		hatchBuffer.loadPixels();
		const hatchDensity = int(this.theStyleSheet.HATCH_DENSITY);
		const nudge = 0; //1
		for (let y=0; y<hbh; y+=hatchDensity) {
			let row = y*hbw;
			let bActive = false;
			let prevR = 0;
			for (let x=0; x<hbw; x++) {
				let index = (row + x)*4;
				let currR = hatchBuffer.pixels[index]; // red byte is sufficient
				if (x == (hbw-1)){
					if (bActive){
						hatchLines.push(createVector(x, y)); // line end
						bActive = false; 
					}
				} else {
					if ((currR >= 128) && (prevR < 128)){
						hatchLines.push(createVector(x+nudge, y)); // line start
						bActive = true; 
					} else if ((currR < 128) && (prevR >= 128) && bActive){
						hatchLines.push(createVector(x-nudge, y)); // line end
						bActive = false; 
					}
				}
				prevR = currR;
			}
		}

		//---------------
		// 3. Un-rotate the hatch lines.
		for (let i=0; i<hatchLines.length; i+=2) {
			let s = hatchLines[i]; // start
			let e = hatchLines[i+1]; // end
			let sxo = s.x - hcx;
			let syo = s.y - hcy;
			sxo *= 1.0/FIX_SCALE; // compensate
			syo *= 1.0/FIX_SCALE;
			let sxr = sxo * Math.cos(-hatchAngle) - syo * Math.sin(-hatchAngle) + hcx;
			let syr = syo * Math.cos(-hatchAngle) + sxo * Math.sin(-hatchAngle) + hcy;
			let exo = e.x - hcx;
			let eyo = e.y - hcy;
			exo *= 1.0/FIX_SCALE; // compensate
			eyo *= 1.0/FIX_SCALE;
			let exr = exo * Math.cos(-hatchAngle) - eyo * Math.sin(-hatchAngle) + hcx;
			let eyr = eyo * Math.cos(-hatchAngle) + exo * Math.sin(-hatchAngle) + hcy;
			hatchLines[i].set(sxr, syr); 
			hatchLines[i+1].set(exr, eyr); 
		}

		//---------------
		// 4. Output StyledPolyline's of the hatch lines.
		let aStyledPolyline;
		let aPolyline;
		for (let i=0; i<hatchLines.length; i+=2) {
			let s = hatchLines[i]; // start
			let e = hatchLines[i+1]; // end

			aPolyline = []; 
			aPolyline.push( createVector(s.x, s.y)); 
			aPolyline.push( createVector(e.x, e.y)); 

			aStyledPolyline = new StyledPolyline(aPolyline, false, false, false, false, STROKE_BLACK, FILL_NONE, WEIGHT_0, 0,0);
			out.push(aStyledPolyline); 
		}
		
		//---------------
		// 5. Clean up and return 
		aStyledPolyline = null;
		aPolyline = null;
		hatchBuffer = null;
		hatchLines = [];
		return out; 
	}


	//===============================================================
	updateSimulation(){

		this.updateClockAndTemperature();
		if (this.TEMPERATURE > 0){
			this.fadeInPhysics = Math.min(1.0, this.simulationFrameCount/fadeInPhysicsNFrames);
			let bFirstTimeForMask = false;
			this.generateMask(bFirstTimeForMask);
			
			// Grow any structures that are set to grow. 
			const nStructures = this.myStructures.length;
			if ((this.TEMPERATURE < 1) == false){
				for (let i = 0; i < nStructures; i++) {
					if (this.myStructures[i].bGrowing == true){
						this.myStructures[i].growStructureIfGrowing(); 
					}
				}
			}

			const nPasses = 2; // Apply forces in passes.
			for (let whichPass = 1; whichPass <= nPasses; whichPass++){
				// Apply forces, then update -- and do both within the loop.
				this.applyLloydRelaxationForces(whichPass); 
				this.applyMouseForces(whichPass);
				this.applyFlockingForces(whichPass);
				for (let i = 0; i < nStructures; i++) {
					this.myStructures[i].applySpringForces(whichPass);
					this.myStructures[i].applySmoothingForces(whichPass);
					this.myStructures[i].applyScrunchingForces(whichPass);
					this.myStructures[i].applySiteForce(whichPass);
				}

				//------
				let particleConstrainCycLen = 8;  
				if (mouseIsPressed || ((mousePressedTime < mouseReleasedTime) && 
					((millis()-mouseReleasedTime) < 3000))){
					particleConstrainCycLen = 1; 
				}
				const currentParticleUpdateCycle = this.simulationFrameCount % particleConstrainCycLen;
				for (let i=0; i<this.myParticles.length; i++) {
					if (i%particleConstrainCycLen == currentParticleUpdateCycle){
						let bParticleWasErrant = this.myParticles[i].updateAndConstrainToMask(whichPass, this.myParticles, this.nMaskPoints);
						if (bParticleWasErrant){
							let idOfStructureWithErrantParticle = this.myParticles[i].isPartOfStructure;
							if (idOfStructureWithErrantParticle > 0){
								this.myStructures[idOfStructureWithErrantParticle].applyForceTowardsTarget(this.CX, this.CY, whichPass, 0.25);
							}
						}
					} else {
						this.myParticles[i].update(whichPass); 
					}
				}
				
				//------
				this.copyParticlesToD3Data(whichPass); 
			}

		}
	}

	//===============================================================
	clearForces(){
		let nStructures = this.myStructures.length;
		for (let i = 0; i < nStructures; i++) {
			this.myStructures[i].clearForces(); 
		}
	}



	//===============================================================
	advanceFreeParticles(){
		for (let whichPass = 1; whichPass <= 2; whichPass++){
			this.applyLloydRelaxationForces(whichPass); 
			for (let i=0; i<this.myParticles.length; i++) {
				if (this.myParticles[i].isFree ){ 
					this.myParticles[i].update(whichPass); 
				}
			}
			this.copyParticlesToD3Data(whichPass); 
		}
	}

	//===============================================================
	updateClockAndTemperature(){
		let now = millis();
		FPS = 0.99*FPS + 0.01*(1000.0/(now - this.lastFrameTime));
		this.lastFrameTime = now;

		// Cool down the temperature — based on simulationFrameCount. 
		// Reduces the size of the timestep over time, to zero.

		let millisPerFrame = 32.0; 
		let temperatureEasing = 2.0; 
		this.myMillis += Math.pow(this.TEMPERATURE, temperatureEasing) * millisPerFrame; 

		if (this.TEMPERATURE > 0){	
			this.simulationFrameCount++; 
		} else {
			let millisElapsedSinceFreeze = millis() - this.temperatureInitFreezeTime; 
			if (millisElapsedSinceFreeze > (nSecondsToFreeze*1000)){
				this.bTemperatureCooling = false;
				this.TEMPERATURE = 1.0; 
			}
		}

		bApplyMouseForces = true;
		if (this.bTemperatureCooling){
			this.TEMPERATURE *= this.theStyleSheet.temperatureCoolingRate; // HERE IT IS
			if (this.TEMPERATURE < (1.0/16384.0)){
				this.TEMPERATURE = 0; 
				this.bTemperatureCooling = false;
				bApplyMouseForces = false;
			}
		}

		for (let i=0; i<this.myParticles.length; i++){
			this.myParticles[i].setTemperatureOverMass(this.TEMPERATURE);
		}
	}

	//===============================================================
	drawDebugInformation(GFX_P5){
		if (this.bSaveScreencapture){ 
			this.bShowDebug = false; 
		}

		if (this.bShowDebug){
			let nSprings = 0; 
			for (let i = 0; i < this.myStructures.length; i++) {
				nSprings += this.myStructures[i].springs.length;
			}
			GFX_P5.noStroke(); 
			//let elapsed = millis() - debugAskTime;
			//let ta = 255.0 * Math.pow(map(elapsed, 0,10000, 0,1, true), 8.0); 
			GFX_P5.fill(CYTO_BLACK);
			GFX_P5.textFont('Georgia');
			GFX_P5.textSize(12);

			let ty = 30;  
			let tx = 30;
			let dy = 15; 
			// GFX_P5.text("Press 'n' for new design.", tx, ty+=dy); 
			// GFX_P5.text("Press SPACE to pause/unpause.", tx, ty+=dy); 
			GFX_P5.text("fps: " + nf(FPS,1,2), tx, ty+=dy); 
			GFX_P5.text("temperature: " + nf(this.TEMPERATURE, 1,3), tx, ty+=dy); 
			GFX_P5.text("simulationFrame: " + this.simulationFrameCount, tx, ty+=dy); 
			GFX_P5.text("myMillis: " + int(this.myMillis), tx, ty+=dy); 
			GFX_P5.text("schema: " + this.theStyleSheet.THE_SCHEMA, tx, ty+=dy);
			GFX_P5.text("nStructures: " + this.myStructures.length, tx, ty+=dy); 
			GFX_P5.text("nParticles: " + this.myParticles.length, tx, ty+=dy); 
			GFX_P5.text("nSprings: " + nSprings, tx, ty+=dy); 
			GFX_P5.text("nestedLevel: " + this.nestedLevel, tx, ty+=dy); 

			GFX_P5.textSize(120);
			GFX_P5.text(this.correspondingIdOfStructureInCell0, BASE_DIM/2, BASE_DIM/2); 
		}
	}

	//===============================================================
	applyLloydRelaxationForces (whichPass){
		// Calculate LLOYD forces.

		this.d3Delaunay = null; 
		this.d3Voronoi = null; 
		this.d3Delaunay = new d3.Delaunay(this.d3Data); 
		this.d3Voronoi = this.d3Delaunay.voronoi([0, 0, VOR_W, VOR_H]);
		
		let siteId = 0; 
		let cx, cy, dx, dy, dh; 
		let centroidA, thePoint; 
		const dhThresh = 0.00001 / LLOYD_SPEED;

		let d3Polygons = this.d3Voronoi.cellPolygons();
		let aD3Polygon = d3Polygons.next();

		if (whichPass == 1){
			while (!aD3Polygon.done) {
				if (!this.myParticles[siteId].bIsABoundarySite){
					const cellVertices = aD3Polygon.value;
					centroidA = getCentroidOfConvexPolygonAreaFast(cellVertices);
					thePoint = this.myParticles[siteId].p0;
					dx = (centroidA[0] - thePoint.x);
					dy = (centroidA[1] - thePoint.y);
					dh = Math.sqrt(dx*dx + dy*dy) / LLOYD_SPEED;
					if (dh > dhThresh){ 
						this.myParticles[siteId].addForce(dx/dh,dy/dh, whichPass); 
					} 
				}
				aD3Polygon = d3Polygons.next();
				siteId++; 
			}

		} else {
			while (!aD3Polygon.done) {
				if (!this.myParticles[siteId].bIsABoundarySite){
					const cellVertices = aD3Polygon.value;
					centroidA = getCentroidOfConvexPolygonAreaFast(cellVertices);
					cx = centroidA[0];
					cy = centroidA[1];
					this.myParticles[siteId].c.set(cx, cy);
					thePoint = this.myParticles[siteId].pE;
					dx = (cx - thePoint.x);
					dy = (cy - thePoint.y);
					dh = Math.sqrt(dx*dx + dy*dy) / LLOYD_SPEED;
					if (dh > dhThresh){ 
						this.myParticles[siteId].addForce(dx/dh, dy/dh, whichPass); 
					}
				}
				aD3Polygon = d3Polygons.next();
				siteId++; 
			}
		}
	}



	clearGrabbedItems(){
		// Reset which (global) particle and which structure is grabbed.
		if ((this.GRABBED_STRUCTURE_ID >= 0) && (this.GRABBED_STRUCTURE_ID < this.myStructures.length)){
			this.myStructures[this.GRABBED_STRUCTURE_ID].whichParticleIsGrabbed = -1;}
		if (this.GRABBED_PARTICLE_ID >= 0){
			this.myParticles[this.GRABBED_PARTICLE_ID].bFixed = false;
		}
		this.GRABBED_STRUCTURE_ID = -1; 
		this.GRABBED_PARTICLE_ID = -1;
	}

	manageCursor(){
		let zoomScale = 1.0; 
		const mx = ((mouseX/width  - 0.5) / zoomScale + 0.5) * BASE_DIM; 
		const my = ((mouseY/height - 0.5) / zoomScale + 0.5) * BASE_DIM; 
		this.HOVER_ITEMS = this.determineClosestStructureAndParticle(mx,my, this.REST_L, false);

		if (bApplyMouseForces){
			if (mouseIsPressed){
				if ((this.HOVER_ITEMS.closestStructureId > -1) && 
					(this.HOVER_ITEMS.closestParticleGlobalId > -1)){
					cursor('grabbing');
				} else {
					cursor('pointer');
				}
			} else {
				if ((this.HOVER_ITEMS.closestStructureId > -1) && 
					(this.HOVER_ITEMS.closestParticleGlobalId > -1)){
					cursor('grab');
				} else {
					cursor('default');
				}
			}
		} else {
			cursor('default');
		}
	}


	determineClosestPointOnLoop(px, py, testDistance){
		let closestResult = this.determineClosestStructureAndParticle(px, py, testDistance, true);
		let outputStruct = {
			'valid':false,
			'x':0,
			'y':0
		}
		if (closestResult.closestStructureId >= 0){
			let aStructure = this.myStructures[closestResult.closestStructureId];
			let localIndexOfParticle = closestResult.closestParticleLocalId;

			if ((aStructure.type == STRUCTURE_TYPE_LOOP) ||
				(aStructure.type == STRUCTURE_TYPE_BALL) ||
				(aStructure.type == STRUCTURE_TYPE_CENTI) ||
				(aStructure.type == STRUCTURE_TYPE_URCHIN) ||
				(aStructure.type == STRUCTURE_TYPE_WHEEL)) {

				let a = localIndexOfParticle; 
				let b = localIndexOfParticle; 
				let c = localIndexOfParticle; 
				let np = aStructure.particleIndices.length;

				if (aStructure.type == STRUCTURE_TYPE_LOOP){
					a = (b-1+np)%np;
					c = (b+1   )%np;
				} else if (aStructure.type == STRUCTURE_TYPE_WHEEL){
					if (aStructure.STYLE_ID == 13){
						return outputStruct; // invisible!
					}
					if ((aStructure.STYLE_ID == 5) || (aStructure.STYLE_ID == 10)) { // inside line 
						b = b - (b%2);
					}
					if ((aStructure.STYLE_ID == 9) || (aStructure.STYLE_ID == 6)){ // outside line
						if (b%2 == 0) b++; 
					}
					a = (b-2+np)%np;
					c = (b+2   )%np;
				} else if (aStructure.type == STRUCTURE_TYPE_BALL){
					if (b <= 1){
						a = np-1;
						c = 2; 
					} else if (b >= (np-1)){
						a = b-1; 
						c = 1; 
					} else {
						a = b-1; 
						c = b+1;
					}
				} else if (aStructure.type == STRUCTURE_TYPE_CENTI){
					if (b < 2){
						a = (b-1+np)%np;
						c = (b+1   )%np;
					} else {
						if (b%4 == 2){ b = (b-2 + np)%np;
						} else if (b%4 == 3){ b = (b+2 + np)%np; }
						a = (b-4+np)%np;
						c = (b+4   )%np;
					}
				} else if (aStructure.type == STRUCTURE_TYPE_URCHIN){
					let spinelen = aStructure.PROPERTY_A;
					let nParticlesPerSegment = 2+spinelen;
					
					if ((b % nParticlesPerSegment) > 1){
						b = (b - (b % nParticlesPerSegment) + 1)%np;
					}
					a = (b - nParticlesPerSegment + np)%np;
					c = (b + nParticlesPerSegment     )%np;
				}

				let ia = aStructure.particleIndices[a];
				let ib = aStructure.particleIndices[b];
				let ic = aStructure.particleIndices[c];

				
				let pa = this.myParticles[ia].p;
				let pb = this.myParticles[ib].p;
				let pc = this.myParticles[ic].p;
				let dista = dist(px,py, pa.x,pa.y);
				let distc = dist(px,py, pc.x,pc.y);

				// http://paulbourke.net/geometry/pointlineplane/
				let x3 = px; 
				let y3 = py; 
				let x1 = pb.x; 
				let y1 = pb.y; 
				let x2 = pa.x; 
				let y2 = pa.y; 
				if (distc < dista){
					x2 = pc.x; 
					y2 = pc.y; 
				}
				let u = ((x3-x1)*(x2-x1) + (y3-y1)*(y2-y1)) / ((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
				u = Math.max(0, Math.min(1, u)); 
				let ox = x1 + u*(x2-x1); 
				let oy = y1 + u*(y2-y1); 
				outputStruct.x = ox;
				outputStruct.y = oy;
				outputStruct.valid = true;
				
			} else {
				let globalIndexOfParticle = aStructure.particleIndices[localIndexOfParticle];
				outputStruct.x = this.myParticles[globalIndexOfParticle].p.x;
				outputStruct.y = this.myParticles[globalIndexOfParticle].p.y;
				outputStruct.valid = true;
			}
		}
		return outputStruct;
	}


	determineClosestStructureAndParticle(px, py, testDistance, bLoopsOnly){
		let outputStruct = {
			'closestStructureId':-1, 
			'closestParticleGlobalId': -1, 
			'closestParticleLocalId': -1,
			'closestParticleDistance':99999
		};

		if (bApplyMouseForces){
			if (this.myStructures.length > 0){ // was 1 -- why ? 

				// Determine the closest particle and structure
				let closestStructureId = -1; 
				let closestParticleLocalIndex = -1; 
				let closestParticleGlobalIndex = -1; 
				let closestParticleDistance2 = Number.POSITIVE_INFINITY;

				for (let s=0; s<this.myStructures.length; s++){
					let bProceed = (!bLoopsOnly) || 
						(bLoopsOnly && (this.myStructures[s].bLoop == true));
					if (bProceed){
						const nParticlesInStructure = this.myStructures[s].particleIndices.length;
						for (let i=0; i<nParticlesInStructure; i++){
							let ip = this.myStructures[s].particleIndices[i]; 
							if (this.myParticles[ip].isPartOfStructure != -1){ // double
								let dx = px - this.myParticles[ip].p.x;
								let dy = py - this.myParticles[ip].p.y;
								let dh2 = dx*dx + dy*dy; 
								if (dh2 < closestParticleDistance2){
									closestParticleLocalIndex = i;
									closestParticleGlobalIndex = ip;
									closestParticleDistance2 = dh2;
									closestStructureId = s; 
								}
							}
						}
					}
				}

				if (closestStructureId >= 0){
					let closestParticleDistance = Math.sqrt(closestParticleDistance2); 
					if ((closestParticleDistance < testDistance) && 
						(closestParticleGlobalIndex >= 0) &&
						(closestParticleLocalIndex >= 0)){
							outputStruct.closestStructureId = closestStructureId;
							outputStruct.closestParticleGlobalId = closestParticleGlobalIndex;
							outputStruct.closestParticleLocalId = closestParticleLocalIndex;
							outputStruct.closestParticleDistance = closestParticleDistance;
					}
				}
			}
		}
		return outputStruct; 
	}


	drawMouseInfluenceCircle(){
		/*
		if (mouseIsPressed && (this.GRABBED_STRUCTURE_ID == -1) && (this.GRABBED_PARTICLE_ID == -1)){
			let elapsed = millis() - mousePressedTime;
			let elapsedFrac = Math.pow(constrain(elapsed/MOUSE_FORCE_RADIUS_TIME, 0.0,1.0), 0.75);
			const maxForceRadius = MOUSE_FORCE_RADIUS_PERCENT * elapsedFrac * BASE_DIM; // was width
			const nPts = 60;
			this.ogIllustration.noStroke(); 
			this.ogIllustration.fill('black'); 
			let zoomScale = 1.0; 
			for (let i=0; i<nPts; i++){
				let t = TWO_PI*i/nPts;
				let px = mouseX + zoomScale * maxForceRadius*Math.cos(t); 
				let py = mouseY + zoomScale * maxForceRadius*Math.sin(t); 
				this.ogIllustration.circle(px, py, zoomScale); 
			}
		}
		*/
	}

	//===============================================================
	applyMouseForces (whichPass){
		if (bApplyMouseForces && mouseIsPressed){
			if ((mouseX > 0) && (mouseX < width) &&
				(mouseY > 0) && (mouseY < height)){
				let zoomScale = 1.0; 
				const mx = ((mouseX/width  - 0.5) / zoomScale + 0.5) * BASE_DIM; 
				const my = ((mouseY/height - 0.5) / zoomScale + 0.5) * BASE_DIM; 

				let bStructureIsBeingGrabbed = (this.GRABBED_STRUCTURE_ID >= 0) && (this.GRABBED_PARTICLE_ID >= 0);
				if (bStructureIsBeingGrabbed){
					
					// get a list of the particles that are attached by springs to GRABBED_PARTICLE_ID 
					const nSprings = this.myStructures[this.GRABBED_STRUCTURE_ID].springs.length; 
					let attachedPids = [this.GRABBED_PARTICLE_ID];
					for (let i=0; i<nSprings; i++){
						let aSpring = this.myStructures[this.GRABBED_STRUCTURE_ID].springs[i]; 
						let ip = aSpring.getIP(); 
						let iq = aSpring.getIQ(); 
						if (ip == this.GRABBED_PARTICLE_ID){ attachedPids.push(iq); 
						} else if (iq == this.GRABBED_PARTICLE_ID){ attachedPids.push(ip);}
					}
					// Pull those particles toward the cursor
					for (let i=0; i<attachedPids.length; i++){
						let ii = attachedPids[i]; 
						let thePoint = (whichPass == 1) ? this.myParticles[ii].p0 : this.myParticles[ii].pE;
						let px = thePoint.x;
						let py = thePoint.y;
						let dx = mx - px; 
						let dy = my - py; 
						let dh2 = dx*dx + dy*dy;
						if (dh2 > 1.0){
							let attractForce = (i==0)? 20 : 5;
							let fx = dx/100 * attractForce;
							let fy = dy/100 * attractForce;
							this.myParticles[ii].addForce(fx, fy, whichPass); 
						}
					}

				} else { // mouse is pressed, but no structure is grabbed.
					let elapsed = millis() - mousePressedTime;
					let elapsedFrac = Math.pow(constrain(elapsed/MOUSE_FORCE_RADIUS_TIME, 0.0,1.0), 0.75);
					const maxForceRadius = MOUSE_FORCE_RADIUS_PERCENT * BASE_DIM * elapsedFrac;
					const maxForceRadius2 = maxForceRadius * maxForceRadius; 
					let repulsion, mfpow;
					for (let i=0; i<this.myParticles.length; i++) {
						if (!this.myParticles[i].bIsABoundarySite){

							let thePoint = (whichPass == 1) ? this.myParticles[i].p0 : this.myParticles[i].pE;
							let px = thePoint.x;
							let py = thePoint.y;
							let dx = mx - px; 
							let dy = my - py; 
							let dh2 = (dx*dx + dy*dy); 
							if ((dh2 < maxForceRadius2) && (dh2 > this.REST_L)){
								if (this.myParticles[i].isPartOfStructure == 0){
									repulsion = -1.0; 
									mfpow = 1.0;  
								} else {
									repulsion = MOUSE_REPULSION;
									mfpow = MOUSE_FORCE_POW;
								}

								let dh = Math.sqrt(dh2); 
								let falloff = Math.pow(1.0-(dh/maxForceRadius), mfpow) * repulsion;
								let fx = (dx/dh) * falloff; 
								let fy = (dy/dh) * falloff; 
								this.myParticles[i].addForce(fx, fy, whichPass); 
							}
						}
					}
		
				}
			}
		} 
	}


	//===============================================================
	// https://p5js.org/examples/simulate-flocking.html
	applyFlockingForces (whichPass){

		if (bApplyFlockingForces){

			const avgSep = 3.0 * this.estimateAverageSeparation();
			const ballA = this.theStyleSheet.ballForceBalance; 
			const ballB = 1.0-ballA; 
			
			for (let j = 0; j < this.myStructures.length; j++) {
				if (this.myStructures[j].type == STRUCTURE_TYPE_BALL){
					if (this.myStructures[j].bFlocking && (this.myStructures[j].siteAttachmentId == -1)){

						// find nearest point on wheel 
						let bj = this.myStructures[j].particleIndices[0];
						let bx = (whichPass == 1) ? this.myParticles[bj].p0.x : this.myParticles[bj].pE.x;
						let by = (whichPass == 1) ? this.myParticles[bj].p0.y : this.myParticles[bj].pE.y;

						let closestDist = Number.POSITIVE_INFINITY; 
						let closestWx = 0; 
						let closestWy = 0; 
						let bFound = false; 

						for (let i=0; i < this.myStructures.length; i++){
							if (this.myStructures[i].type == STRUCTURE_TYPE_WHEEL){

								const nWheelParticles = this.myStructures[i].particleIndices.length;
								for (let w=0; w<nWheelParticles; w++){
									const wi = this.myStructures[i].particleIndices[w];
									const wx = (whichPass == 1) ? this.myParticles[wi].p0.x : this.myParticles[wi].pE.x;
									const wy = (whichPass == 1) ? this.myParticles[wi].p0.y : this.myParticles[wi].pE.y;

									const dx = bx - wx; 
									const dy = by - wy;
									const dh2 = dx*dx + dy*dy;  
									if (dh2 < closestDist){
										bFound = true; 
										closestDist = dh2; 
										closestWx = wx; 
										closestWy = wy; 
									}
								}
							}
						}

						if (bFound){
							let fx = 0; 
							let fy = 0; 
							let dx = bx - closestWx; 
							let dy = by - closestWy;
							let dh = Math.sqrt(dx*dx + dy*dy);  
							if (dh > 0){
								dx/=dh; 
								dy/=dh;
								if (closestDist > avgSep){
									fx = 0 - (dx * ballA) + (dy * ballB);
									fy = 0 - (dy * ballA) - (dx * ballB);
								} else if (closestDist <= avgSep){
									fx = dx * 10.0; 
									fy = dy * 10.0; 
								}
								fx *= this.theStyleSheet.ballAttractionStrength; 
								fy *= this.theStyleSheet.ballAttractionStrength; 
								this.myParticles[bj].addForce(fx, fy, whichPass);
							}
						}
					}
				}
			}
			
			// Flockables structure types are
			// STRUCTURE_TYPE_LINE,  STRUCTURE_TYPE_DASH
			// In all cases, we'll use the 0'th point of their particles as the registration point for flocking.

			// Each element of the flocks array contains the id's of structures that would flock together.
			// For now, there's one flock for each of the 10 structure types, but this could change later.

			let flockConfigs = [ 
				[3.0, 0.30, 1.5,1.0,1.0,2.0],  
				[2.0, 0.20, 1.5,1.0,2.5,-4.0],  
				[8.0, 0.05, 1.5,4.0,0.5,16.0] ];
			
			let config = flockConfigs[this.theStyleSheet.flockConfig]; 

			const desiredseparation = BASE_DIM * this.estimateAverageSeparation();
			const neighborhoodRadius = desiredseparation * config[0];
			// let maxForce = config[1];
			const separationFactor = config[2];
			const alignmentFactor = config[3]; 
			const cohesionFactor = config[4]; 
			const mouseForceFactor = config[5];
			const tailCorrectionFactor = config[1]; 

			if (this.theStyleSheet.bUseAmorphousCellContour){
				this.resampledNoisyBlobPolyline = new ofPolyline();
				for (let i=0; i<this.nMaskPoints; i++){
					this.resampledNoisyBlobPolyline.add(this.myParticles[i].p.x, this.myParticles[i].p.y, 0); 
				}
			}

			let zoomScale = 1.0; 
			const mx = ((mouseX/width  - 0.5) / zoomScale + 0.5) * BASE_DIM; 
			const my = ((mouseY/height - 0.5) / zoomScale + 0.5) * BASE_DIM; 

			let verts = this.resampledNoisyBlobPolyline.points;
			let nVerts = this.resampledNoisyBlobPolyline.points.length;
			let bMouseInside = pointInsideVerts (mx, my, verts, nVerts);
			let maxMouseDist = BASE_DIM * 0.125;

			if (this.theStyleSheet.bUseAmorphousCellContour){
				this.resampledNoisyBlobPolyline = null; 
			}

			for (let fl=0; fl<10; fl++){
				if (fl != STRUCTURE_TYPE_BALL){ // handled above

					let maxForce = config[1];
					if (fl == STRUCTURE_TYPE_DASH){
						maxForce *= map(Math.cos(this.myMillis / 10000.0), -1,1, 0.75,1.00);
					} else if (fl == STRUCTURE_TYPE_LINE){
						maxForce *= map(Math.sin(this.myMillis / 10000.0), -1,1, 0.60,1.00);
					}

					const nStructuresInThisFlock = this.myFlocks[fl].length;
					if (nStructuresInThisFlock > 0){

						for (let u=0; u<nStructuresInThisFlock; u++){
							const uBoidIndex = this.myFlocks[fl][u];
							if (this.myStructures[uBoidIndex].bFlocking){
								const uParticleIndex0 = this.myStructures[uBoidIndex].particleIndices[0];
								const uP0 = this.myParticles[uParticleIndex0];
								const uP0p = (whichPass == 1) ? uP0.p0 : uP0.pE;
								const uP0v = (whichPass == 1) ? uP0.v0 : uP0.v1;

								// Forces on structure u
								let cohesionForce = createVector(0, 0);
								let alignmentForce = createVector(0, 0);
								let separationForce = createVector(0, 0);
								let orientationForce = createVector(0, 0);
								let mouseAttractForce = createVector(0, 0);

								// Cohesion, Alignment. For structure u, 
								// Compute the average position & velocity of neighbors
								let neighborPositionAvg = createVector(0, 0); 
								let neighborVelocityAvg = createVector(0, 0); 
								let neighborCount = 0;
								let sepCount = 0;

								for (let v=0; v<nStructuresInThisFlock; v++){
									if (v != u){ // don't compare to self
										let vBoidIndex = this.myFlocks[fl][v];
										if (this.myStructures[vBoidIndex].bFlocking){
									
											const vParticleIndex0 = this.myStructures[vBoidIndex].particleIndices[0];
											const vP0 = this.myParticles[vParticleIndex0];
											const vP0p = (whichPass == 1) ? vP0.p0 : vP0.pE;
											const vP0v = (whichPass == 1) ? vP0.v0 : vP0.v1;

											const dx = uP0p.x - vP0p.x;
											const dy = uP0p.y - vP0p.y;
											const dh = Math.sqrt(dx*dx + dy*dy); 
											if (dh > 0){
												if (dh < neighborhoodRadius) {
													neighborCount++;
													neighborPositionAvg.add(vP0p.x, vP0p.y); // accumulate position
													neighborVelocityAvg.add(vP0v.x, vP0v.y); // accumulate velocity
												}

												if (dh < desiredseparation) {
													// Calculate vector pointing away from neighbor
													let diff = p5.Vector.sub(uP0p, vP0p);
													diff.normalize();
													diff.div(dh); // Weight by distance
													separationForce.add(diff);
													sepCount++; // Keep track of how many
												}
											}
										}
									}
								}


								if (neighborCount > 0) {
									neighborPositionAvg.div(neighborCount);
									let desired = p5.Vector.sub(neighborPositionAvg, uP0p);  // A vector pointing from the location to the target
									desired.normalize();
									desired.mult(this.MAX_SPEED);
									cohesionForce = p5.Vector.sub(desired, uP0v); // Steering = Desired minus Velocity
									cohesionForce.limit(maxForce); 
									neighborVelocityAvg.div(neighborCount);
									neighborVelocityAvg.normalize();
									neighborVelocityAvg.mult(this.MAX_SPEED);
									alignmentForce = p5.Vector.sub(neighborVelocityAvg, uP0v);
									alignmentForce.limit(maxForce); 
								}

								if (sepCount > 0) {
									separationForce.div(sepCount);
									if (separationForce.mag() > 0) {
										separationForce.normalize();
										separationForce.mult(this.MAX_SPEED);
										separationForce.sub(uP0v);
										separationForce.limit(maxForce);
									}
								}

								// Dashes swirl around the mouse if it's clicked.
								if (fl == STRUCTURE_TYPE_DASH){
									if (mouseIsPressed && bMouseInside){
										let mouseVec = createVector(mx, my); 
										let desired = p5.Vector.sub(mouseVec, uP0p);  // A vector pointing from the location to the target
										let mouseDist = min(maxMouseDist, desired.mag());
										desired.normalize();
										desired.mult(this.MAX_SPEED);
							
										mouseAttractForce = p5.Vector.sub(desired, uP0v); // Steering = Desired minus Velocity
										mouseAttractForce.limit(maxForce); 
										if ((mouseDist > desiredseparation) && (mouseDist < maxMouseDist)) {
											let mfx = mouseAttractForce.x;
											let mfy = mouseAttractForce.y;
											mouseAttractForce.x = (0.25*mfx - mfy) * (1.0 - mouseDist/maxMouseDist);
											mouseAttractForce.y = (0.25*mfy + mfx) * (1.0 - mouseDist/maxMouseDist);
											mouseAttractForce.mult(mouseForceFactor); 
											this.myParticles[uParticleIndex0].addForce(mouseAttractForce.x, mouseAttractForce.y, whichPass);
										}
									}
								}
							
								// Apply (weighted) forces to structure u. 
								separationForce.mult(separationFactor);
								alignmentForce.mult(alignmentFactor);
								cohesionForce.mult(cohesionFactor);
								
								this.myParticles[uParticleIndex0].addForce(separationForce.x, separationForce.y, whichPass);
								this.myParticles[uParticleIndex0].addForce(alignmentForce.x, alignmentForce.y, whichPass);
								this.myParticles[uParticleIndex0].addForce(cohesionForce.x, cohesionForce.y, whichPass);
							
								// Apply forces to correct orientation of tail (2nd particle) of structure u.
								let velMag = Math.sqrt(uP0v.x*uP0v.x + uP0v.y*uP0v.y);
								if (velMag > 0){
									let Vn = createVector(uP0v.x/velMag, uP0v.y/velMag); 

									let uParticleIndex1 = this.myStructures[uBoidIndex].particleIndices[1];
									let uP1 = this.myParticles[uParticleIndex1];
									let uP1p = (whichPass == 1) ? uP1.p0 : uP1.pE;
									let Qn = createVector(uP1p.x - uP0p.x, uP1p.y - uP0p.y); 
									Qn.normalize(); 

									let crossProduct = p5.Vector.cross(Vn, Qn);
									let qForceMag = velMag * crossProduct.z;
									orientationForce.set(0 - Qn.y*qForceMag, Qn.x*qForceMag);
									orientationForce.mult(tailCorrectionFactor);
									this.myParticles[uParticleIndex1].addForce(orientationForce.x, orientationForce.y, whichPass);
								}
								
							}
						}

					}
				}
			}
		}
	}




	//===============================================================
	generateMask(bFirstTime){
		if (bVerbose && bFirstTime){ print("generateMask"); }
		this.generateMaskAmorphous(bFirstTime);
		
		// Calculate the bounding box, used by the diagram boundary
		this.theBoundingBox = { 
			L:Number.POSITIVE_INFINITY, T:Number.POSITIVE_INFINITY, 
			R:Number.NEGATIVE_INFINITY, B:Number.NEGATIVE_INFINITY };
		let np = Math.min(this.myParticles.length, this.nMaskPoints); 	
		for (let i = 0; i < np; i++) {
			let p = this.myParticles[i].p;
			if (p.x < this.theBoundingBox.L){this.theBoundingBox.L = p.x;}
			if (p.y < this.theBoundingBox.T){this.theBoundingBox.T = p.y;}
			if (p.x > this.theBoundingBox.R){this.theBoundingBox.R = p.x;}
			if (p.y > this.theBoundingBox.B){this.theBoundingBox.B = p.y;}
		}
		let offsetMargin = 0; 
		if (this.theStyleSheet.bDoOffsetRings){
			offsetMargin += this.theStyleSheet.firstOffsetRingSpacing + 
				(this.theStyleSheet.nOffsetRings * this.theStyleSheet.offsetRingSpacing);
				this.theBoundingBox.L -= offsetMargin;
				this.theBoundingBox.T -= offsetMargin;
				this.theBoundingBox.R += offsetMargin;
				this.theBoundingBox.B += offsetMargin;
		}
		if (this.theStyleSheet.doMembraneHairs){
			offsetMargin += this.REST_L * this.theStyleSheet.membraneHairLengthFactor;
			this.theBoundingBox.L -= offsetMargin;
			this.theBoundingBox.T -= offsetMargin;
			this.theBoundingBox.R += offsetMargin;
			this.theBoundingBox.B += offsetMargin;
		}
	}


	hideStructureAndItsSubstructures(whichId){
		
		let bFetchSimplifiedContours = true; 
		let outerStructureContours = this.myStructures[whichId].getContours(bFetchSimplifiedContours);
		let outerStructureContourVerts = outerStructureContours[0].verts;
		
		for (let j=1; j<this.myStructures.length; j++){
			if (whichId != j){
				let enclosingId = this.myStructures[j].getEnclosingStructureId(); 
				if (enclosingId == whichId){
					this.myStructures[j].hasSubstituteSubcell = true; // hide that structure too
					this.myStructures[j].bDisplayVoronoiCells = false;
				} 

				// Some guts don't know they're enclosed; nix them too
				if (this.myStructures[j].hasSubstituteSubcell == false){
					if ((this.myStructures[j].type != STRUCTURE_TYPE_TRUSS) || 
						((this.myStructures[j].type == STRUCTURE_TYPE_TRUSS) &&  
						 (this.myStructures[j].particleIndices.length < 30)))   {

						let jthStructureContours = this.myStructures[j].getContours(bFetchSimplifiedContours);
						if (jthStructureContours){
							let njthStructureContours = jthStructureContours.length; 
							if (njthStructureContours > 0){
								let jthStructureContourVerts = jthStructureContours[0].verts;
								if (jthStructureContourVerts){

									let bJisInside = false; 
									let nPtsInJthStructureContour = jthStructureContourVerts.length; 
									for (let k=0; k<nPtsInJthStructureContour; k++){
										let kx = jthStructureContourVerts[k].x;
										let ky = jthStructureContourVerts[k].y;
										if (pointInsideVerts (kx,ky,outerStructureContourVerts, outerStructureContourVerts.length)){
											bJisInside = true;
										}
									}
									if (bJisInside){
										this.myStructures[j].hasSubstituteSubcell = true;
										this.myStructures[j].bDisplayVoronoiCells = false;
									}
								}
							}

							
						}
					}
				}
			}
		}
		this.myStructures[whichId].hasSubstituteSubcell = true; // hide that structure
		this.myStructures[whichId].bDisplayVoronoiCells = false;
	}


	adjustRestLength(rawMaskPolyline){

		this.REST_L = (this.nestedLevel == 0) ? 9.0 : 10.0; 

		if (this.nestedLevel > 0){
			let maskArea = Math.abs(polygonArea(rawMaskPolyline.points)); 
			let frac = maskArea / 450000;
			frac = constrain(frac,0.0,1.0); 
			frac = pow(frac, 0.5); 
			frac = constrain(frac,0.5,1.0); 
			
			this.REST_L = map(frac, 0.5,1.0, 5,12.5);
			// print(int(maskArea) + "\t" + nf(frac,1,2)+ "\t" + nf(this.REST_L,1,2));
		}

		this.MAX_SPEED = this.REST_L * 0.3125; 
		this.MAX_SPEED2 = this.MAX_SPEED *this.MAX_SPEED; 
		this.MIN_SPRING_DIST = this.REST_L / 128.0; 
		this.MIN_SPRING_DIST2 = (this.MIN_SPRING_DIST * this.MIN_SPRING_DIST); 
	}


	//===============================================================
	generateMaskAmorphous(bFirstTime){
		
		if (bFirstTime){
			// CALCULATE THE NUMBER OF POINTS IN THE MASK. 
			let predictedPointSeparation = this.estimateAverageSeparation();  //0.024091820117105093 
			const maskPointDensityFactor = 2.236;
			predictedPointSeparation /= maskPointDensityFactor; 
			let perimeterApprox = TWO_PI * maskR;
			let increaseDensity = Math.pow(constrain(map(this.nInteriorPoints, 200,1000, 2.0, 1.0), 1.0,2.0), 0.3333); 
			let desiredNMaskPoints = increaseDensity * perimeterApprox / predictedPointSeparation;
			let newNMaskPoints = Math.floor(Math.round(desiredNMaskPoints)); 
			
			newNMaskPoints -= (newNMaskPoints%12); 
			this.nMaskPoints = newNMaskPoints;
		}

		// ACTUALLY GENERATE THE MASK. 
		const nContourNoiseOctaves = 3; 
		let amorphousContourNoiseFalloff = this.theStyleSheet.amorphousContourNoiseFalloff;
		noiseDetail(nContourNoiseOctaves, amorphousContourNoiseFalloff);

		let rawMaskPolyline = new ofPolyline();
		if ((this.nestedLevel > 0) && this.providedMaskPolyline){
			rawMaskPolyline = this.providedMaskPolyline;

		} else {
			let sqrcPow = this.theStyleSheet.finalSquircularity;
			let po = map(this.fadeInPhysics, 0,1, 1.0,sqrcPow);
			let ro = 0.4;
			let xpow = po;//0.125;
			let ypow = po; //0.125;
			
			for (let i=0; i<this.nMaskPoints; i++){
				let t = (i/this.nMaskPoints)*TWO_PI;
				let rx = ro * ASPECT_1824; 
				let ry = ro; 

				let cost = Math.cos(t);
				let sint = Math.sin(t);
				let absCost = Math.abs(cost);
				let absSint = Math.abs(sint);
				let sgnCost = Math.sign(cost);
				let sgnSint = Math.sign(sint);
				let powCost = Math.pow(absCost, xpow); 
				let powSint = Math.pow(absSint, ypow); 
				let px = (rx * sgnCost*powCost); 
				let py = (ry * sgnSint*powSint);

				px = BASE_DIM/2 + (BASE_DIM * px); 
				py = BASE_DIM/2 + (BASE_DIM * py); 
				rawMaskPolyline.add(px, py);
			}
			rawMaskPolyline.close(); 
		}

		// let rawMaskPolylineArea = Math.abs(polygonArea(rawMaskPolyline.points)); 
		this.adjustRestLength(rawMaskPolyline); 

		if (this.nestedLevel > 0){
			//print("rawMaskPolyline LEN: " + rawMaskPolyline.points.length); 
			//print("this.nMaskPoints = " + this.nMaskPoints); 
		}

		// Resample the polyline 
		let resampledMaskPolyline = rawMaskPolyline.getResampledByCount(this.nMaskPoints);

		if (this.nestedLevel > 0){
			//print("resampledMaskPolyline LEN: " + resampledMaskPolyline.points.length); 
		}


		for (let i=0; i<resampledMaskPolyline.points.length; i++){ 
			let px = resampledMaskPolyline.points[i].x;
			let py = resampledMaskPolyline.points[i].y;
			// Get rid of pure straightaways, which are causing 1/0 errors
			let t = map(i,0,resampledMaskPolyline.points.length, 0, TWO_PI);
			px += 0.1 * cos(40*t); 
			py += 0.1 * sin(40*t); 
			if (bFirstTime){
				let aParticle = new Particle(); 
				aParticle.set(px, py);
				aParticle.setDropoutLikelihood(this.theStyleSheet.blobDropoutPercent, this.theStyleSheet.nucleusDropoutPercent); 
				aParticle.bIsABoundarySite = true; 
				aParticle.bNeverDisplayAsBlob = true;
				aParticle.isFree = false;
				this.myParticles.push(aParticle);
			} else {
				this.myParticles[i].set(px, py);
			}
		}


		rawMaskPolyline = null; 
		resampledMaskPolyline = null; 

		
	}


	//===============================================================
	getMembraneInteriorContour(){
		let aPolyline = [];
		const membraneStructureID = 0; // structure #0 is the membrane, presumably
		if (this.myStructures[membraneStructureID].type == STRUCTURE_TYPE_MEMBRANE){
			const nLoops = this.myStructures[membraneStructureID].particleIndices.length / this.nMaskPoints;
			if (nLoops > 0){
				const indexStart = (nLoops-1)*this.nMaskPoints;
				const indexEnd = indexStart+this.nMaskPoints;
				for (let i=indexStart; i<indexEnd; i++){
					const ii = this.myStructures[0].particleIndices[i];
					aPolyline.push(this.myParticles[ii].p); 
				}
			} else {
				for (let i=0; i<this.nMaskPoints; i++){
					aPolyline.push(this.myParticles[i].p); 
				}
			}
		}
		return aPolyline;
	}


	//---------------------
	determineWhichBlobsToDraw(){
		
		// Determine which free-floating particles are inside closed structures.
		if (this.theStyleSheet.bDrawEncircledSiteBlobs){
			const nStructures = this.myStructures.length;
			if (nStructures > 0){

				let nStructuresThatMayHaveEncircledParticles = 0; 
				for (let j = 0; j < nStructures; j++) {
					if (this.myStructures[j].bLoop){
						if (this.myStructures[j].bDisplayEnclosedBlobs){ 
							nStructuresThatMayHaveEncircledParticles++; 
						}
					}
				}

				if (nStructuresThatMayHaveEncircledParticles > 0){
					let vertsOfStructuresThatDisplayEncircledParticles = [];
					let bboxsOfStructuresThatDisplayEncircledParticles = [];

					for (let j = 0; j < nStructures; j++) {
						if (this.myStructures[j].bLoop){
						
							// TO DO: do this
							if (this.myStructures[j].bDisplayEnclosedBlobs) {
								let verts = []; 
								let skip = 1;
								let startIndex = 0; 
								if (this.myStructures[j].type == STRUCTURE_TYPE_BALL){ startIndex = 1; } // for BALL, omit the center point
								if (this.myStructures[j].type == STRUCTURE_TYPE_WHEEL){ skip = 2; } // for WHEEL, only use even-indexed points
								if (this.myStructures[j].type == STRUCTURE_TYPE_URCHIN){ skip = 2 + this.myStructures[j].PROPERTY_A;} // omit spines etc.

								let bbox = this.myStructures[j].boundingBox;
								let jthParticleIndices = this.myStructures[j].particleIndices;
								for (let i=startIndex; i<jthParticleIndices.length; i+=skip){ 
									verts.push(this.myParticles[ jthParticleIndices[i] ].p); 
								}
								vertsOfStructuresThatDisplayEncircledParticles.push(verts);
								bboxsOfStructuresThatDisplayEncircledParticles.push(bbox);
								verts = null; 
							}
							
						}
					}
					if (vertsOfStructuresThatDisplayEncircledParticles.length > 0){
						let d3Polygons = this.d3Voronoi.cellPolygons();
						let aD3Polygon = d3Polygons.next();
						
						// We don't need to check EVERY particle on every frame!
						// As an optimization, use mod to check every n'th item.
						const testCycle = 16; //16;  
						let siteId = (this.simulationFrameCount % testCycle); 
						for (let i=0; i<siteId; i++){ aD3Polygon = d3Polygons.next(); }

						while (!aD3Polygon.done) { // For each particle, 
							this.myParticles[siteId].bDrawSiteBlob = false;
							let bBlobIsNotPartOfAStructure = (this.myParticles[siteId].isPartOfStructure == -1);
							if (bBlobIsNotPartOfAStructure){
								const px = this.myParticles[siteId].p.x;
								const py = this.myParticles[siteId].p.y;

								for (let v=0; v<vertsOfStructuresThatDisplayEncircledParticles.length; v++){
									const bbox = bboxsOfStructuresThatDisplayEncircledParticles[v];
									if ((px > bbox.L) && (px < bbox.R) && (py > bbox.T) && (py < bbox.B)){
									
										// Check each of the structures' boundaries to see if it is inside
										let verts = vertsOfStructuresThatDisplayEncircledParticles[v];
										let nVerts = verts.length;
										if (pointInsideVerts (px, py, verts, nVerts)){
											// If so, set its visibility as a blob to true
											this.myParticles[siteId].bDrawSiteBlob = true; 
										}
									}
								}
							}
							for (let j=0; j<testCycle; j++){
								aD3Polygon = d3Polygons.next(); siteId++; 
							}
						}
					}
					vertsOfStructuresThatDisplayEncircledParticles = null;
					bboxsOfStructuresThatDisplayEncircledParticles = null;
				}
			}
		}
	}



	//===============================================================
	getOffsetCurveContours( theOffsetCurveStructure ){
		let out = []; // an array of StyledPolylines
		myRandomReset(this.THE_CURRENT_HASH);
		out = this.getOffsetCurveContoursSimple( theOffsetCurveStructure );
		return out;
	}

	//===============================================================
	getOffsetCurveContoursSimple( theOffsetCurveStructure ){
		let out = []; // an array of StyledPolylines

		const nRings = theOffsetCurveStructure.PROPERTY_A;
		const ringSpacing = theOffsetCurveStructure.PROPERTY_B; 
		const firstRingSpacing = theOffsetCurveStructure.PROPERTY_C;
		const bGappyOffsetCurves = theOffsetCurveStructure.STYLE_ID;
		const ringFadePow = 1.7;
		const maskUnit = this.REST_L * 0.8; // estimate
		const nMaskPointsm1 = this.nMaskPoints -1;

		for (let r=0; r<nRings; r++){
			const ra = Math.pow(map(r, 0, nRings, 1,0), ringFadePow); 
			const strokeWeight = ra * WEIGHT_1;
			const tickDistance = ((firstRingSpacing + r) * ringSpacing)/maskUnit; 
		
			if ((r >= (nRings/2-1)) && bGappyOffsetCurves){
				let bOn = true; 
				let aPolyline = [];

				let pxa = this.myParticles[0].p.x;
				let pya = this.myParticles[0].p.y;
				for (let i = 1; i < this.nMaskPoints; i++) {
					let pxb = this.myParticles[i].p.x;
					let pyb = this.myParticles[i].p.y;
					let dxba = pxb - pxa; 
					let dyba = pyb - pya; 
					let txb = pxb + tickDistance * dyba; 
					let tyb = pyb - tickDistance * dxba; 

					let bMeetsNoiseCondition = (noise(txb,tyb) < ra);
					if (bMeetsNoiseCondition){ 
						if (!bOn){
							aPolyline = [];
							let txa = pxa + tickDistance * dyba; 
							let tya = pya - tickDistance * dxba; 
							aPolyline.push(createVector(txa, tya)); 
						} 
						aPolyline.push(createVector(txb, tyb)); 
						bOn = true; 
					} 
					if (!bMeetsNoiseCondition || (i == nMaskPointsm1)){
						if (bOn){
							aPolyline.push(createVector(txb, tyb)); 
							let aStyledPolyline = new StyledPolyline(aPolyline, false, true, false, false, STROKE_BLACK, FILL_NONE, strokeWeight, 0,0, true);
							out.push(aStyledPolyline); 
							aStyledPolyline = null;
							aPolyline = null;
						}
						bOn = false;
					}
					pxa = pxb;
					pya = pyb;
				}

			} else {
				let aPolyline = [];
				let pxa = this.myParticles[0].p.x;
				let pya = this.myParticles[0].p.y;
				for (let i=1; i<(this.nMaskPoints); i++){
					let ii = (i%this.nMaskPoints);
					let pxb = this.myParticles[ii].p.x;
					let pyb = this.myParticles[ii].p.y;
					let dxba = pxb - pxa; 
					let dyba = pyb - pya; 
					let txb = pxb + tickDistance * dyba; 
					let tyb = pyb - tickDistance * dxba; 
					aPolyline.push(createVector(txb, tyb)); 
					pxa = pxb;
					pya = pyb;
				}
				let aStyledPolyline = new StyledPolyline(aPolyline, true, true, false, false, STROKE_BLACK, FILL_NONE, strokeWeight, 0,0, true);
				out.push(aStyledPolyline); 
				aStyledPolyline = null;
				aPolyline = null;
			}
		}
		return out;
	}

	//===============================================================
	renderStructures(GFX_P5, GFX_P5_CTX){
		const nStructures = this.myStructures.length;
		for (let i = 0; i < nStructures; i++) {
			this.myStructures[i].renderStructure(GFX_P5, GFX_P5_CTX, this);  
		}
	}


	//===============================================================
	renderEncircledSiteBlobs(GFX_P5, GFX_P5_CTX){
		this.nRenderedSiteBlobs = 0; 
		if (this.theStyleSheet.bDrawEncircledSiteBlobs){
			let d3Polygons = this.d3Voronoi.cellPolygons();
			let aD3Polygon = d3Polygons.next();
			let siteId = 0;

			const scol = (this.theStyleSheet.siteBlobStrokeColor == 255) ? designBgCol : CYTO_BLACK; 
			const fcol = (this.theStyleSheet.siteBlobFillColor == 255) ? designBgCol : CYTO_BLACK; 
		
			GFX_P5.noFill(); 
			GFX_P5.noStroke(); 
			const bDoFillSiteBlobs = this.theStyleSheet.bDoFillSiteBlobs;
			GFX_P5.strokeWeight(WEIGHT_1);
			GFX_P5.stroke(scol);
			if (bDoFillSiteBlobs){ 
				GFX_P5.fill(fcol); 
			}
			
			while (!aD3Polygon.done) {
				// Note that not ALL blobs are drawn; 
				// Only those with the bDrawSiteBlob flag set. 
				// This flag is set in determineWhichBlobsToDraw()
				if (this.myParticles[siteId].bDrawSiteBlob){ 
					if (!this.myParticles[siteId].bNeverDisplayAsBlob){
						if (this.myParticles[siteId].isPartOfStructure == -1){ // bBlobIsNotPartOfAStructure
							const cellVertices = aD3Polygon.value;
							const nCellVertices = cellVertices.length-1; // D3 includes duplicate point.
							const cx = this.myParticles[siteId].c.x;
							const cy = this.myParticles[siteId].c.y;
							const bValid = this.drawSiteBlob(GFX_P5_CTX, false, cellVertices, nCellVertices, cx, cy);
				
							if (bDoFillSiteBlobs && bValid){ 
								GFX_P5_CTX.fill(); 
							}
							this.nRenderedSiteBlobs++;
						}
					}
				}
				aD3Polygon = d3Polygons.next();
				siteId++; 
			}
		}
		
		GFX_P5.noFill(); 

		// Turn off theStyleSheet.bDrawEncircledSiteBlobs if there are no blobs drawn after 1000 frames
		if ((this.nRenderedSiteBlobs == 0) && (this.simulationFrameCount > 1000)){
			if (this.theStyleSheet.bDrawEncircledSiteBlobs){
				this.theStyleSheet.bDrawEncircledSiteBlobs = false;
			}
		}
	}


	//===============================================================
	renderSelectVoronoiCells(GFX_P5){
		if (this.theStyleSheet.bDrawVoronoiDiagram){
	
			const nStructures = this.myStructures.length;
			let nStructuresDisplayingVoronoiCells = 0; 
			for (let i=0; i<nStructures; i++){
				if (this.myStructures[i].bDisplayVoronoiCells){
					nStructuresDisplayingVoronoiCells++;
				}
			}
	
			if (nStructuresDisplayingVoronoiCells > 0){
				let d3Polygons = this.d3Voronoi.cellPolygons();
				let aD3Polygon = d3Polygons.next();
				let siteIndex = 0; 
		
				GFX_P5.strokeWeight(WEIGHT_0); 
				const nVoronoiSubdivs = this.theStyleSheet.nVoronoiSubdivs; 
				
				while (!aD3Polygon.done) {
				
					// Cells of the interior sites
					let thisParticle = this.myParticles[siteIndex];
					let idOfStructureParticleIsInside = thisParticle.isInsideStructure; 
					if (idOfStructureParticleIsInside > 0) {
						if (this.myStructures[idOfStructureParticleIsInside].bDisplayVoronoiCells){
							const cellVertices = aD3Polygon.value;
							const nCellVertices = cellVertices.length-1; // D3 includes duplicate point.

							if (nVoronoiSubdivs > 1){
								let vverts = [];
								for (let j=0; j<nCellVertices; j++){
									for (let k=0; k<nVoronoiSubdivs; k++){
										let jx = cellVertices[j][0];
										let jy = cellVertices[j][1];
										vverts.push( createVector(jx, jy));
									}
								}
								const nj = vverts.length;
								for (let j=0; j<nj; j++){
									const a = (j-1+nj)%nj; const c = (j+1)%nj;
									vverts[j].x = (vverts[a].x + vverts[j].x + vverts[c].x)/3;
									vverts[j].y = (vverts[a].y + vverts[j].y + vverts[c].y)/3;}
								for (let j=nj-1; j>=0; j--){
									const a = (j-1+nj)%nj; const c = (j+1)%nj;
									vverts[j].x = (vverts[a].x + vverts[j].x + vverts[c].x)/3;
									vverts[j].y = (vverts[a].y + vverts[j].y + vverts[c].y)/3;}
								GFX_P5.noFill(); 
								GFX_P5.stroke(CYTO_BLACK); 
								GFX_P5.beginShape(); 
								for (let j=0; j<vverts.length; j++){
									GFX_P5.vertex(vverts[j].x, vverts[j].y); 
								}
								GFX_P5.endShape(CLOSE);
								vverts = null; 

							} else {
								GFX_P5.noFill(); 
								GFX_P5.stroke(CYTO_BLACK); 
								GFX_P5.beginShape(); 
								for (let j=0; j<nCellVertices; j++){
									let jx = cellVertices[j][0];
									let jy = cellVertices[j][1];
									GFX_P5.vertex(jx, jy); 
								}
								GFX_P5.endShape(CLOSE);
							} 

							if (this.myStructures[idOfStructureParticleIsInside].bDisplayVoronoiNuclei){
								if (!thisParticle.bNeverDisplayAsVoronoiNucleus){
									const P = thisParticle.p;
									GFX_P5.fill(CYTO_BLACK);
									GFX_P5.noStroke(); 
									GFX_P5.circle(P.x, P.y, WEIGHT_3);
								}
							}
						}
					}
					
	
					// (Clipped) cells of the interior BOUNDARY sites, if desired
					if (this.theStyleSheet.bDrawClippedVoronoiCellsOnInteriorStructureBoundaries){
						const idOfStructureParticleIsPartOf = this.myParticles[siteIndex].isPartOfStructure;
						if (idOfStructureParticleIsPartOf > 0) {
							const structureParticleIsPartOf = this.myStructures[idOfStructureParticleIsPartOf];
							if ((structureParticleIsPartOf.bDisplayVoronoiCells) &&
								(structureParticleIsPartOf.bDisplayVoronoiEdges)){ 
				
								if (structureParticleIsPartOf.type == STRUCTURE_TYPE_WHEEL){ // only wheels for now
									const structureParticleIndices = structureParticleIsPartOf.particleIndices;
									const nP = structureParticleIndices.length;
								
									// identify the index, in the myStructures[idOfStructureParticleIsPartOf].particleIndices array, 
									// of the element whose value is siteIndex
									let indexInStructureArray = -1; 
									for (let i=0; i<nP; i++){
										if (structureParticleIndices[i] == siteIndex){
											indexInStructureArray = i;
										}
									}
				
									if (indexInStructureArray >= 0){
										if (indexInStructureArray%2 == 0){ // for WHEEL; even ones only
											GFX_P5.stroke(CYTO_BLACK); 
			
											const ih = (indexInStructureArray - 2 + nP)%nP; 
											const ii = (indexInStructureArray         ); 
											const ij = (indexInStructureArray + 2     )%nP; 
											const iih = structureParticleIndices[ih]; 
											const iii = structureParticleIndices[ii]; 
											const iij = structureParticleIndices[ij]; 
								
											const phx = this.myParticles[iih].p.x; 
											const phy = this.myParticles[iih].p.y; 
											const pix = this.myParticles[iii].p.x; 
											const piy = this.myParticles[iii].p.y; 
											const pjx = this.myParticles[iij].p.x; 
											const pjy = this.myParticles[iij].p.y; 
					
											const cellVertices = aD3Polygon.value;
											const nCellVertices = cellVertices.length-1; // D3 includes duplicate point.
											const muaLimit = 3; 
							
											for (let j=0; j<nCellVertices; j++){
												const ax = cellVertices[j  ][0];
												const ay = cellVertices[j  ][1];
												const bx = cellVertices[j+1][0];
												const by = cellVertices[j+1][1];

												if (this.myStructures[idOfStructureParticleIsPartOf].pointInside(ax,ay)){
													const crossHIA = ((ax - pix) * (phy - piy)) - ((ay - piy) * (phx - pix));
													if (crossHIA > 0){
														const crossIJB = ((bx - pjx) * (piy - pjy)) - ((by - pjy) * (pix - pjx));
														if (crossIJB > 0){
															GFX_P5.line(ax,ay, bx,by); // crosses a different boundary than expected, here's the problem!
														} else {
															// line AB crosses boundary. compute intersectio Q and only keep AQ
															const denom = (pjy-phy) * (bx-ax) - (pjx-phx) * (by-ay);
															if (Math.abs(denom) > 0){
																const numera = (pjx-phx) * (ay-phy) - (pjy-phy) * (ax-phx);
																const numerb = (bx-ax)   * (ay-phy) - (by-ay)   * (ax-phx);
																const mua = numera / denom;
																const mub = numerb / denom;
																if ((Math.abs(mua) < muaLimit) && (Math.abs(mub) < muaLimit)){
																	const qx = ax + mua * (bx-ax);
																	const qy = ay + mua * (by-ay);
																	GFX_P5.line(ax,ay, qx,qy); 
																} 
															}
														}
													}
												}
											}
										}
		
									}
								}
							}
						}
					}
		
					aD3Polygon = d3Polygons.next();
					siteIndex++;
				}
			}
		}
	}


	//===============================================================
	drawSiteBlob (gfxTarget, bTargetIsP5, cellVertices, nCellVertices, cx, cy){ 

		// don't draw infinitesimal blobs
		let dx = cellVertices[1][0] - cellVertices[0][0];
		let dy = cellVertices[1][1] - cellVertices[0][1];
		if (isNaN(dx) || isNaN(dy)){
			return false;
		}

		const blobScale = this.theStyleSheet.siteBlobScale; 
		const blobTightness = this.theStyleSheet.siteBlobTightness; 
		let verts = []; 
		for (let j=0; j<nCellVertices; j++){
			const k = (j+1);
			const lx = cx + blobScale*(((cellVertices[j][0]+cellVertices[k][0])/2) - cx);
			const ly = cy + blobScale*(((cellVertices[j][1]+cellVertices[k][1])/2) - cy);
			verts[j] = [lx, ly];
		}
		let p1 = getVertexPointArr(verts, 0, 0, blobTightness);
		if (isNaN(p1[0]) || isNaN(p1[1])){
			return false;
		}

		if (bTargetIsP5){ // A p5.js canvas
			gfxTarget.beginShape();
			gfxTarget.vertex(p1[0], p1[1]);
			for (let i = 0; i < nCellVertices; i++) {
				const p2 = getVertexPointArr(verts, i,      1, blobTightness);
				const p3 = getVertexPointArr(verts, i + 1, -1, blobTightness);
				const p4 = getVertexPointArr(verts, i + 1,  0, blobTightness);
				gfxTarget.bezierVertex(p2[0], p2[1], p3[0], p3[1], p4[0], p4[1]);
			}
			gfxTarget.endShape(CLOSE);

		} else { // an HTML Canvas context
			gfxTarget.beginPath();
			gfxTarget.moveTo(p1[0], p1[1]);
			for (let i = 0; i < nCellVertices; i++) {
				const p2 = getVertexPointArr(verts, i,      1, blobTightness);
				const p3 = getVertexPointArr(verts, i + 1, -1, blobTightness);
				const p4 = getVertexPointArr(verts, i + 1,  0, blobTightness);
				gfxTarget.bezierCurveTo(p2[0], p2[1], p3[0], p3[1], p4[0], p4[1]);
			}
			gfxTarget.closePath();
			gfxTarget.stroke();
		}
		verts = null;
		return true;
	}


	


	//==========================================================
	copyParticlesToD3Data(whichPass){
		if (whichPass == 1){
			for (let i = 0; i < this.myParticles.length; i++) {
				const i2 = i*2;
				this.d3Data[i2    ] = this.myParticles[i].pE.x;
				this.d3Data[i2 + 1] = this.myParticles[i].pE.y;
			}
		} else if (whichPass == 2){
			for (let i = 0; i < this.myParticles.length; i++) {
				const i2 = i*2;
				this.d3Data[i2    ] = this.myParticles[i].p0.x;
				this.d3Data[i2 + 1] = this.myParticles[i].p0.y;
			}
		}
	}


	//==========================================================
	updateParticles(){
		// Update the status of each particle once every testCycleLength
		const testCycleLength = 16;  
		const testCycle = (this.simulationFrameCount % testCycleLength);
		const nStructures = this.myStructures.length;
		
		const dampingDiminishment = (1.0/8192.0);
		const minDamping = 0.9375;

		for (let i = this.nMaskPoints; i < this.myParticles.length; i++) {
			if (i%testCycle == 0){

				if (this.myParticles[i].damping > minDamping){
					this.myParticles[i].damping -= dampingDiminishment;
				}

				this.myParticles[i].isFree = true;
				this.myParticles[i].isInsideStructure = -1; 
				if (this.myParticles[i].isPartOfStructure == -1){ 

					// test particles to see if they're inside of structures with enclosures.
					const px = this.myParticles[i].p.x;
					const py = this.myParticles[i].p.y;

					for (let j = 0; j < nStructures; j++) {
						if (this.myStructures[j].hasEnclosure){

							let skip = 1;
							let startIndex = 0; 
							let boustrophedon = false; 
							const strucType = this.myStructures[j].type;
							switch(strucType){
								case STRUCTURE_TYPE_WHEEL:
									skip = 2; break;
								case STRUCTURE_TYPE_URCHIN:
									startIndex = 1; skip = 2 + this.myStructures[j].PROPERTY_A; break;
								case STRUCTURE_TYPE_BALL:
								case STRUCTURE_TYPE_TRUSS:
									boustrophedon = true; skip = 2; break;
								case STRUCTURE_TYPE_CENTI:
									boustrophedon = true; skip = 4; break;
							}

							let verts = []; 
							const jthParticleIndices = this.myStructures[j].particleIndices;
							const len = jthParticleIndices.length; 
							if (!boustrophedon){
								for (let k=startIndex; k<len; k+=skip){ 
									const kk = jthParticleIndices[k]; 
									verts.push(this.myParticles[kk].p); 
								}
							} else {
								for (let k=startIndex; k<len; k+=skip){ 
									const kk = jthParticleIndices[k]; 
									verts.push(this.myParticles[kk].p); 
								}
								for (let k=len-1; k>0; k-=skip){ 
									const kk = jthParticleIndices[k]; 
									verts.push(this.myParticles[kk].p); 
								}
							}
							if (pointInsideVerts (px, py, verts, verts.length)){
								this.myParticles[i].isFree = false;
								this.myParticles[i].isInsideStructure = j;
							} 
							verts = null;
						} 
					}
				} else {
					this.myParticles[i].isFree = false;
				}
			}
		}
	}


	//==========================================================
	drawParticles(GFX_P5, GFX_P5_CTX){
		if (this.theStyleSheet.bDrawParticles){

			GFX_P5.noStroke();
			GFX_P5.fill(CYTO_BLACK); 
			const R = this.theStyleSheet.particleDiameter / 2.0;

			switch (this.theStyleSheet.particleDrawMode){
				case PARTICLE_SIZE_CONSTANT: 
					for (let i = this.nMaskPoints; i < this.myParticles.length; i++) {
						if (this.myParticles[i].isFree ){ 
							const P = this.myParticles[i].p;
							GFX_P5_CTX.beginPath();
							GFX_P5_CTX.ellipse(P.x, P.y, R,R, 0, 0, TWO_PI);
							GFX_P5_CTX.fill();
						}
					}
					break;

				case PARTICLE_SIZE_SPEEDBASED: 
					this.theStyleSheet.bDrawParticles = true; 
					for (let i = this.nMaskPoints; i < this.myParticles.length; i++) {
						if (this.myParticles[i].isFree ){ 
							const r = 0.5*(this.myParticles[i].v.mag());
							if (r > 0.25){
								const P = this.myParticles[i].p;
								GFX_P5_CTX.beginPath();
								GFX_P5_CTX.ellipse(P.x, P.y, r, r, 0, 0, TWO_PI);
								GFX_P5_CTX.fill();
							}
						}
					}
					break;

				case PARTICLE_SIZE_VARIEGATED:
					const maxi = min(19999, this.myParticles.length);
					const smallPercent = 0.65;
					const Rbig = R * 1.414;
					for (let i = this.nMaskPoints; i < maxi; i++) {
						if (this.myParticles[i].isFree ){ 
							const P = this.myParticles[i].p;
							const r = (this.rand20K[i] < smallPercent)? R : Rbig;
							GFX_P5_CTX.beginPath();
							GFX_P5_CTX.ellipse(P.x, P.y, r, r, 0, 0, TWO_PI);
							GFX_P5_CTX.fill();
						}
					}
					break;
			}
		}
	}

	//===============================================================
	estimateAverageSeparation(){
		// Estimate the separation given nInteriorPoints; empirically accurate to ~2% 
		let areaApprox = PI * maskR * maskR;
		let areaPerPoint = areaApprox / this.nInteriorPoints;
		let sqrt3 = Math.sqrt(3.0);
		let predictedPointSeparation = sqrt3 * Math.sqrt(areaPerPoint/(3.0 * sqrt3 /2.0)); 
		return predictedPointSeparation;  
	}


//==========================================================
/*

  /$$$$$$  /$$    /$$  /$$$$$$        /$$$$$$$$ /$$   /$$ /$$$$$$$   /$$$$$$  /$$$$$$$  /$$$$$$$$
 /$$__  $$| $$   | $$ /$$__  $$      | $$_____/| $$  / $$| $$__  $$ /$$__  $$| $$__  $$|__  $$__/
| $$  \__/| $$   | $$| $$  \__/      | $$      |  $$/ $$/| $$  \ $$| $$  \ $$| $$  \ $$   | $$   
|  $$$$$$ |  $$ / $$/| $$ /$$$$      | $$$$$    \  $$$$/ | $$$$$$$/| $$  | $$| $$$$$$$/   | $$   
 \____  $$ \  $$ $$/ | $$|_  $$      | $$__/     >$$  $$ | $$____/ | $$  | $$| $$__  $$   | $$   
 /$$  \ $$  \  $$$/  | $$  \ $$      | $$       /$$/\  $$| $$      | $$  | $$| $$  \ $$   | $$   
|  $$$$$$/   \  $/   |  $$$$$$/      | $$$$$$$$| $$  \ $$| $$      |  $$$$$$/| $$  | $$   | $$   
 \______/     \_/     \______/       |________/|__/  |__/|__/       \______/ |__/  |__/   |__/   

*/ 		  
//----------------------------------------------------------------
/*
TODO for LONDO JUNE 9: 
-- Make circle-dots on wheels smaller
-- make cell loops in voronois smaller
-- implement alternate-skipping parallel line recomposition
-- make eyes on trusses smaller


*/

	//--------------------------------------------------
	createSVG_head(){
		let penWeight = PEN_WEIGHT_MM; //0.38 mm
		let aDocumentStr = this.getSVGDocumentHeader();
		aDocumentStr += '<g id="main_ink_layer" ';
		aDocumentStr += 'fill="none" stroke="black" stroke-linecap="round" stroke-width="' + penWeight + '"> \n';
		return aDocumentStr;
	}


	createSVG_membranes(tx, ty, ts){ // For rendering thick lines. 
		let svgScale = SVG_HEIGHT_MM / BASE_DIM; // converts pixels to mm.
		let fatPenWeight = (PEN_WEIGHT_MM * 2); // fat pen

		let TX = tx; 
		let TY = ty; 
		let TS = ts; 
		const nRepeats = 1; 
		let aDocumentStr = '';
		for (let i = 0; i < this.myStructures.length; i++) {
			let ithStructure = this.myStructures[i];  
			myRandomReset(this.THE_CURRENT_HASH); 
			let ithStructureType = ithStructure.type;
			if (ithStructureType == STRUCTURE_TYPE_MEMBRANE){
				let ithStructureContours = ithStructure.getContours();
				aDocumentStr += '  <g id="structure_MEMBRANE_' + i + '"> \n';

				let aPolylineSVGStr = "";
				for (let j=0; j<ithStructureContours.length; j++){
					let aStyledPolyline = ithStructureContours[j]; 
					let contourWeight = aStyledPolyline.thickness;
					if (this.nestedLevel > 0){
						if (contourWeight >= WEIGHT_3){
							contourWeight *= 1.414; }
					} else if (this.nestedLevel == 0){
						if (contourWeight == WEIGHT_2){
							contourWeight /= 1.414; }
					}
		
					let vertsRaw = aStyledPolyline.verts;
					if (aStyledPolyline.bClosed){
						let verts = [];
						for (let l=0; l<vertsRaw.length; l++){
							let vx = ((vertsRaw[l].x) * TS) + TX;
							let vy = ((vertsRaw[l].y) * TS) + TY; 
							verts[l] = createVector(vx, vy); 
						}

						if (aStyledPolyline.strokeStyle != STROKE_NONE){
							let npFat = contourWeight/fatPenWeight * TS;

							if (npFat < 0.9){
								// Don't add very thin (single-stroke) lines. 
								// have the thin pen do it. 
								/*
								let fatPenWeight = (PEN_WEIGHT_MM * 2);
								let npFat = contourWeight/fatPenWeight * TS;
								if ((contourWeight/fatPenWeight * TS) < 0.9){

								}
								*/

							} else if (npFat <= 1.15){
								let wei = (contourWeight*TS - fatPenWeight) / svgScale; 
								aPolylineSVGStr += this.getClosedPolycurveWithNoiseSVG(verts, svgScale, j, 0.5, wei);

							} else if (npFat <= 2){
								let wei = (contourWeight*TS - fatPenWeight) / svgScale; 
								aPolylineSVGStr += this.getClosedPolycurveWithNoiseSVG(verts, svgScale, j, 0, wei);
								aPolylineSVGStr += this.getClosedPolycurveWithNoiseSVG(verts, svgScale, j, 1, wei);

							} else {
								let nPasses = int(ceil(1 + npFat * 1.2));
								if (this.nestedLevel == 0){ nPasses++; }
								let N = nPasses;

								for (let l=0; l<nPasses; l++){
									// let t01 = map(l,0,nPasses-1, 0,1);
									let t01 = (((l*2)%N) + (1-(N%2))*int(l/(N/2))) / (N-1);
									let wei = (contourWeight*TS - fatPenWeight) / svgScale; 
									aPolylineSVGStr += this.getClosedPolycurveWithNoiseSVG(verts, svgScale, j, t01, wei);
								}
							}
						}
					}
				}
				for (let k=0; k<nRepeats; k++){
					aDocumentStr += '  <g id="repeat_' + k + '"> \n';
					aDocumentStr += aPolylineSVGStr;
					aDocumentStr += "  </g>\n";
				}

				aDocumentStr += "  </g>\n";
			}
		}
		return aDocumentStr;
	}






	createSVG_body(tx, ty, ts, bOmitHeavyMembranes){
		let svgScale = SVG_HEIGHT_MM / BASE_DIM; // converts pixels to mm.
		let structureTypeArray = ["LINE", "LOOP", "DASH", "TRUSS", "WHEEL", "STAR", "TREE", "URCHIN", "CENTI", "BALL", "MEMBRANE", "OFFSETS"];
		let penWeight = PEN_WEIGHT_MM;
		
		let TX = tx; 
		let TY = ty; 
		let TS = ts; 

		const nRepeats = 2; 
		let aDocumentStr = '';
		for (let i = 0; i < this.myStructures.length; i++) {
			let ithStructure = this.myStructures[i];  

			myRandomReset(this.THE_CURRENT_HASH); 
			let ithStructureContours = ithStructure.getContours();
			let ithStructureType = ithStructure.type;

			aDocumentStr += '  <g id="structure_'; 
			aDocumentStr += structureTypeArray[ithStructure.type]; 
			aDocumentStr += '_' + i + '"> \n';

			for (let j=0; j<ithStructureContours.length; j++){
				let aStyledPolyline = ithStructureContours[j]; 
				let contourWeight = aStyledPolyline.thickness;
				if (ithStructureType == STRUCTURE_TYPE_OFFSETS){ contourWeight = WEIGHT_0; } // Regardless

				// special exceptions
				if (this.nestedLevel > 0){
					if (contourWeight >= WEIGHT_3){
						contourWeight *= 1.414; }
				} else if (this.nestedLevel == 0){
					if (contourWeight == WEIGHT_2){
						contourWeight /= 1.414; }
				}
				
				let aPolylineSVGStr = "";
				let bOnlyAddOnce = false;
				let vertsRaw = aStyledPolyline.verts;
				let bClosed = aStyledPolyline.bClosed;
				let bSmooth = aStyledPolyline.bSmooth;
				let bIsDot = aStyledPolyline.bIsDot;
				let maxDashGap = aStyledPolyline.dashGap;
				let maxDashLen = aStyledPolyline.dashLen;

				// Offset and scale
				let verts = [];
				for (let l=0; l<vertsRaw.length; l++){
					let vx = ((vertsRaw[l].x) * TS) + TX;
					let vy = ((vertsRaw[l].y) * TS) + TY; 
					verts[l] = createVector(vx, vy); 
				}


				if (bIsDot){
					aPolylineSVGStr = this.getCircleSVG(verts, svgScale, contourWeight/4.0 * TS);
					bOnlyAddOnce = false;

				} else if (maxDashGap > 0){ 
					if ((ithStructureType == STRUCTURE_TYPE_MEMBRANE) && (ithStructure.STYLE_ID == 4)) {
						this.theStyleSheet.bOrientationSensitiveDashedContours = true;
						bOnlyAddOnce = true;
					}
					aPolylineSVGStr = this.getDashedPolycurveSVG (verts, svgScale, j, bClosed, maxDashGap,maxDashLen);
					this.theStyleSheet.bOrientationSensitiveDashedContours = false;
				} else {

					if (bClosed){
						if (aStyledPolyline.strokeStyle != STROKE_NONE){

							let fatPenWeight = (PEN_WEIGHT_MM * 2);
							let npFat = contourWeight/fatPenWeight * TS;
						
							let np = contourWeight/penWeight * TS;
							let nPasses = max(1,ceil(np));
							if (nPasses == 1){
								aPolylineSVGStr = this.getClosedPolycurveSVG(verts, svgScale, j);
								bOnlyAddOnce = false;

							} else {
								if (nPasses > 8){ nPasses++;}
								if (nPasses > 4){ nPasses++;}
								nPasses++;
								let N = nPasses;
								for (let l=0; l<nPasses; l++){
									// let t01 = map(l,0,nPasses-1, 0,1);
									let t01 = (((l*2)%N) + (1-(N%2))*int(l/(N/2))) / (N-1);
									let wei = (contourWeight*TS - penWeight) / svgScale; 
									bOnlyAddOnce = false;

									if (bOmitHeavyMembranes){
										if ((npFat >= 0.9) && (ithStructureType == STRUCTURE_TYPE_MEMBRANE)){
											;//Don't include multi-pass lines belonging to membranes!
										} else {
											aPolylineSVGStr += this.getClosedPolycurveWithNoiseSVG(verts, svgScale, j, t01, wei);
										}
									} else {
										aPolylineSVGStr += this.getClosedPolycurveWithNoiseSVG(verts, svgScale, j, t01, wei);
									}
									
									
								}
							}
						}
					} else {
						if (verts.length == 2){
							aPolylineSVGStr = this.getLineSegmentSVG(verts, svgScale);
							bOnlyAddOnce = true; ///!!!!
	
						} else {
							if (bSmooth){
								aPolylineSVGStr = this.getOpenPolycurveSVG(verts, svgScale, j);
								bOnlyAddOnce = false;

							} else {
								aPolylineSVGStr = this.getPolylineSVG(verts, svgScale, j, false);
								bOnlyAddOnce = false;
							}
						}
					}
				}

				if (bOnlyAddOnce){
					aDocumentStr += aPolylineSVGStr;
				} else {
					for (let k=0; k<nRepeats; k++){
						aDocumentStr += '  <g id="repeat_' + k + '"> \n';
						aDocumentStr += aPolylineSVGStr;
						aDocumentStr += "  </g>\n";
					}
				}
			}
			aDocumentStr += "  </g>\n";
		}

		// Hatching is handled separately from structure outlines, and is done with a single line.
		// Hatching, voronoi and blobs are done once, with no Repeats. 
		let hatchContours = this.getContoursForHatchedShapes(TX,TY,TS); 
		if (hatchContours.length > 0){
			aDocumentStr += '  <g id="hatch_lines"> \n';
			for (let i=0; i<hatchContours.length; i++){
				let aStyledPolyline = hatchContours[i]; 
				let vertsRaw = aStyledPolyline.verts;
				let verts = [];
				for (let l=0; l<vertsRaw.length; l++){
					let vx = (vertsRaw[l].x * TS) + TX;
					let vy = (vertsRaw[l].y * TS) + TY;
					verts[l] = createVector(vx, vy); 
				}
				if (verts.length == 2){
					let aPolylineSVGStr = this.getLineSegmentSVG(verts, svgScale);
					aDocumentStr += aPolylineSVGStr;
				}
			}
			aDocumentStr += "  </g>\n\n";
		}

		// Small encircled blobs are handled separately from Structures, and are done with a single line
		let siteBlobSVGStr = this.getEncircledSiteBlobsSVG(svgScale, TX,TY,TS);
		let particleSVGstr = this.getParticlesSVG(svgScale, TX,TY,TS);

		for (let k=0; k<nRepeats; k++){
			aDocumentStr += siteBlobSVGStr;
		}
		for (let k=0; k<nRepeats; k++){
			aDocumentStr += particleSVGstr;
		}

		aDocumentStr += this.getSelectVoronoiCellsSVG(svgScale, TX,TY,TS);
		return aDocumentStr;
	}

	createSVG_tail(){
		let aDocumentStr = "";
		aDocumentStr += "</g>\n\n"; // close main layer
		aDocumentStr += "</svg>";
		return aDocumentStr; 
	}


	//----------------------------------------------------------------
	getSVGDocumentHeader() {
		const theCurrentDateAndTime = new Date();

		let aDocumentStr = "";
		aDocumentStr += '<?xml version="1.0" encoding="UTF-8" standalone="no"?> \n';
		aDocumentStr += '<!-- SVG generated using Cytographia by Golan Levin (CC BY-NC-ND 4.0, 2023) --> \n';
		aDocumentStr += '<!-- ' + theCurrentDateAndTime + ' --> \n';
		aDocumentStr += '\n';
		aDocumentStr += '<!-- NOTE: This SVG has been specifically designed for execution by a computer-controlled plotter, --> \n';
		aDocumentStr += '<!-- such as an EMSL AxiDraw V3. In particular, it has been designed to be plotted on A4-size paper --> \n';
		aDocumentStr += '<!-- using a very thin black pen, such as the the Pilot G2 Ultra Fine Point (0.38 mm) Gel Ink Pen. --> \n';
		aDocumentStr += '<!-- Note that the plotted version may differ in certain respects from the on-screen appearance --> \n';
		aDocumentStr += '<!-- of the Cytographia software which generated it. --> \n';
		aDocumentStr += '\n';
		aDocumentStr += '<svg \n';
		aDocumentStr += '  width="' + SVG_WIDTH_MM + 'mm" \n';
		aDocumentStr += '  height="' + SVG_HEIGHT_MM + 'mm" \n';
		aDocumentStr += '  viewBox="0 0 ' + SVG_WIDTH_MM + " " + SVG_HEIGHT_MM + '" \n';
		aDocumentStr += '  version="1.1" \n';
		aDocumentStr += '\n';
		aDocumentStr += '  xmlns="http://www.w3.org/2000/svg" \n';
		aDocumentStr += '  xmlns:svg="http://www.w3.org/2000/svg" \n';
		aDocumentStr += '  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" \n';
		aDocumentStr += '  xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" \n';
		aDocumentStr += '  xmlns:cc="http://creativecommons.org/ns#" \n';
		aDocumentStr += '  xmlns:dc="http://purl.org/dc/elements/1.1/"> \n';
		aDocumentStr += '\n';
		aDocumentStr += '  <title>Cytographia: ' + this.THE_CURRENT_HASH + ':' + this.simulationFrameCount + ' (SVG)</title> \n'; 
		aDocumentStr += '  <metadata> \n';
		aDocumentStr += '    <rdf:RDF> \n';
		aDocumentStr += '      <cc:Work rdf:about="http://www.flong.com/"> \n';
		aDocumentStr += '        <dc:title>Cytographia: ' + this.THE_CURRENT_HASH + ':' + this.simulationFrameCount + ' (SVG)</dc:title> \n';
		aDocumentStr += '        <dc:date>2023</dc:date> \n';
		aDocumentStr += '        <dc:identifier>' + this.THE_CURRENT_HASH + '</dc:identifier> \n'; // CUSTOMIZE
		aDocumentStr += '        <dc:creator> \n'; 
		aDocumentStr += '          <cc:Agent> \n';
		aDocumentStr += '            <dc:title>Golan Levin (@golan)</dc:title> \n';
		aDocumentStr += '          </cc:Agent> \n';
		aDocumentStr += '        </dc:creator> \n';
		aDocumentStr += '        <dc:publisher> \n';
		aDocumentStr += '          <cc:Agent> \n';
		aDocumentStr += '            <dc:title>https://www.fxhash.xyz/</dc:title> \n'; // CUSTOMIZE
		aDocumentStr += '          </cc:Agent> \n';
		aDocumentStr += '        </dc:publisher> \n';
		aDocumentStr += '        <dc:description>This is a description of the artwork.</dc:description> \n'; // CUSTOMIZE
		aDocumentStr += '\n';
		aDocumentStr += '        <dc:rights> \n';
		aDocumentStr += '          <cc:Agent> \n';
		aDocumentStr += '            <dc:title>Levin, Golan. This SVG design is released under CC BY-NC-ND 4.0.</dc:title> \n';
		aDocumentStr += '          </cc:Agent> \n';
		aDocumentStr += '        </dc:rights> \n';
		aDocumentStr += '        <cc:license rdf:resource="http://creativecommons.org/licenses/by-nc-nd/4.0/" /> \n';
		aDocumentStr += '        <dc:coverage>International</dc:coverage> \n';
		aDocumentStr += '\n';
		aDocumentStr += '        <dc:contributor> \n';
		aDocumentStr += '          <cc:Agent> \n';
		aDocumentStr += '            <dc:title>Developed with p5.js, d3.js, and additional libraries.</dc:title> \n';
		aDocumentStr += '          </cc:Agent> \n';
		aDocumentStr += '        </dc:contributor> \n';
		aDocumentStr += '\n';
		aDocumentStr += '        <dc:subject> \n';
		aDocumentStr += '          <rdf:Bag> \n';
		aDocumentStr += '            <rdf:li>cell</rdf:li> \n';
		aDocumentStr += '            <rdf:li>diagram</rdf:li> \n';
		aDocumentStr += '            <rdf:li>illustration</rdf:li> \n';
		aDocumentStr += '            <rdf:li>incunabula</rdf:li> \n';
		aDocumentStr += '            <rdf:li>cytology</rdf:li> \n';
		aDocumentStr += '            <rdf:li>generative art</rdf:li> \n';
		aDocumentStr += '            <rdf:li>interactive art</rdf:li> \n';
		aDocumentStr += '            <rdf:li>asemic writing</rdf:li> \n';
		aDocumentStr += '            <rdf:li>skeuomorphism</rdf:li> \n';
		aDocumentStr += '            <rdf:li>xenobiology</rdf:li> \n';
		aDocumentStr += '          </rdf:Bag> \n';
		aDocumentStr += '        </dc:subject> \n';
		aDocumentStr += '      </cc:Work> \n';
		aDocumentStr += '\n';
		aDocumentStr += '      <cc:License rdf:about="http://creativecommons.org/licenses/by-nc-nd/4.0/"> \n';
		aDocumentStr += '        <cc:permits rdf:resource="http://creativecommons.org/ns#Reproduction" /> \n';
		aDocumentStr += '        <cc:permits rdf:resource="http://creativecommons.org/ns#Distribution" /> \n';
		aDocumentStr += '        <cc:requires rdf:resource="http://creativecommons.org/ns#Notice" /> \n';
		aDocumentStr += '        <cc:requires rdf:resource="http://creativecommons.org/ns#Attribution" /> \n';
		aDocumentStr += '        <cc:prohibits rdf:resource="http://creativecommons.org/ns#CommercialUse" /> \n';
		aDocumentStr += '      </cc:License> \n';
		aDocumentStr += '    </rdf:RDF> \n';
		aDocumentStr += '  </metadata> \n';
		aDocumentStr += '\n';
		return aDocumentStr;
	}

	//----------------------------------------------
	getDashedPolycurveSVG (verts, svgScale, id, bClosed, maxDashGap,maxDashLen){
		let N = verts.length; 
		let outputStr = ""; 

		let i=0; 
		if (bClosed){
			let NN = N+1;
			let offset = ~~(myRandomAB(0,N/10));

			const myAng = this.theStyleSheet.orientationSensitiveOmitDashAngle; 
			const orientationNotchWidth = this.theStyleSheet.orientationSensitiveDashNotchWidth;
			const myAngX = Math.cos(myAng); 
			const myAngY = Math.sin(myAng); 

			while (i < N){
				let dashLen = 1 + 1 + Math.round(myRandomAB(1,maxDashLen));
				let Nmi = (N-i);
				if (Nmi <= 1){
					break;
				} else if (Nmi == 2){
					dashLen = 1; 
				} else if (Nmi < dashLen){
					dashLen = Nmi -1; 
				}
				let dashCurveVerts = []; 

				if (this.theStyleSheet.bOrientationSensitiveDashedContours) {
					// special case for a MEMBRANE style #4; 
					// randomly omit dashes with a certain orientation
					let aRand = myRandomA(orientationNotchWidth); 
					let bSkipThisDash = false;

					for (let j=0; j<dashLen; j++){
						let ui = (i+offset-1+N)%N;
						let vi = (i+offset)%N;
						if (i < NN){  
							let dx = verts[vi].x - verts[ui].x;
							let dy = verts[vi].y - verts[ui].y;
							let dh = Math.sqrt(dx*dx + dy*dy); 
							let cross = dx/dh * myAngY - dy/dh * myAngX;
							if ((aRand < Math.abs(cross)) && !bSkipThisDash){ 
								dashCurveVerts.push(verts[vi]);
								if ((j==0) || (j==(dashLen-1))){
									dashCurveVerts.push(verts[vi]);
								}
							} else {
								bSkipThisDash = true; 
							}
						} 
						i++; 
					}

				} else {
					// General case
					let vi = (i+offset)%N;
					dashCurveVerts.push(verts[vi]);
					for (let j=0; j<dashLen; j++){
						vi = (i+offset)%N;
						if (i < NN){  
							dashCurveVerts.push(verts[vi]);
						} i++; 
					}
					dashCurveVerts.push(verts[vi]);
				}
				
				if (dashCurveVerts.length > 0){
					let idStr = id + "_" + i;
					outputStr += this.getOpenPolycurveSVG(dashCurveVerts, svgScale, idStr);
				}

				let dashGap = ~~(myRandomAB(1,maxDashGap));
				i += dashGap -1; 
			}
		} else {
			let NN = N-1;
			while (i < N){
				let dashLen = 1 + ~~(myRandomAB(1,maxDashLen));
				let dashCurveVerts = []; 
				let vi = min(i, NN);

				dashCurveVerts.push(verts[vi]);
				for (let j=0; j<dashLen; j++){
					vi = min(i, NN);
					dashCurveVerts.push(verts[vi]);
					i++; 
				}
				dashCurveVerts.push(verts[vi]);
				
				let idStr = id + "_" + i;
				outputStr += this.getOpenPolycurveSVG(dashCurveVerts, svgScale, idStr);
				let dashGap = ~~(myRandomAB(1,maxDashGap));
				i += dashGap -1; 
			}
		}
		return outputStr; 
	}

	//----------------------------------------------------------------
	getLineSegmentSVG(verts, svgScale){
		let x1 = verts[0].x * svgScale;
		let y1 = verts[0].y * svgScale;
		let x2 = verts[1].x * svgScale;
		let y2 = verts[1].y * svgScale;
		let lineStr = '    <line x1="' + nf(x1, 1,3);
		lineStr += '" y1="' + nf(y1, 1,3);
		lineStr += '" x2="' + nf(x2, 1,3);
		lineStr += '" y2="' + nf(y2, 1,3);
		lineStr += '" /> \n';
		return lineStr;
	}

	//----------------------------------------------------------------
	getPolylineSVG(verts, svgScale, polylineId, bClosed) {
		let aPolylineStr = "    <path\n";
		aPolylineStr    += '    id="path' + polylineId + '"\n';
		aPolylineStr    += '    d="';
		for (let j = 0; j < verts.length; j++) {
			if (j == 0) {
				aPolylineStr += "M ";
			} else {
				aPolylineStr += " L ";
			}
			let px = verts[j].x * svgScale;
			let py = verts[j].y * svgScale;
			aPolylineStr += nf(px, 1, 3) + ",";
			aPolylineStr += nf(py, 1, 3);
		}
		if (bClosed) {
			aPolylineStr += " Z"; // close loop if appropriate.
		}
		aPolylineStr += '"/>\n';
		return aPolylineStr;
	}

	//----------------------------------------------------------------
	getParticlesSVG(svgScale, TX,TY,TS){
		let particlesSVG = ''; 
		if (this.theStyleSheet.bDrawParticles){

			// Exclusively exports free particles.
			let nFreeParticles = 0; 
			for (let i = this.nMaskPoints; i < this.myParticles.length; i++) {
				if (this.myParticles[i].isFree ){ 
					nFreeParticles++;
				}
			}
			if (nFreeParticles > 0){
				particlesSVG = '  <g id="free_particles"> \n'; 
				for (let i = this.nMaskPoints; i < this.myParticles.length; i++) {
					if (this.myParticles[i].isFree ){ 
						
						let vx = (this.myParticles[i].p.x * TS) + TX;
						let vy = (this.myParticles[i].p.y * TS) + TY; 
						let vi = createVector(vx,vy); 
						let verts = [vi]; 
						particlesSVG += this.getCircleSVG(verts, svgScale, WEIGHT_0*0.5);
					}
				}
				particlesSVG += '  </g>\n';
			}
		}
		return particlesSVG; 
	}

	//----------------------------------------------------------------
	getCircleSVG(verts, svgScale, radius) {
		let circleSVGStr = ""; 
		for (let i = 0; i < verts.length; i++) {
			let cx = verts[i].x * svgScale;
			let cy = verts[i].y * svgScale;
			let cr = radius * svgScale; 
			circleSVGStr += '    <circle ';
			circleSVGStr += 'cx="' + nf(cx, 1, 3) + '" ';
			circleSVGStr += 'cy="' + nf(cy, 1, 3) + '" ';
			circleSVGStr += 'r="'  + nf(cr, 1, 3) + '"';
			circleSVGStr += '/>\n';
		}
		return circleSVGStr;
	}

	//----------------------------------------------------------------
	getClosedPolycurveSVG(verts, svgScale, polylineId) {
		// Assumes the closed polycurve was drawn onscreen with beziers.

		let aPolylineStr = '';
		const tightness = 1.0 / 3.0;
		let p1 = this.getVertexPointAsPVector(verts, 0, 0, tightness);

		let bValidData = true; // Verify that there are no NaNs. 
		if ((p1 == null) || isNaN(p1.x) || isNaN(p1.y)){  bValidData = false;}
		if (bValidData){
			aPolylineStr  = '    <path \n';
			aPolylineStr += '      id="path' + polylineId + '"\n';
			aPolylineStr += '      d="';
			aPolylineStr += "M "; // Add the first, "Moveto" point
			aPolylineStr += nf(p1.x*svgScale,1,3) + ",";
			aPolylineStr += nf(p1.y*svgScale,1,3);

			for (let i = 0; i < verts.length; i++) {
				let p2 = this.getVertexPointAsPVector(verts, i + 0, 1, tightness);
				let p3 = this.getVertexPointAsPVector(verts, i + 1, -1, tightness);
				let p4 = this.getVertexPointAsPVector(verts, i + 1, 0, tightness);

				if ((p2 != null) && (p3 != null) && (p4 != null)){
					if ((!isNaN(p2.x)) && (!isNaN(p3.x)) && (!isNaN(p4.x)) &&
						(!isNaN(p2.y)) && (!isNaN(p3.y)) && (!isNaN(p4.y))){

						aPolylineStr += " C ";
						aPolylineStr += nf(p2.x*svgScale,1,3) + ",";
						aPolylineStr += nf(p2.y*svgScale,1,3) + " ";
						aPolylineStr += nf(p3.x*svgScale,1,3) + ",";
						aPolylineStr += nf(p3.y*svgScale,1,3) + " ";
						aPolylineStr += nf(p4.x*svgScale,1,3) + ",";
						aPolylineStr += nf(p4.y*svgScale,1,3);
					}
				}
			}
			aPolylineStr += ' Z"/>\n';
		} 
		return aPolylineStr;
	}




// Todo: remove extra points that are outside the membrane contour!


	//----------------------------------------------------------------
	getClosedPolycurveWithNoiseSVG(verts, svgScale, polylineId, t01, weight) {
		// Assumes the closed polycurve was drawn onscreen with beziers.

		noiseDetail(4, 0.5); 

		let dvbThickness = weight / 2;
		let dvbNoiseFrequency = 16 / svgScale; // Todo: should relate to TS!
		let dvbNoiseAmplitude = (weight < 1.5) ? 1.0 : 0.5;
		let dvbNibAngle = radians(40) - HALF_PI; 
		let dvbNibStrength = 0.375; 

		let bExportAllCollinear = false; 
		let bExportPlainThickness = false; 
		let bExportNoisyThickness = true; 

		let aPolylineStr = '';
		const tightness = 1.0 / 3.0;
		let bExportedFirstPointYet = false;
		let p1,p2,p3,p4; 
		p1 = this.getVertexPointAsPVector(verts, 0, 0, tightness);

		
		let bValidData = true; // Verify that there are no NaNs. 
		if ((p1 == null) || isNaN(p1.x) || isNaN(p1.y)){  bValidData = false;}
		if (bValidData){
			aPolylineStr  = '    <path \n';
			aPolylineStr += '      id="path' + polylineId + '"\n';
			aPolylineStr += '      d="';
			
			let p1x = p1.x;
			let p1y = p1.y;
			let prevSpineX = p1x; 
			let prevSpineY = p1y; 
			let currSpineX = prevSpineX; 
			let currSpineY = prevSpineY; 

			for (let i = 0; i < verts.length; i++) {
				p2 = this.getVertexPointAsPVector(verts, i + 0, 1, tightness);
				p3 = this.getVertexPointAsPVector(verts, i + 1,-1, tightness);
				p4 = this.getVertexPointAsPVector(verts, i + 1, 0, tightness);

				if ((p2 != null) && (p3 != null) && (p4 != null)){
					if ((!isNaN(p2.x)) && (!isNaN(p3.x)) && (!isNaN(p4.x)) &&
						(!isNaN(p2.y)) && (!isNaN(p3.y)) && (!isNaN(p4.y))){

						for (let j=0; j<5; j++){
							let t = map(j,0,5, 0,1); 
							prevSpineX = currSpineX; 
							prevSpineY = currSpineY; 
							currSpineX = bezierPoint(p1x, p2.x, p3.x, p4.x, t);
							currSpineY = bezierPoint(p1y, p2.y, p3.y, p4.y, t);

							let dx = currSpineX - prevSpineX; 
							let dy = currSpineY - prevSpineY; 
							let dh = Math.sqrt(dx*dx + dy*dy); 
							if (dh > 0){
								
								if (bExportAllCollinear){
									let svgX = currSpineX*svgScale;
									let svgY = currSpineY*svgScale;
									if (!bExportedFirstPointYet){
										aPolylineStr += "M ";
										bExportedFirstPointYet = true;
									} else {
										aPolylineStr += " L ";
									}
									aPolylineStr += nf(svgX,1,5) + ",";
									aPolylineStr += nf(svgY,1,5);

								} else if (bExportPlainThickness){
									dx /= dh; 
									dy /= dh; 

									let thA = dvbThickness;
									let thB = dvbThickness;
									let ax = currSpineX - thA*dy; 
									let ay = currSpineY + thA*dx; 
									let bx = currSpineX + thB*dy; 
									let by = currSpineY - thB*dx; 
									let px = lerp(ax, bx, t01); 
									let py = lerp(ay, by, t01); 

									let svgX = px*svgScale;
									let svgY = py*svgScale;
									if (!bExportedFirstPointYet){
										aPolylineStr += "M ";
										bExportedFirstPointYet = true;
									} else {
										aPolylineStr += " L ";
									}
									aPolylineStr += nf(svgX,1,5) + ",";
									aPolylineStr += nf(svgY,1,5);

								} else if (bExportNoisyThickness){
									let dvbOrientation = atan2(dy,dx); 
									dx /= dh; 
									dy /= dh; 
		
									let noiA = noise(currSpineX/dvbNoiseFrequency        , currSpineY/dvbNoiseFrequency) - 0.5;
									let noiB = noise(currSpineX/dvbNoiseFrequency + 100.0, currSpineY/dvbNoiseFrequency) - 0.5;
									let thA = dvbThickness * (1.0 + dvbNoiseAmplitude*noiA); 
									let thB = dvbThickness * (1.0 + dvbNoiseAmplitude*noiB); 
									let thAngScale = dvbNibStrength*(0.5 + 0.5*cos(2.0 * (dvbOrientation + dvbNibAngle)));
									thA *= ((1.0-dvbNibStrength) + thAngScale); 
									thB *= ((1.0-dvbNibStrength) + thAngScale); 
								
									let ax = currSpineX - thA*dy; 
									let ay = currSpineY + thA*dx; 
									let bx = currSpineX + thB*dy; 
									let by = currSpineY - thB*dx; 
									let px = lerp(ax, bx, t01); 
									let py = lerp(ay, by, t01); 
	
									let svgX = px*svgScale;
									let svgY = py*svgScale;
									if (!bExportedFirstPointYet){
										aPolylineStr += "M ";
										bExportedFirstPointYet = true;
									} else {
										aPolylineStr += " L ";
									}
									aPolylineStr += nf(svgX,1,5) + ",";
									aPolylineStr += nf(svgY,1,5);
								}
							}
						}
						p1x = p4.x; 
						p1y = p4.y;

					}
				}
			}
			aPolylineStr += ' Z"/>\n';
		} 
		return aPolylineStr;
	}



	//----------------------------------------------------------------
	getSelectVoronoiCellsSVG(svgScale, TX,TY,TS){
		let voronoiGroupStr = '';
		if (this.theStyleSheet.bDrawVoronoiDiagram){

			// Count how many structures could be showing cells
			const nStructures = this.myStructures.length;
			let nStructuresDisplayingVoronoiCells = 0; 
			for (let i=0; i<nStructures; i++){
				if (this.myStructures[i].bDisplayVoronoiCells){
					nStructuresDisplayingVoronoiCells++;
				}
			}
			if (nStructuresDisplayingVoronoiCells > 0){
				let myd3Polygons;
				let aD3Polygon;
				let siteIndex;
				const bDrawInteriorVoronoiCells = true;
				
				//-------------------
				// Add cell boundaries
				myd3Polygons = this.d3Voronoi.cellPolygons();
				aD3Polygon = myd3Polygons.next();
				siteIndex = 0; 
				voronoiGroupStr += '  <g id="voronoi_cells"> \n';

				const nVoronoiSubdivs = this.theStyleSheet.nVoronoiSubdivs;
				while (!aD3Polygon.done) {

					// Cells of the interior sites
					if (bDrawInteriorVoronoiCells){
						let idOfStructureParticleIsInside = this.myParticles[siteIndex].isInsideStructure;
						if (idOfStructureParticleIsInside > 0){
							if (this.myStructures[idOfStructureParticleIsInside].bDisplayVoronoiCells){
								const cellVertices = aD3Polygon.value;
								const nCellVertices = cellVertices.length-1; // D3 includes duplicate point.

								let verts = []; 
								if (nVoronoiSubdivs > 1){
									for (let j=0; j<nCellVertices; j++){
										for (let k=0; k<nVoronoiSubdivs; k++){
											let jx = (cellVertices[j][0] * TS)+TX;
											let jy = (cellVertices[j][1] * TS)+TY;
											verts.push( createVector(jx, jy));
										}
									}
									const nj = verts.length;
									for (let j=0; j<nj; j++){
										const a = (j-1+nj)%nj; const c = (j+1)%nj;
										verts[j].x = (verts[a].x + verts[j].x + verts[c].x)/3;
										verts[j].y = (verts[a].y + verts[j].y + verts[c].y)/3;}
									for (let j=nj-1; j>=0; j--){
										const a = (j-1+nj)%nj; const c = (j+1)%nj;
										verts[j].x = (verts[a].x + verts[j].x + verts[c].x)/3;
										verts[j].y = (verts[a].y + verts[j].y + verts[c].y)/3;}
								} else {
									for (let j=0; j<nCellVertices; j++){
										let jx = (cellVertices[j][0] * TS)+TX;
										let jy = (cellVertices[j][1] * TS)+TY;
										verts.push(createVector(jx, jy)); 
									}
								}
								let polylineId = "cell" + siteIndex;
								voronoiGroupStr += this.getPolylineSVG(verts, svgScale, polylineId, true);
								verts = null;
							}
						}
					}

					// (Clipped) cells of the interior BOUNDARY sites, if desired
					if (this.theStyleSheet.bDrawClippedVoronoiCellsOnInteriorStructureBoundaries){
						let idOfStructureParticleIsPartOf = this.myParticles[siteIndex].isPartOfStructure;
						if (idOfStructureParticleIsPartOf > 0) {
							let structureParticleIsPartOf = this.myStructures[idOfStructureParticleIsPartOf];
							if ((structureParticleIsPartOf.bDisplayVoronoiCells) &&
								(structureParticleIsPartOf.bDisplayVoronoiEdges)){ 

								if (structureParticleIsPartOf.type == STRUCTURE_TYPE_WHEEL){ // only wheels for now
									let structureParticleIndices = structureParticleIsPartOf.particleIndices;
									let nP = structureParticleIndices.length;
									
									// identify the index, in the this.myStructures[idOfStructureParticleIsPartOf].particleIndices array, 
									// of the element whose value is siteIndex
									let indexInStructureArray = -1; 
									for (let i=0; i<nP; i++){
										if (structureParticleIndices[i] == siteIndex){
											indexInStructureArray = i;
										}
									}

									if (indexInStructureArray >= 0){
										if (indexInStructureArray%2 == 0){ // for WHEEL; even ones only
											const ih = (indexInStructureArray - 2 + nP)%nP; 
											const ii = (indexInStructureArray         ); 
											const ij = (indexInStructureArray + 2     )%nP; 
											const iih = structureParticleIndices[ih]; 
											const iii = structureParticleIndices[ii]; 
											const iij = structureParticleIndices[ij]; 
											
											const phx = this.myParticles[iih].p.x; 
											const phy = this.myParticles[iih].p.y; 
											const pix = this.myParticles[iii].p.x; 
											const piy = this.myParticles[iii].p.y; 
											const pjx = this.myParticles[iij].p.x; 
											const pjy = this.myParticles[iij].p.y; 

											const cellVertices = aD3Polygon.value;
											const nCellVertices = cellVertices.length-1; // D3 includes duplicate point.
											const muaLimit = 3;

											for (let j=0; j<nCellVertices; j++){
												let ax = cellVertices[j  ][0];
												let ay = cellVertices[j  ][1];
												let bx = cellVertices[j+1][0];
												let by = cellVertices[j+1][1];

												if (this.myStructures[idOfStructureParticleIsPartOf].pointInside(ax,ay)){
													let vAIx = ax - pix; 
													let vAIy = ay - piy; 
													let vBJx = bx - pjx; 
													let vBJy = by - pjy; 
													let vHIx = phx - pix; 
													let vHIy = phy - piy; 
													let vIJx = pix - pjx; 
													let vIJy = piy - pjy; 

													let crossHIA = (vAIx * vHIy) - (vAIy * vHIx);
													let crossIJB = (vBJx * vIJy) - (vBJy * vIJx);
													if (crossHIA > 0){
														if (crossIJB > 0){
															let verts = []; 

															verts.push(createVector(ax*TS+TX, ay*TS+TY)); 
															verts.push(createVector(bx*TS+TX, by*TS+TY)); 
															voronoiGroupStr += this.getLineSegmentSVG(verts, svgScale);
															verts = null;

														} else {
															// line AB crosses boundary. compute intersection Q and only keep AQ
															let denom = (pjy-phy) * (bx-ax) - (pjx-phx) * (by-ay);
															if (Math.abs(denom) > 0){
																let numera = (pjx-phx) * (ay-phy) - (pjy-phy) * (ax-phx);
																let numerb = (bx-ax) * (ay-phy) - (by-ay) * (ax-phx);
																let mua = numera / denom;
																let mub = numerb / denom;
																if ((Math.abs(mua) < muaLimit) && (Math.abs(mub) < muaLimit)){
																	let qx = ax + mua * (bx-ax);
																	let qy = ay + mua * (by-ay);

																	let verts = []; 
																	verts.push(createVector(ax*TS+TX, ay*TS+TY)); 
																	verts.push(createVector(qx*TS+TX, qy*TS+TY)); 
																	voronoiGroupStr += this.getLineSegmentSVG(verts, svgScale);
																	verts = null;
																} 
															}
														}
													}
												}

												
											}
										}

									}
								}
							}
						}
					}

					aD3Polygon = myd3Polygons.next();
					siteIndex++;
				}
				voronoiGroupStr += '  </g>\n';

				//-------------------
				// Add cell nuclei
				myd3Polygons = this.d3Voronoi.cellPolygons();
				aD3Polygon = myd3Polygons.next();
				siteIndex = 0; 
				voronoiGroupStr += '  <g id="voronoi_nuclei"> \n';
				while (!aD3Polygon.done) {
					let idOfStructureParticleIsInside = this.myParticles[siteIndex].isInsideStructure;
					if (idOfStructureParticleIsInside > 0){
						if (this.myStructures[idOfStructureParticleIsInside].bDisplayVoronoiNuclei){
							let vertsRaw = [this.myParticles[siteIndex].p];
							let verts = [];
							for (let l=0; l<vertsRaw.length; l++){
								let vx = (vertsRaw[l].x * TS) + TX;
								let vy = (vertsRaw[l].y * TS) + TY; 
								verts[l] = createVector(vx, vy); 
							}
							voronoiGroupStr += this.getCircleSVG(verts, svgScale, WEIGHT_1*0.33);
							voronoiGroupStr += this.getCircleSVG(verts, svgScale, WEIGHT_0*0.33); // "fill"
						}
					}
					aD3Polygon = myd3Polygons.next();
					siteIndex++;
				}
				voronoiGroupStr += '  </g>\n';
			}
		}
		return voronoiGroupStr; 
	}


	//----------------------------------------------------------------
	getEncircledSiteBlobsSVG(svgScale, TX,TY,TS){
		let blobGroupStr = '\n'; 
		let blobCount = 0; 
		if (this.theStyleSheet.bDrawEncircledSiteBlobs){
			let myd3Polygons = this.d3Voronoi.cellPolygons();
			let aD3Polygon = myd3Polygons.next();
			let siteId = 0;

			while (!aD3Polygon.done) {
				if (this.myParticles[siteId].bDrawSiteBlob){ 
					if(!this.myParticles[siteId].bNeverDisplayAsBlob){
						let bIsOnBoundary = this.myParticles[siteId].bIsABoundarySite;
						let bBlobIsPartOfAStructure = !(this.myParticles[siteId].isPartOfStructure == -1); // won't work for MEMBRANE

						if (!bIsOnBoundary && !bBlobIsPartOfAStructure){
							let cellVertices = aD3Polygon.value;
							let nCellVertices = cellVertices.length-1; // D3 includes duplicate point.
							let cx = this.myParticles[siteId].c.x;
							let cy = this.myParticles[siteId].c.y;
							blobGroupStr += this.getSiteBlobSVG (cellVertices, nCellVertices, cx, cy, siteId, svgScale, TX,TY,TS);
							blobCount++; 
						}
					}
				}
				aD3Polygon = myd3Polygons.next();
				siteId++; 
			}
		}
		if (blobCount > 0){
			blobGroupStr = '  <g id="site_blobs"> \n' + blobGroupStr;
			blobGroupStr += '  </g>\n';
		}
		return blobGroupStr;
	}

	//----------------------------------------------
	getSiteBlobSVG( cellVertices, nCellVertices, cx, cy, siteId, svgScale, TX,TY,TS){
		let verts = []; 
		let aPolylineStr = ''; 

		// TODO: could be NaN distance between cellVertices -- see getSiteBlob

		for (let j=0; j<nCellVertices; j++){
			let k = (j+1);
			let jx = cellVertices[j][0];
			let jy = cellVertices[j][1];
			let kx = cellVertices[k][0];
			let ky = cellVertices[k][1];
			let lx = (jx+kx)/2; 
			let ly = (jy+ky)/2; 
			verts[j] = [lx, ly];
		}
		let blobScale = this.theStyleSheet.siteBlobScale;
		let blobTightness = this.theStyleSheet.siteBlobTightness;
		let p1,p2,p3,p4;

		let bValidData = true; // Verify that there are no NaNs. 
		p1 = this.getVertexPointArrSVG(verts, 0, 0, blobTightness);
		if (isNaN(p1[0]) || isNaN(p1[1])) { bValidData = false; }
		for (let i = 0; i < verts.length; i++) {
			p2 = this.getVertexPointArrSVG(verts, i,      1, blobTightness);
			p3 = this.getVertexPointArrSVG(verts, i + 1, -1, blobTightness);
			p4 = this.getVertexPointArrSVG(verts, i + 1,  0, blobTightness);
			if (isNaN(p2[0]) || isNaN(p2[1])) { bValidData = false; }
			if (isNaN(p3[0]) || isNaN(p3[1])) { bValidData = false; }
			if (isNaN(p4[0]) || isNaN(p4[1])) { bValidData = false; }
		}

		if (bValidData){
			aPolylineStr = '    <path \n';
			aPolylineStr += '      id="blob' + siteId + '"\n';
			aPolylineStr += '      d="';

			p1 = this.getVertexPointArrSVG(verts, 0, 0, blobTightness);
			let p1x = cx + blobScale*(p1[0] - cx);
			let p1y = cy + blobScale*(p1[1] - cy);
			p1x = p1x*TS+TX; 
			p1y = p1y*TS+TY; 
			aPolylineStr += "M ";
			aPolylineStr += nf(p1x * svgScale, 1, 3) + ",";
			aPolylineStr += nf(p1y * svgScale, 1, 3);

			for (let i = 0; i < verts.length; i++) {
				p2 = this.getVertexPointArrSVG(verts, i,      1, blobTightness);
				p3 = this.getVertexPointArrSVG(verts, i + 1, -1, blobTightness);
				p4 = this.getVertexPointArrSVG(verts, i + 1,  0, blobTightness);

				let p2x = cx + blobScale*(p2[0] - cx);
				let p2y = cy + blobScale*(p2[1] - cy);
				let p3x = cx + blobScale*(p3[0] - cx);
				let p3y = cy + blobScale*(p3[1] - cy);
				let p4x = cx + blobScale*(p4[0] - cx);
				let p4y = cy + blobScale*(p4[1] - cy);

				p2x = p2x*TS+TX; p2y = p2y*TS+TY; 
				p3x = p3x*TS+TX; p3y = p3y*TS+TY; 
				p4x = p4x*TS+TX; p4y = p4y*TS+TY; 

				aPolylineStr += " C ";
				aPolylineStr += nf(p2x * svgScale, 1, 3) + ",";
				aPolylineStr += nf(p2y * svgScale, 1, 3) + " ";
				aPolylineStr += nf(p3x * svgScale, 1, 3) + ",";
				aPolylineStr += nf(p3y * svgScale, 1, 3) + " ";
				aPolylineStr += nf(p4x * svgScale, 1, 3) + ",";
				aPolylineStr += nf(p4y * svgScale, 1, 3);
			}
			aPolylineStr += ' Z"/>\n';
		}
		verts = null;
		return aPolylineStr;
	}

	//----------------------------------------------
	getVertexPointAsPVector (verts, index, side, tightness) {
		const N = verts.length;
		if (side === 0) {
			return verts[index % N];
		} else {
			// Get the current vertex, and its neighbors
			let vB = verts[index % N];
			let vA = verts[(index + N - 1) % N];
			let vC = verts[(index + N + 1) % N];
		
			// Compute delta vectors from neigbors
			let dAB = p5.Vector.sub(vA, vB);
			let dCB = p5.Vector.sub(vC, vB);
			let dAB1 = dAB.copy().normalize();
			let dCB1 = dCB.copy().normalize();

			// Compute perpendicular and tangent vectors
			let len = 0;
			let vPerp = p5.Vector.add(dAB1, dCB1);
			if (vPerp.mag() > 0){
				vPerp.normalize(); 
				let vTan = createVector(vPerp.y, 0 - vPerp.x);
				let vCros = p5.Vector.cross(dAB1, dCB1);
			
				// Compute control point
				len = tightness;
				if (side === 1) {
					len *= dCB.mag();
					len *= vCros.z > 0 ? -1 : 1;
				} else {
					// e.g. if side === -1
					len *= dAB.mag();
					len *= vCros.z < 0 ? -1 : 1;
				}
				return vB.copy().add(vTan.mult(len));
			}
			return null;
		}
	}

	//----------------------------------------------------------------
	getOpenPolycurveSVG(verts, svgScale, polylineId) {
		// Assumes the open polycurve was drawn onscreen with catmull-rom splines.
		// Interleave the data for catmullRom2bezier()
		let crp = [];
		let crpIndex = 0;
		for (let j = 0; j < verts.length; j++) {
			crp[crpIndex++] = verts[j].x;
			crp[crpIndex++] = verts[j].y;
		}

		// Add the remaining ("Curveto") points
		let bClosed = false;
		let d = this.catmullRom2bezier(crp, bClosed);

		// Verify that there are no NaNs. 
		let bValidData = true; 
		for (let i = 0; i < d.length; i++) {
			if (isNaN(d[i][0]) || isNaN(d[i][1])){
				bValidData = false; 
			}
		}

		let aPolylineStr = '';
		if (bValidData){
			aPolylineStr = '    <path \n';
			aPolylineStr += '      id="path' + polylineId + '"\n';
			aPolylineStr += '      d="';

			// Add the first ("Moveto") point
			aPolylineStr += "M ";
			aPolylineStr += nf(verts[0].x * svgScale, 1, 3) + ",";
			aPolylineStr += nf(verts[0].y * svgScale, 1, 3);
			
			for (let i = 0; i < d.length; i++) {
				let b = d[i];
				aPolylineStr += " C ";
				aPolylineStr += nf(b[0] * svgScale, 1, 3) + ",";
				aPolylineStr += nf(b[1] * svgScale, 1, 3) + " ";
				aPolylineStr += nf(b[2] * svgScale, 1, 3) + ",";
				aPolylineStr += nf(b[3] * svgScale, 1, 3) + " ";
				aPolylineStr += nf(b[4] * svgScale, 1, 3) + ",";
				aPolylineStr += nf(b[5] * svgScale, 1, 3);
			}
			aPolylineStr += '"/>\n';
		}
		return aPolylineStr;
	}

	// https://github.com/processing/p5.js/blob/e32b45367baad694b1f4eeec0586b910bfcf0724/src/typography/p5.Font.js#L1099
	catmullRom2bezier(crp, z) {
		const d = [];
		for (let i = 0, iLen = crp.length; iLen - 2 * !z > i; i += 2) {
			const p = [
				{ x: crp[i - 2], y: crp[i - 1] },
				{ x: crp[i + 0], y: crp[i + 1] },
				{ x: crp[i + 2], y: crp[i + 3] },
				{ x: crp[i + 4], y: crp[i + 5] },
			];
			if (z) {
				if (!i) {
					p[0] = { x: crp[iLen - 2], y: crp[iLen - 1] };
				} else if (iLen - 4 === i) {
					p[3] = { x: crp[0], y: crp[1] };
				} else if (iLen - 2 === i) {
					p[2] = { x: crp[0], y: crp[1] };
					p[3] = { x: crp[2], y: crp[3] };
				}
			} else {
				if (iLen - 4 === i) {
					p[3] = p[2];
				} else if (!i) {
					p[0] = { x: crp[i], y: crp[i + 1] };
				}
			}
			d.push([
				(-p[0].x + 6.0 * p[1].x + p[2].x) / 6.0,
				(-p[0].y + 6.0 * p[1].y + p[2].y) / 6.0,
				(p[1].x + 6.0 * p[2].x - p[3].x) / 6.0,
				(p[1].y + 6.0 * p[2].y - p[3].y) / 6.0,
				p[2].x,
				p[2].y,
			]);
		}
		return d;
	}



	//------------------------------
	getVertexPointArrSVG(verts, index, side, tightness) {
		const N = verts.length;
		if (side === 0) {
		return (verts[index % N]);
		} else {

			// Get the current vertex, and its neighbors
			const vB = verts[index % N];
			const vA = verts[(index + N - 1) % N];
			const vC = verts[(index + 1) % N];

			// Compute delta vectors from neighbors
			let dABx = vA[0] - vB[0];
			let dABy = vA[1] - vB[1];
			const dABh = Math.sqrt(dABx*dABx + dABy*dABy);
			let dCBx = vC[0] - vB[0];
			let dCBy = vC[1] - vB[1];
			const dCBh = Math.sqrt(dCBx*dCBx + dCBy*dCBy);
			
			dABx /= dABh;
			dABy /= dABh;
			dCBx /= dCBh;
			dCBy /= dCBh;

			const vPerpx = (dABx + dCBx);
			const vPerpy = (dABy + dCBy);
			const vPerph = Math.sqrt(vPerpx*vPerpx + vPerpy*vPerpy);
			
			// Compute control point
			let len = 0; 
			if (vPerph > 0){
				len = tightness / vPerph;
				const vCrosz = dABx * dCBy - dABy * dCBx;
				if (side === 1) {
					len *= dCBh;
					len *= (vCrosz > 0) ? -1 : 1;
				} else { // e.g. if side === -1
					len *= dABh;
					len *= (vCrosz < 0) ? -1 : 1;
				}
			}

			const outx = vB[0] + (len * vPerpy);
			const outy = vB[1] - (len * vPerpx);
			return [outx, outy];
		}
	}



} // close Cyto class 