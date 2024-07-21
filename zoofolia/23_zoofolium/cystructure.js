//==========================================================
/*

  /$$$$$$  /$$$$$$$$ /$$$$$$$  /$$   /$$  /$$$$$$  /$$$$$$$$ /$$   /$$ /$$$$$$$  /$$$$$$$$
 /$$__  $$|__  $$__/| $$__  $$| $$  | $$ /$$__  $$|__  $$__/| $$  | $$| $$__  $$| $$_____/
| $$  \__/   | $$   | $$  \ $$| $$  | $$| $$  \__/   | $$   | $$  | $$| $$  \ $$| $$      
|  $$$$$$    | $$   | $$$$$$$/| $$  | $$| $$         | $$   | $$  | $$| $$$$$$$/| $$$$$   
 \____  $$   | $$   | $$__  $$| $$  | $$| $$         | $$   | $$  | $$| $$__  $$| $$__/   
 /$$  \ $$   | $$   | $$  \ $$| $$  | $$| $$    $$   | $$   | $$  | $$| $$  \ $$| $$      
|  $$$$$$/   | $$   | $$  | $$|  $$$$$$/|  $$$$$$/   | $$   |  $$$$$$/| $$  | $$| $$$$$$$$
 \______/    |__/   |__/  |__/ \______/  \______/    |__/    \______/ |__/  |__/|________/

*/


class CyStructure {
	
	constructor(mom, t, cx, cy, id, overrideStruct=null) {
		this.mom = mom;
		this.hasSubstituteSubcell = false; 

		this.type = t;
		this.id = id;

		this.particleIndices = [];
		this.springs = [];
		this.whichParticleIsGrabbed = -1;
		this.whichParticleIsMostRecentlyAdded = -1;
		this.boundingBox = {"L":0, "T":0, "R":0, "B":0};
		this.history = [];

		// STYLE properties
		this.SMOOTHING = 1.5; //myRandomAB(1.5, 2.5); 
		this.SCRUNCHING = -0.25; 
		this.TWISTING = 0.001; // acceptable between 0.0 and 0.025; choose 0.001 or 0.025
		this.PROPERTY_A = 0; // type-specific data
		this.PROPERTY_B = 0; // type-specific data
		this.PROPERTY_C = 0; // type-specific data
		this.STYLE_ID = 0; 
		this.MASS_MULTIPLIER = 1.0;

		this.bDisplayEnclosedBlobs = false;
		this.bDisplayVoronoiCells = false;
		this.bDisplayVoronoiEdges = false;
		this.bDisplayVoronoiNuclei = false;
		this.bFlocking = false; 
		this.bGrowing = false;
		this.growthSizeLimit = 99999; 
		this.bUseGreedyGrowth = false;
		this.lastAddSegmentTime = this.mom.simulationFrameCount; 
		this.hasEnclosure = false;
		this.siteAttachmentId = -1;
		this.isEnclosedByStructureID = -1; 
		this.bFull = false;
		this.bLoop = false;

		this.labelsStructureID = -1;
		this.isLabeledByStructureID = -1;

		const minWheelLen = 7;
		const minUrchinLen = 7;
		const minTrussLen = 2; 
		const minCentiLen = 3; 
		const dashLen = 2; 

		let theStyleSheet = this.mom.theStyleSheet; 
		let myParticles = this.mom.myParticles;
		let nMaskPoints = this.mom.nMaskPoints;

		switch (this.type) {
			case STRUCTURE_TYPE_LOOP:
				{
					const minLoopLen = 4; 
					this.STYLE_ID = theStyleSheet.loopStructureStyle;
					this.MASS_MULTIPLIER = theStyleSheet.loopMassMultiplier;
					this.bLoop = true;
					this.hasEnclosure = true; 
					this.bGrowing = true;
					this.bUseGreedyGrowth = theStyleSheet.bLoopUseGreedyGrowth; 
					this.bDisplayEnclosedBlobs = theStyleSheet.bLoopDisplayEnclosedBlobs;
			
					let initialSize = max(minLoopLen, theStyleSheet.loopInitialSize);
					let sizeTarget = theStyleSheet.loopSizeTarget; 
					let sizeVariance = theStyleSheet.loopSizeVariance;
					this.growthSizeLimit = Math.round(sizeTarget + myRandomAB(-1,1)*sizeVariance);
					this.growthSizeLimit = max(this.growthSizeLimit, initialSize);
					if (overrideStruct){
						this.STYLE_ID = overrideStruct.style;
						if (overrideStruct.initSize){initialSize = overrideStruct.initSize;}
						if (overrideStruct.targetSize){this.growthSizeLimit = overrideStruct.targetSize;}
					}
					this.initializeStructure(cx, cy, initialSize, 0); 
				}
				break;

			case STRUCTURE_TYPE_WHEEL:
				const okUxWheelStyles = [0,1,2,3,4,5,6,7,8,9,11,14,16,17]; 
				this.STYLE_ID = okUxWheelStyles[ this.id % okUxWheelStyles.length];
				this.MASS_MULTIPLIER = theStyleSheet.wheelMassMultiplier;

				this.bLoop = true;
				this.hasEnclosure = true; 
				
				this.bGrowing = true;
				let wheelLen = 20; 
				this.growthSizeLimit = 64;
				if (overrideStruct){
					this.STYLE_ID = overrideStruct.style;
					if (overrideStruct.initSize){wheelLen = overrideStruct.initSize;}
					if (overrideStruct.targetSize){this.growthSizeLimit = overrideStruct.targetSize;}
				}

				// either the structure has other structures in it, OR, it has this stuff: 
				switch(this.STYLE_ID){
					case 0: // bold outer loop; inner thin line
						this.bDisplayEnclosedBlobs = (myRandomA(1.0) < 0.70);
						this.bDisplayVoronoiCells = (myRandomA(1.0) < 0.20);
						break;
					case 1: // cells with bevels
						this.bDisplayEnclosedBlobs = (myRandomA(1.0) < 0.20);
						break;
					case 2: // dense radial bands
						this.bDisplayVoronoiCells = true;
						this.bDisplayVoronoiEdges = true; 
						this.bDisplayVoronoiNuclei = true;
						break;
					case 3: // wall made of cells with nuclei
						this.bDisplayEnclosedBlobs = (myRandom01() < 0.40);
						break;
					case 4: // fluted tube, highway. 
						// contains blobs OR cells, OR (rarely) both
						let rc = myRandomA(1.0); 
						if (rc < 0.35){
							this.bDisplayEnclosedBlobs = true; 
						} else if (rc < 0.70){
							this.bDisplayVoronoiCells = true; 
							this.bDisplayVoronoiEdges = true; // mandatory
							this.bDisplayVoronoiNuclei = (myRandomA(1.0) < 0.6); 
						} else {
							this.bDisplayEnclosedBlobs = true; 
							this.bDisplayVoronoiCells = true; 
							if ((!theStyleSheet.bDoFillSiteBlobs) || (theStyleSheet.siteBlobFillColor == 255)){
								this.bDisplayVoronoiNuclei = (myRandomA(1.0) < 0.2); 
								this.bDisplayVoronoiEdges = true;  
							} else {
								this.bDisplayVoronoiEdges = (myRandomA(1.0) < 0.3); 
							}
						}
						break;
					case 5: // hairy
						break;
					case 6: // interior hachure
						this.bDisplayEnclosedBlobs = (myRandomA(1.0) < 0.75);
						break;
					case 7: // vacuole bubble
						this.bDisplayEnclosedBlobs = (myRandomA(1.0) < 0.3); 
						break;
					case 8: // engraved techno-torus
						let rd = myRandomA(1.0); 
						if (rd < 0.3){
							this.bDisplayEnclosedBlobs = true; 
						} else if (rd < 0.5){
							this.bDisplayVoronoiCells = true; 
							this.bDisplayVoronoiEdges = true; 
							this.bDisplayVoronoiNuclei = (myRandomA(1.0) < 0.05); 
						} else if (rd < 0.8){
							this.bDisplayEnclosedBlobs = true;
							this.bDisplayVoronoiCells = true; 
							this.bDisplayVoronoiEdges = true; 
						} else {
							;
						}
						break;
					case  9: // dotted
						break;
					case 10: // hairy doinks
						this.bDisplayEnclosedBlobs = true;
						break;
					case 11: // plain outer and inner boundaries; blobs & voronoi cells
						this.bDisplayEnclosedBlobs = true;
						this.bDisplayVoronoiCells = true;
						this.bDisplayVoronoiEdges = true; 
						break;
					case 12: // black (outlined and hatched)
						this.bDisplayEnclosedBlobs = (myRandomA(1.0) < 0.75);
						this.bDisplayVoronoiCells = false;
						break;
					case 13: // blank spot for letters
						break;
					case 15: 
						this.bDisplayEnclosedBlobs = (myRandomA(1.0) < 0.25);
						break;
					case 16:
						this.bDisplayEnclosedBlobs = (myRandomA(1.0) < 0.04);
						this.bDisplayVoronoiCells = (myRandomA(1.0) < 0.70);
						break;
					case 17: 
						// this.bDisplayEnclosedBlobs = true; //(myRandomA(1.0) < 0.70);
						break;
				}
				this.initializeStructure(cx, cy, max(minWheelLen, wheelLen), 0); 
				break;

			case STRUCTURE_TYPE_LINE:
				{
					this.bFlocking = true;
					const minLineLen = 2; 
					this.bLoop = false;
					this.hasEnclosure = false;
					this.bGrowing = true;
					let initialLineLen = 3;
					this.bUseGreedyGrowth = theStyleSheet.lineStructureUseGreedyGrowth;
					let lengthTarget = theStyleSheet.lineStructureLengthTarget; 
					let lengthVariance = theStyleSheet.lineStructureLengthVariance;
					let maxLength =  Math.round(lengthTarget + myRandomAB(-1,1)*lengthVariance);
					this.growthSizeLimit = maxLength; 
					this.STYLE_ID = theStyleSheet.lineStructureStyle;
					this.MASS_MULTIPLIER = theStyleSheet.lineMassMultiplier;

					let initAng = 0; 
					if (overrideStruct){
						this.STYLE_ID = overrideStruct.style;
						if (overrideStruct.initSize){initialLineLen = overrideStruct.initSize;}
						if (overrideStruct.targetSize){this.growthSizeLimit = overrideStruct.targetSize;}
						if (overrideStruct.initAng){initAng = overrideStruct.initAng;}
					}
					this.initializeStructure(cx, cy, max(minLineLen, initialLineLen), initAng); 
				}
				break;

			case STRUCTURE_TYPE_TRUSS: 
				{
					this.bFlocking = true;
					this.bLoop = false;
					this.hasEnclosure = true; 
					this.bGrowing = true;

					this.STYLE_ID = theStyleSheet.trussStructureStyle;
					let deviation = int(abs(myRandomGaussian(0.0, theStyleSheet.trussStructureTargetLengthStd)));
					this.growthSizeLimit = theStyleSheet.trussStructureTargetLengthMin + deviation;
					let trussLen = theStyleSheet.trussStructureMinLen; 
					let initAng = 0; 
					if (overrideStruct){
						this.STYLE_ID = overrideStruct.style;
						if (overrideStruct.initSize){trussLen = overrideStruct.initSize;}
						if (overrideStruct.targetSize){this.growthSizeLimit = overrideStruct.targetSize;}
						if (overrideStruct.initAng){initAng = overrideStruct.initAng;}
					}
					this.initializeStructure(cx, cy, max(minTrussLen, trussLen), initAng);
				} 
				break;

			case STRUCTURE_TYPE_DASH:
				{
					this.STYLE_ID = theStyleSheet.dashStructureStyle;
					this.MASS_MULTIPLIER = theStyleSheet.dashMassMultiplier;

					this.bLoop = false;
					this.hasEnclosure = false;
					this.bFlocking = true;
					this.initializeStructure(cx, cy, dashLen, 0); 
					let ip = this.particleIndices[1];
					for (let i=0; i<10; i++){
						let px = myParticles[ip].p.x; 
						let py = myParticles[ip].p.y; 
						this.history[i] = createVector(px,py); 
					}
				}
				break;

			case STRUCTURE_TYPE_STAR: 
				{
					this.bLoop = false;
					this.hasEnclosure = false;
					this.bGrowing = true;
					this.growthSizeLimit = theStyleSheet.starStructureSizeTarget;
					this.STYLE_ID = theStyleSheet.starStructureStyle;
					let starNSpokes = myRandomInt(5, 7);
					let starLen = 0;
					if (overrideStruct){
						this.STYLE_ID = overrideStruct.style;
						if (overrideStruct.initSize){ starLen = overrideStruct.initSize;}
						if (overrideStruct.nSpokes){starNSpokes = overrideStruct.nSpokes;}
						if (overrideStruct.targetSize){this.growthSizeLimit = overrideStruct.targetSize;}
					}
					this.PROPERTY_A = starNSpokes;
					this.PROPERTY_B = constrain(starLen, 0, 20);
					this.initializeStructure(cx, cy, this.PROPERTY_A, this.PROPERTY_B); 
				}
				break;

			case STRUCTURE_TYPE_BALL:
				{
					this.bLoop = true;
					this.hasEnclosure = true;
					this.bDisplayEnclosedBlobs = false;
					this.MASS_MULTIPLIER = theStyleSheet.ballMassMultiplier;
					this.STYLE_ID = (theStyleSheet.ballStructureStyle == PARTY_STYLE) ? (this.id)%5 : theStyleSheet.ballStructureStyle;
					if (overrideStruct){ this.STYLE_ID = overrideStruct.style; }
					this.bFlocking = ((this.STYLE_ID == 5) || (this.STYLE_ID == 6)) ? false : true;// REVISIT: TODO

					this.PROPERTY_A = theStyleSheet.ballStructureEccentricity;
					this.PROPERTY_B = theStyleSheet.ballStructureSymmetry;
					let ballRadius = map(this.STYLE_ID,0,7, 0.85,1.3,true); //1.1; // radius, in this.mom.REST_L units 0.9-1.5 // SET BY STYLE
					if (this.STYLE_ID >= 10){ ballRadius = myRandomAB(1.05,1.25); }
					this.initializeStructure(cx, cy, theStyleSheet.nSpokesPerBall, ballRadius); 
				}
				break;

			case STRUCTURE_TYPE_TREE:
				{
					this.STYLE_ID = theStyleSheet.treeStructureStyle; 
					this.MASS_MULTIPLIER = theStyleSheet.treeMassMultiplier; 
					this.bLoop = false;
					this.hasEnclosure = false;
					this.bGrowing = true;
					this.bUseGreedyGrowth = theStyleSheet.bTreeUseGreedyGrowth; 
					this.growthSizeLimit = theStyleSheet.treeGrowthSizeLimit; 
					this.PROPERTY_A = theStyleSheet.treeStructureBranchDiminishFactor; // 0.80; 
					this.PROPERTY_B = theStyleSheet.treeBranchMutualRepulsionFactor; //0.05 
					let nInitialSpokes = 3;
					if (overrideStruct){
						this.STYLE_ID = overrideStruct.style;
						if (overrideStruct.nSpokes){nInitialSpokes = overrideStruct.nSpokes;}
					}
					this.initializeStructure(cx, cy, nInitialSpokes, 0); 
				}
				break;

			case STRUCTURE_TYPE_URCHIN:
				{
					let urchinLen = 16; // // SET BY STYLE
					let spineLen = 3; // SET BY STYLE
					this.STYLE_ID = (theStyleSheet.urchinStructureCounter + this.id)%4; 
				
					if (overrideStruct){
						this.STYLE_ID = overrideStruct.style;
						if (overrideStruct.spineLen){spineLen = overrideStruct.spineLen;}
						if (overrideStruct.urchinLen){
							urchinLen = overrideStruct.urchinLen;
							this.growthSizeLimit = urchinLen;
						}
					}

					switch(this.STYLE_ID){
						case 0: // Plain double-loop
							break;
						case 1: // Decorative nuclei
							this.bDisplayVoronoiCells = true;
							this.bDisplayVoronoiEdges = true; 
							this.bDisplayVoronoiNuclei = true;
							break;
						case 2: // Inner loop has gaps
							break;
						case 3: // Ringed
							break;
					}
					this.bLoop = true;
					this.hasEnclosure = true; 
					this.PROPERTY_A = spineLen; // PROPERTY_A is the length of the hairs
					this.initializeStructure(cx, cy, max(minUrchinLen, urchinLen), spineLen); 
				}
				break;

			case STRUCTURE_TYPE_CENTI:
				{
					this.bLoop = true;
					this.hasEnclosure = true; 
					this.bFlocking = true;
					this.bLoopDisplayEnclosedBlobs = false;
					this.STYLE_ID = theStyleSheet.centiStructureStyle; // only use style #3 for short centiLen (<10)
					let centiLen = theStyleSheet.centiStructureLength;
					let centiHairProportion = myRandomAB(0.25, 0.8);

					
					if (overrideStruct){
						this.STYLE_ID = overrideStruct.style;
						if (overrideStruct.initSize){centiLen = overrideStruct.initSize;}
						if (overrideStruct.targetSize){centiLen = overrideStruct.targetSize;}
						centiHairProportion = myRandomAB(0.6, 0.9); 
					}
					this.PROPERTY_A = centiHairProportion;
					this.initializeStructure(cx, cy, max(minCentiLen, centiLen), 0); 

					let ip = this.particleIndices[this.particleIndices.length-1];
					for (let i=0; i<10; i++){
						let px = myParticles[ip].p.x; 
						let py = myParticles[ip].p.y; 
						this.history[i] = createVector(px,py); 
					}
				}
				break;

			case STRUCTURE_TYPE_MEMBRANE:
				this.bLoop = false;
				this.hasEnclosure = false; // it's complicated
				this.STYLE_ID = theStyleSheet.membrane_STYLE_ID;
				this.PROPERTY_A = theStyleSheet.membraneLoopPerimeterReductionFactor; 
				this.PROPERTY_B = theStyleSheet.nMembraneLayers;
				this.PROPERTY_C = theStyleSheet.membraneInnermostRingMass;
				this.initializeStructure(cx, cy, theStyleSheet.nMembraneLayers, 0); 
				break;
				
			case STRUCTURE_TYPE_OFFSETS: 
				this.PROPERTY_A = theStyleSheet.nOffsetRings; 
				this.PROPERTY_B = theStyleSheet.offsetRingSpacing; 
				this.PROPERTY_C = theStyleSheet.firstOffsetRingSpacing; 
				this.STYLE_ID = theStyleSheet.bGappyOffsetCurves;
				break;

		}  

		// Also add the Structure's particles' info to the this.mom.d3Data.
		let nParticlesInThisStructure = this.particleIndices.length;
		if (this.type != STRUCTURE_TYPE_MEMBRANE){
			this.mom.nInteriorPoints += nParticlesInThisStructure;
			for (let i = 0; i < nParticlesInThisStructure; i++) {
				let ip = this.particleIndices[i];
				let P = myParticles[ip];
				this.mom.d3Data.push(P.p.x);
				this.mom.d3Data.push(P.p.y);
			}
		} else {
			// handle membrane as special case. Its points should not be added to this.mom.d3Data (again).
			for (let i = 0; i < nParticlesInThisStructure; i++) {
				let ip = this.particleIndices[i];
				if (ip > nMaskPoints){
					this.mom.nInteriorPoints++;
					let P = myParticles[ip];
					this.mom.d3Data.push(P.p.x);
					this.mom.d3Data.push(P.p.y);
				}
			}
		}
	};

	setDisplayEnclosedBlobs (b){
		this.bDisplayEnclosedBlobs = b;
	}

	//----------------------------------------------
	initializeStructure(cx, cy, n, m) {
		let birthScale = 1.0;
		let ang = this.id + myRandomAB(0,TWO_PI); 
	  	const sq2 = Math.sqrt(2.0);
		let myParticles = this.mom.myParticles;
		let nMaskPoints = this.mom.nMaskPoints;

		
		// print(this.nestedLevel + " addNewStructure = " + whichType + " " + this.myStructures.length); 
		// }
  
		switch (this.type) {

			case STRUCTURE_TYPE_OFFSETS: 
				break; // Do nothing.

			case STRUCTURE_TYPE_MEMBRANE:
				// Initialize: membrane using the mask points
				// First, Compute average separation between mask points
				if (n > 0){
					let perimeter = 0; 
					for (let c=0; c<nMaskPoints; c++){
						let pi = myParticles[(c+0)%nMaskPoints];
						let pj = myParticles[(c+1)%nMaskPoints];
						perimeter += dist(pi.p.x, pi.p.y, pj.p.x, pj.p.y);
					} 
					let avgSegLength = perimeter / nMaskPoints;

					// Add points for the first loop
					for (let c=0; c<nMaskPoints; c++){
						let i=(c+0)%nMaskPoints;
						myParticles[i].bIsABoundarySite = true;
						myParticles[i].isPartOfStructure = this.id;
						myParticles[i].bFixed = true;
						this.particleIndices.push(i);
					}
					let nLoops = this.particleIndices.length / nMaskPoints;
					let loopPerimeterReductionFactor = this.PROPERTY_A; 
					let L = avgSegLength * Math.sqrt(3.0)/2.0 * Math.pow(loopPerimeterReductionFactor, nLoops);
					let loopSpringLooseningFactor = 0.97; //1.00; 
					let membraneK = SPRING_K * Math.pow(loopSpringLooseningFactor, nLoops); 

					// Add particles for the next loop, and connect with rungs
					for (let c=0; c<nMaskPoints; c++){
						let i=(c+0)%nMaskPoints;
						let j=(c+1)%nMaskPoints;
						let pi = myParticles[i];
						let pj = myParticles[j];
					
						let dx = pj.p.x - pi.p.x;
						let dy = pj.p.y - pi.p.y;
						let dh = Math.sqrt(dx*dx + dy*dy); 
						let px = pi.p.x - dy/dh * L;
						let py = pi.p.y + dx/dh * L;
						px += 0.5 * dx; // offset for equilateral-triangle truss
						py += 0.5 * dy;
						this.addInitialParticleAtLocation(px, py);
						let newPindex = myParticles.length -1;

						let mKa = membraneK * myRandomAB(0.95, 1.05); 
						let mKb = membraneK * myRandomAB(0.95, 1.05); 
						let aSpring;
						aSpring = new Spring(myParticles);
						aSpring.setParticleIndicesAndRestLength(i,newPindex, L, mKa); // rung
						this.springs.push(aSpring);
						aSpring = new Spring(myParticles);
						aSpring.setParticleIndicesAndRestLength(j,newPindex, L, mKb); // rung
						this.springs.push(aSpring);
					}
					// Add rim springs around new loop
					for (let c=0; c<nMaskPoints; c++){
						let i = nMaskPoints + (c+0)%nMaskPoints;
						let j = nMaskPoints + (c+1)%nMaskPoints;
						let ii = this.particleIndices[i];
						let ij = this.particleIndices[j];
						let aSpring = new Spring(myParticles);
						let mKc = membraneK * myRandomAB(0.95, 1.05); 
						aSpring.setParticleIndicesAndRestLength(ii,ij, L, mKc); // rim
						this.springs.push(aSpring);
					}
					// Add additional rings as requested by argument to function
					if (this.STYLE_ID == 3){
						if (n%2 == 1){ 
							if (n > 6){
								n--;
							} else {
								n++;
							} 
						}
					}
					for (let i=0; i<(n-1); i++){
						this.addSegment(); 
					}
				}
				break;
			
			//--------------------
			case STRUCTURE_TYPE_DASH:
				{
					// Initialize: A single spring connecting a pair of particles.
					let rl = 1.0; //myRandomAB(0.95, 1.05); 
					let px = cx + Math.cos(ang) * rl*this.mom.REST_L;
					let py = cy + Math.sin(ang) * rl*this.mom.REST_L;
					this.addInitialParticleAtLocation(cx, cy);
					this.addInitialParticleAtLocation(px, py);

					let ip = this.particleIndices[0];
					let iq = this.particleIndices[1];
					myParticles[iq].mass *= 0.25; // introduce bias
					let aSpring = new Spring(myParticles);
					aSpring.setParticleIndicesAndRestLength(ip, iq, rl*this.mom.REST_L, SPRING_K);
					this.springs.push(aSpring);
				}
				break;
			
			//--------------------
			case STRUCTURE_TYPE_TREE:
				{
					// Initialize: An accretive structure. 
					// Create the central particle, then the surrounding particles
					this.addInitialParticleAtLocation(cx, cy);
					const r = birthScale * this.mom.REST_L;
					for (let i = 0; i < n; i++) {
						let t = map(i, 0, n, 0, TWO_PI) + ang;
						let px = cx + r * Math.cos(t);
						let py = cy + r * Math.sin(t);
						this.addInitialParticleAtLocation(px, py);
					}
					// Connect central particle to the encircling group of particles 
					let ip = this.particleIndices[0];
					for (let i = 0; i < n; i++) {
						let iq = this.particleIndices[i + 1];
						let aSpring = new Spring(myParticles);
						aSpring.setParticleIndicesAndRestLength(ip, iq, this.mom.REST_L, SPRING_K);
						this.springs.push(aSpring);
					}
				}
				break;

			//--------------------
			case STRUCTURE_TYPE_STAR:
				{
					// Initialize: A star shape
					// Create the central particle, then the surrounding particles
					this.addInitialParticleAtLocation(cx, cy);
					const r = birthScale * this.mom.REST_L;
					for (let i = 0; i < n; i++) {
						let t = (i/n)*TWO_PI + ang;
						let px = cx + r * Math.cos(t);
						let py = cy + r * Math.sin(t);
						this.addInitialParticleAtLocation(px, py);
					}
					// Connect central particle to the encircling group of particles 
					let ip = this.particleIndices[0];
					for (let i = 0; i < n; i++) {
						let iq = this.particleIndices[i + 1];
						let aSpring = new Spring(myParticles);
						aSpring.setParticleIndicesAndRestLength(ip, iq, this.mom.REST_L, SPRING_K);
						this.springs.push(aSpring);
					}
					for (let i=0; i<m; i++){
						this.addSegment();
					}
				}
				break;
		
			//--------------------
			case STRUCTURE_TYPE_BALL:
				{
					// Initialize: A star shape
					// Central particle, spokes, outer rim.
					this.addInitialParticleAtLocation(cx, cy); // center
					const r = birthScale * this.mom.REST_L * m;

					let eccentricity = this.PROPERTY_A;
					let rx = r * (2.0/(1.0 + (1.0/eccentricity)));
					let ry = r * (2.0/(1.0 + (1.0/eccentricity)))/eccentricity;
					let offcenter = this.PROPERTY_B; 

					for (let i = 0; i < n; i++) {
						let t = (i/n)*TWO_PI;
						let f = 1.0 + offcenter*Math.cos(t + radians(offcenter*90)); 
						let px = cx + f * rx * Math.cos(t);
						let py = cy + f * ry * Math.sin(t);
						this.addInitialParticleAtLocation(px, py); // spokes
					}
					let ip = this.particleIndices[0];
					for (let i = 0; i < n; i++) {
						let t = (i/n)*TWO_PI;
						let f = 1.0 + offcenter*Math.cos(t + radians(offcenter*90)); 
						let ex = f * rx * Math.cos(t);
						let ey = f * ry * Math.sin(t);
						let er = Math.sqrt (ex*ex + ey*ey); 

						let iq = this.particleIndices[i + 1];
						let aSpring = new Spring(myParticles);
						aSpring.setParticleIndicesAndRestLength(ip, iq, er, SPRING_K);
						this.springs.push(aSpring); // spoke springs
					}
					// Rim springs
					for (let i = 0; i < n; i++) {
						let iq =  this.particleIndices[ (i%n)     + 1];
						let iqq = this.particleIndices[ ((i+1)%n) + 1];
						let dx = myParticles[iq].p.x - myParticles[iqq].p.x;
						let dy = myParticles[iq].p.y - myParticles[iqq].p.y;
						let dh = Math.sqrt(dx*dx + dy*dy); 

						let aSpring = new Spring(myParticles);
						aSpring.setParticleIndicesAndRestLength(iq, iqq, dh, SPRING_K);
						this.springs.push(aSpring); // rim springs
					}
					let bAddAdditionalSpringsToBalls = true;
					if (bAddAdditionalSpringsToBalls){ // make extra-tough balls
						for (let i = 0; i < n; i++) {
							let iq = this.particleIndices[(i+1)];
							let iqq = this.particleIndices[(i+2)%n + 1];

							let dx = myParticles[iq].p.x - myParticles[iqq].p.x;
							let dy = myParticles[iq].p.y - myParticles[iqq].p.y;
							let dh = Math.sqrt(dx*dx + dy*dy);

							let aSpring = new Spring(myParticles);
							aSpring.setParticleIndicesAndRestLength(iq, iqq, dh, SPRING_K * 0.20);
							this.springs.push(aSpring); // rim springs
						}
					}
				}
				break;

			//--------------------
			case STRUCTURE_TYPE_LINE:
				{
					// Initialize: Create a string of particles 
					if (m != 0) { ang = m; }
					for (let i = 0; i < n; i++) {
						let t = map(i, 0, n-1, -1, 1);
						let px = cx + birthScale * t * Math.cos(ang) * this.mom.REST_L;
						let py = cy + birthScale * t * Math.sin(ang) * this.mom.REST_L + 0.1*myRandomAB(-1, 1);
						if (i == Math.floor(n/2)){ // kink the middle point
							px += 0.5*myRandomAB(-1, 1);
							py += 0.5*myRandomAB(-1, 1);
						}
						this.addInitialParticleAtLocation(px, py);
					}
					for (let i = 0; i < (n-1); i++) {
						let ip = this.particleIndices[i];
						let iq = this.particleIndices[i+1];
						let aSpring = new Spring(myParticles);
						aSpring.setParticleIndicesAndRestLength(ip, iq, this.mom.REST_L, SPRING_K);
						this.springs.push(aSpring);
					}
				}
				break;
		  
			//--------------------
			case STRUCTURE_TYPE_LOOP:
				{
					// Initialize: Create a loop of particles 
					const r = (birthScale * (this.mom.REST_L * n)) / TWO_PI;
					for (let i = 0; i < n; i++) {
						let t = map(i, 0, n, 0, TWO_PI) + ang;
						let px = cx + r * Math.cos(t);
						let py = cy + r * Math.sin(t);
						this.addInitialParticleAtLocation(px, py);
					}
					for (let i = 0; i < n; i++) {
						let ip = this.particleIndices[i];
						let iq = this.particleIndices[(i + 1) % n];
						let aSpring = new Spring(myParticles);
						aSpring.setParticleIndicesAndRestLength(ip, iq, this.mom.REST_L, SPRING_K);
						this.springs.push(aSpring);
					}
				}
				break;
	  
			//--------------------
			case STRUCTURE_TYPE_TRUSS:
				{
					// Initialize: Create a linear truss
					let angg = radians(myRandomAB(-30,30)) + ((myRandom01() < 0.5) ? PI : 0); 
					if (m){ angg = m; }

					const si = Math.sin(angg);
					const co = Math.cos(angg);
					for (let i = 0; i < n; i++) {
						let t = map(i, 0, n-1, - ~~(n/2), ~~(n/2));
						let px = cx + birthScale * t * this.mom.REST_L;
						let py = cy - birthScale * this.mom.REST_L*0.5;
						let qx = cx + birthScale * t * this.mom.REST_L;
						let qy = cy + birthScale * this.mom.REST_L*0.5;

						// Rotate truss randomly around its center
						let mx = (co * (px - cx)) + (si * (py - cy)) + cx;
						let my = (co * (py - cy)) - (si * (px - cx)) + cy;
						let nx = (co * (qx - cx)) + (si * (qy - cy)) + cx;
						let ny = (co * (qy - cy)) - (si * (qx - cx)) + cy;

						this.addInitialParticleAtLocation(mx, my);
						this.addInitialParticleAtLocation(nx, ny);
					}
					// Add springs 
					for (let i = 0; i < n-1; i++) {
						let ip = this.particleIndices[(i*2)  ];
						let iu = this.particleIndices[(i*2)+1];
						let iq = this.particleIndices[(i+1)*2];
						let iv = this.particleIndices[(i+1)*2+1];
						
						const pairs = [[ip,iu],[ip,iq],[iu,iv],[ip,iv],[iq,iu]];
						const rlsc = [1, 1, 1, sq2, sq2]; 
						for (let j=0; j<pairs.length; j++){
							let aSpring = new Spring(myParticles); 
							let ia = pairs[j][0]; 
							let ib = pairs[j][1];
							aSpring.setParticleIndicesAndRestLength(ia, ib, this.mom.REST_L*rlsc[j], SPRING_K);
							this.springs.push(aSpring);
						}
						if (i == (n-2)){ // finial spring
							let aSpringF = new Spring(myParticles);
							aSpringF.setParticleIndicesAndRestLength(iq, iv, this.mom.REST_L, SPRING_K);
							this.springs.push(aSpringF);
						}
					}  
				}
				break;

			//--------------------
			case STRUCTURE_TYPE_CENTI:
				{
					// Initialize: Truss with hairs
					const CENTI_L = this.mom.REST_L * 0.9; 
					if (n >= 10){
						let rr = 0.75 * (n * CENTI_L)/TWO_PI;
						let baseAng = myRandomAB(0,360); 
						for (let i = 0; i < n; i++) {
							let ph = radians(baseAng + map(i, 0,n-1, 20, 340));
							let ox = cx + birthScale * (rr-CENTI_L*0.9)*cos(ph);
							let oy = cy + birthScale * (rr-CENTI_L*0.9)*sin(ph);
							let px = cx + birthScale * (rr-CENTI_L*0.4)*cos(ph);
							let py = cy + birthScale * (rr-CENTI_L*0.4)*sin(ph);
							let qx = cx + birthScale * (rr+CENTI_L*0.4)*cos(ph); 
							let qy = cy + birthScale * (rr+CENTI_L*0.4)*sin(ph);
							let rx = cx + birthScale * (rr+CENTI_L*0.9)*cos(ph); 
							let ry = cy + birthScale * (rr+CENTI_L*0.9)*sin(ph);

							this.addInitialParticleAtLocation(px, py);
							this.addInitialParticleAtLocation(qx, qy);
							if (i != (n-1)){ 
								this.addInitialParticleAtLocation(ox, oy);
								this.addInitialParticleAtLocation(rx, ry);
							}
						}
					} else {
						for (let i = 0; i < n; i++) {
							let t = map(i, 0, n-1, - ~~(n/2), ~~(n/2));
							let px = cx + birthScale * t * CENTI_L;
							let qx = cx + birthScale * t * CENTI_L;
							let oy = cy - birthScale*CENTI_L*1.5;
							let py = cy - birthScale*CENTI_L*0.5;
							let qy = cy + birthScale*CENTI_L*0.5;
							let ry = cy + birthScale*CENTI_L*1.5;

							this.addInitialParticleAtLocation(px, py);
							this.addInitialParticleAtLocation(qx, qy);
							if (i != (n-1)){ 
								this.addInitialParticleAtLocation(px, oy);
								this.addInitialParticleAtLocation(qx, ry);
							}
						}
					}

					// small special case: disentangle 2 unused points
					myParticles[ this.particleIndices[2] ].isPartOfStructure = -1;
					myParticles[ this.particleIndices[3] ].isPartOfStructure = -1;
					let i2 = this.particleIndices[2];
					let i3 = this.particleIndices[3];
					myParticles[i2].set(BASE_DIM/2, BASE_DIM/2); 
					myParticles[i3].set(BASE_DIM/2, BASE_DIM/2 + myRandomA(1)); 

					// Add all the springs
					for (let i = 0; i < n-1; i++) {
						let phi = map(i, 0, n-1, 0, PI); 
						let L = 0.5 + 1.0*Math.sin(phi);
						let hairL = L * this.PROPERTY_A;

						let ip = this.particleIndices[(i+0)*4   ];
						let iu = this.particleIndices[(i+0)*4+1 ];
						let iq = this.particleIndices[(i+1)*4   ];
						let iv = this.particleIndices[(i+1)*4+1 ];
						let io = this.particleIndices[(i+0)*4+2 ];
						let ir = this.particleIndices[(i+0)*4+3 ];
						
						const pairs = [[ip,iu],[ip,iq],[iu,iv],[ip,iv],[iq,iu], [io,ip],[iu,ir] ];
						const rlsc = [L, 1, 1, sq2, sq2, hairL,hairL]; 
						let PL = (i>0) ? pairs.length : pairs.length-2;
						for (let j=0; j<PL; j++){
							let aSpring = new Spring(myParticles); 
							let ia = pairs[j][0]; 
							let ib = pairs[j][1];
							aSpring.setParticleIndicesAndRestLength(ia, ib, CENTI_L*rlsc[j], SPRING_K);
							this.springs.push(aSpring);
						}
						if (i == (n-2)){ // finial spring
							let aSpringF = new Spring(myParticles);
							aSpringF.setParticleIndicesAndRestLength(iq, iv, 0.5*CENTI_L*rlsc[0], SPRING_K);
							this.springs.push(aSpringF);
						}
					} 
				}
				break;

		//--------------------
		case STRUCTURE_TYPE_WHEEL:
			{
				// Initialize: Create a looping truss
				let r = (birthScale * (this.mom.REST_L * n)) / TWO_PI;
				for (let i = 0; i < n; i++) {
					let t = map(i, 0, n, 0, TWO_PI) + ang;
					let px = cx + r * Math.cos(t);
					let py = cy + r * Math.sin(t);
					let qx = cx + (r + birthScale*this.mom.REST_L) * Math.cos(t);
					let qy = cy + (r + birthScale*this.mom.REST_L) * Math.sin(t);
					this.addInitialParticleAtLocation(px, py);
					this.addInitialParticleAtLocation(qx, qy);
				} 
				// Create the springs of the truss
				noiseDetail(3, 0.3);
				const noffset = this.id;
				const nAvg = 0.35; // empiric
				const nMin = -0.33;
				const nMax =  0.33; 
				const restLengthNoise = 0.25;
				for (let i = 0; i < n; i++) {
					let ip = this.particleIndices[((i+0)*2+0)%(n*2)];
					let iu = this.particleIndices[((i+0)*2+1)%(n*2)];
					let iq = this.particleIndices[((i+1)*2+0)%(n*2)];
					let iv = this.particleIndices[((i+1)*2+1)%(n*2)];

					const t = i/n * TWO_PI;
					const pairs = [[ip,iu],[ip,iq],[iu,iv],[ip,iv],[iq,iu]];
					const rlsc = [1,1,1, sq2, sq2]; 
					for (let j=0; j<pairs.length; j++){
						let aSpring = new Spring(myParticles); 
						let ia = pairs[j][0]; 
						let ib = pairs[j][1];

						let nx = noffset + 0.7 * cos(t);
						let ny = noffset + 0.7 * sin(t);
						let F = 1.0 + restLengthNoise * map((noise(nx, ny) - nAvg), nMin,nMax, -1,1, true);
						aSpring.setParticleIndicesAndRestLength(ia, ib, F* this.mom.REST_L*rlsc[j], SPRING_K);
						this.springs.push(aSpring);
					}
				}
			}
			break;

		//--------------------
		case STRUCTURE_TYPE_URCHIN:
			{
				// Initialize: A looping truss with hair
				let hairDir = (myRandom01() < 0.5) ? -1:1;
				let r = (birthScale * (this.mom.REST_L * n)) / TWO_PI; // r based on circumf
				let rx, ry;
				for (let i = 0; i < n; i++) {

					let dr = birthScale*this.mom.REST_L;
					let t = map(i, 0, n, 0, TWO_PI) + ang;
					let px = cx + (r + 0*dr) * Math.cos(t);
					let py = cy + (r + 0*dr) * Math.sin(t);
					let qx = cx + (r + 1*dr) * Math.cos(t);
					let qy = cy + (r + 1*dr) * Math.sin(t);
					this.addInitialParticleAtLocation(px, py);
					this.addInitialParticleAtLocation(qx, qy);

					let rr = r + 1*dr;
					for (let j=0; j<m; j++){
						rx = cx + rr * Math.cos(t);
						ry = cy + rr * Math.sin(t);
						this.addInitialParticleAtLocation(rx, ry);
						rr += dr; dr *= 0.8;  
						t += hairDir*radians(10); 
					}
				} 
				// Create the springs of the truss
				let M = (m+2);
				for (let i = 0; i < n; i++) {
					let ip = this.particleIndices[((i+0)*M+0)%(n*M)];
					let iu = this.particleIndices[((i+0)*M+1)%(n*M)];
					let iq = this.particleIndices[((i+1)*M+0)%(n*M)];
					let iv = this.particleIndices[((i+1)*M+1)%(n*M)];
					let pairs = [[ip,iu],[ip,iq],[iu,iv],[ip,iv],[iq,iu]];
					let rlsc = [1,1,1, sq2, sq2]; 
					for (let j=0; j<pairs.length; j++){
						let aSpring = new Spring(myParticles); 
						let ia = pairs[j][0]; 
						let ib = pairs[j][1];
						aSpring.setParticleIndicesAndRestLength(ia, ib, this.mom.REST_L*rlsc[j], SPRING_K);
						this.springs.push(aSpring);
					}
					let spineRestL = this.mom.REST_L; // spine time
					for (let j=0; j<m; j++){
						let aSpring = new Spring(myParticles); 
						let ia = this.particleIndices[((i+0)*M+(j+1))%(n*M)]; 
						let ib = this.particleIndices[((i+0)*M+(j+2))%(n*M)];
						aSpring.setParticleIndicesAndRestLength(ia, ib, spineRestL, SPRING_K);
						this.springs.push(aSpring);
						spineRestL *= 0.9; // each hair segment is shorter than prev
					} 
				}
				this.purgeInteriorParticles();
			}
			break;
	  	}
	}

	//----------------------------------------------
	growStructureOnRequest(){
		let delta = 1; 
		switch (this.type) { 
			case STRUCTURE_TYPE_DASH:    
			case STRUCTURE_TYPE_URCHIN:  
			case STRUCTURE_TYPE_CENTI: 
			case STRUCTURE_TYPE_BALL:    
			case STRUCTURE_TYPE_MEMBRANE:
			case STRUCTURE_TYPE_OFFSETS: 
				break; // not growable.
			
			case STRUCTURE_TYPE_LINE: 
				this.bUseGreedyGrowth = false; 
				this.growthSizeLimit = this.particleIndices.length; 
				delta = 2; 
				break;
			case STRUCTURE_TYPE_LOOP:
				delta = 4; 
				break;
			case STRUCTURE_TYPE_WHEEL: 
				delta = 8;
				break;
			case STRUCTURE_TYPE_TREE: 
				delta = 8;
				break;
			case STRUCTURE_TYPE_STAR:
				delta = 1; 
				break;
			case STRUCTURE_TYPE_TRUSS: 
				delta = (this.growthSizeLimit < 6) ? 1 : 2;
				break;
		}

		this.growthSizeLimit += delta;
		this.bGrowing = true; 
	}


	//----------------------------------------------
	growStructureIfGrowing(){
		let theStyleSheet = this.mom.theStyleSheet;

		// Update structures on an alternating schedule
		const growthUpdateCycleLength = theStyleSheet.growthUpdateCycleLength; 
		const currentStep = this.mom.simulationFrameCount % growthUpdateCycleLength; 
		if (this.id%growthUpdateCycleLength == currentStep){
	
			// For greedy-adding structures: if you haven't grown in a while, stop growing. 
			if (this.bUseGreedyGrowth){
				let framesSinceLastGreedyAdd = this.mom.simulationFrameCount - this.lastAddSegmentTime;
				if (framesSinceLastGreedyAdd > theStyleSheet.greedyAddTimeout){
					this.bGrowing = false;
				}
			}

			if (this.bGrowing){
				switch (this.type) { 
					case STRUCTURE_TYPE_DASH:    /* 2 */
					case STRUCTURE_TYPE_URCHIN:  /* 7 */
					case STRUCTURE_TYPE_CENTI:   /* 8 */
					case STRUCTURE_TYPE_BALL:    /* 9 */
					case STRUCTURE_TYPE_MEMBRANE:/* 10 */
					case STRUCTURE_TYPE_OFFSETS: /* 11 */
						break; // not applicable for these types
					
					case STRUCTURE_TYPE_LINE: /* 0 */
					case STRUCTURE_TYPE_LOOP: /* 1 */
					case STRUCTURE_TYPE_WHEEL: /* 4 */
					case STRUCTURE_TYPE_TREE: /* 6 */
						let nParticles = this.particleIndices.length;
						if (nParticles < this.growthSizeLimit){
							this.addSegment();
						} else {
							this.bGrowing = false;
						}
						break;

					case STRUCTURE_TYPE_STAR: /* 5 */
						let limbSize = this.PROPERTY_B;
						if (limbSize < this.growthSizeLimit){ 
							this.addSegment();
						} else {
							this.bGrowing = false;
						}
						break;

					case STRUCTURE_TYPE_TRUSS: /* 3 */
						let nSegments = (this.particleIndices.length)/2;
						if (nSegments < this.growthSizeLimit){ 
							this.addSegmentClosestToLocation(BASE_DIM/2,BASE_DIM/2);
						} else {
							this.bGrowing = false;
						}
						break;
				}
			}
		}
	}

	//----------------------------------------------
	addSegment(insertIndex = 0){
	  const nParticles = this.particleIndices.length;
	  const sqrt2 = Math.sqrt(2.0); 
	  let theStyleSheet = this.mom.theStyleSheet; 
	  let myParticles = this.mom.myParticles;
	  let nMaskPoints = this.mom.nMaskPoints;
	  let simulationFrameCount = this.mom.simulationFrameCount;

	  switch (this.type) {

		case STRUCTURE_TYPE_OFFSETS: /* has nothing to grow */
		case STRUCTURE_TYPE_DASH: /* can't grow by design */
		case STRUCTURE_TYPE_CENTI: /* too much work to grow it */
		case STRUCTURE_TYPE_URCHIN: /* too much work to grow it */
			// These structures can't grow
			break; 

		case STRUCTURE_TYPE_MEMBRANE:
			{ 	// Add another inner loop.
				let perimeter = 0; 
				for (let c=0; c<nMaskPoints; c++){
					let pi = myParticles[(c+0)%nMaskPoints];
					let pj = myParticles[(c+1)%nMaskPoints];
					perimeter += dist(pi.p.x, pi.p.y, pj.p.x, pj.p.y);
				}
				let avgSegLength = perimeter / nMaskPoints;
				let nLoops = this.particleIndices.length / nMaskPoints;
				let loopPerimeterReductionFactor = this.PROPERTY_A; // ~0.95 - 1.00
				let L = 1.0 * avgSegLength * Math.sqrt(3.0)/2.0 * Math.pow(loopPerimeterReductionFactor, nLoops);

				let loopSpringLooseningFactor = 0.97; //1.00; 
				let membraneK = SPRING_K * Math.pow(loopSpringLooseningFactor, nLoops); 

				let cPrevLoopStart = nParticles - nMaskPoints;
				for (let c=0; c<nMaskPoints; c++){
					let i = cPrevLoopStart + (c+0)%nMaskPoints;
					let j = cPrevLoopStart + (c+1)%nMaskPoints;
					let ii = this.particleIndices[i];
					let ij = this.particleIndices[j];
					let pi = myParticles[ii];
					let pj = myParticles[ij];

					let dx = pj.p.x - pi.p.x;
					let dy = pj.p.y - pi.p.y;
					let dh = Math.sqrt(dx*dx + dy*dy); 
					let px = pi.p.x - dy/dh * L;
					let py = pi.p.y + dx/dh * L;
					px += 0.5 * dx;
					py += 0.5 * dy;

					this.addInitialParticleAtLocation(px, py);
				}

				let aSpring;
				let cCurrLoopStart = cPrevLoopStart + nMaskPoints; 
				let angOffset = this.PROPERTY_C + this.STYLE_ID; 
				let membrane3pointSkip = theStyleSheet.membrane3pointSkip;
				let membraneInnerWiggleAmp = theStyleSheet.membraneInnerWiggleAmp;
				let membraneInnerWiggleFrq = theStyleSheet.membraneInnerWiggleFrq;
				if ((this.STYLE_ID == 3) || (this.STYLE_ID == 10) || (this.STYLE_ID == 2)){
					membraneInnerWiggleAmp = 0; 
				}
		
				for (let c = 0; c<nMaskPoints; c++){
					let i = cCurrLoopStart + (c+0)%nMaskPoints; // me
					let j = cCurrLoopStart + (c+1)%nMaskPoints; // the one ahead of me
					let k = cPrevLoopStart + (c+0)%nMaskPoints; // my mate
					let l = cPrevLoopStart + (c+1)%nMaskPoints; // my mate

					let ii = this.particleIndices[i];
					let ij = this.particleIndices[j];
					let ik = this.particleIndices[k];
					let il = this.particleIndices[l];

					let t = map(c, 0, nMaskPoints, 0, TWO_PI);
					let wiggle = membraneInnerWiggleAmp * Math.sin(membraneInnerWiggleFrq * t);
					let Ls = L * (1.0 + wiggle); 

					aSpring = new Spring(myParticles);
					aSpring.setParticleIndicesAndRestLength(ii,ij, Ls, membraneK);  // rim
					this.springs.push(aSpring);
					aSpring = new Spring(myParticles);

					let LL = ((this.STYLE_ID == 3) && (c%membrane3pointSkip == 0)) ? Ls*0.5 : Ls; // dimples based on style
					let tFactor = 1.0 + 0.10 * Math.cos(t - angOffset); 
					LL *= tFactor; 

					aSpring.setParticleIndicesAndRestLength(ii,ik, LL, membraneK);  // rung
					this.springs.push(aSpring);
					aSpring = new Spring(myParticles);
					aSpring.setParticleIndicesAndRestLength(ii,il, LL, membraneK);  // rung
					this.springs.push(aSpring);
				}
				this.lastAddSegmentTime = simulationFrameCount;
			}
			break;

		case STRUCTURE_TYPE_TREE:
			// Add segment.
			if (nParticles < this.growthSizeLimit){

				// Select a random particle (that's already on my body) as a new attachment point.
				const maxSpringsPerParticle = theStyleSheet.maxSpringsPerParticle; 
				let bFoundAvailableParticle = false; 
				let availableParticleIndex = -1; 
				let availableParticleRestLen = 0; 
				let nTests = 0; 
				while ((!bFoundAvailableParticle) && (nTests < 100)){
					let ri = myRandomInt(1, nParticles-1); 
					let randIndex = this.particleIndices[ri];

					// Test to make sure the particle (with index randIndex) 
					// isn't already involved in maxSpringsPerParticle springs. 
					nTests++; 
					let countOfSpringsOnRandParticle = 0; 
					let restLengthOfLongestSpringOnParticle = 0; 
					const nS = this.springs.length;
					for (let i=0; i<nS; i++){
						let sip = this.springs[i].getIP(); 
						let siq = this.springs[i].getIQ();
						if ((randIndex == sip) || (randIndex == siq)){
							countOfSpringsOnRandParticle++;

							// Stash the length of the longest spring it's attached to
							let len = this.springs[i].getRestLength();
							if (len > restLengthOfLongestSpringOnParticle){
								restLengthOfLongestSpringOnParticle = len;
							}
						}
					}
					if (countOfSpringsOnRandParticle < maxSpringsPerParticle){
						bFoundAvailableParticle = true;
						availableParticleIndex = ri;//randIndex;
						availableParticleRestLen = restLengthOfLongestSpringOnParticle;
					}
				}

				if (!this.bUseGreedyGrowth){
					// Factory mode: CREATE a new particle nearby, and attach to it.
					if (availableParticleIndex >= 0){

						// Find center index. We'll be making new particles facing away from it.
						let centerIndex = this.particleIndices[0];
						let cx = myParticles[centerIndex].p.x;
						let cy = myParticles[centerIndex].p.y; 

						let ip = this.particleIndices[availableParticleIndex]; 
						let px = myParticles[ip].p.x; 
						let py = myParticles[ip].p.y; 

						let dx = px - cx; 
						let dy = py - cy; 
						let dh = Math.sqrt(dx*dx + dy*dy);
						if (dh > 0){
							let L = availableParticleRestLen * this.PROPERTY_A; // branch size dimimish factor: e.g. 90% of length of prev
							dx = dx/dh * L;
							dy = dy/dh * L;
							let qx = px + 0.2*dx; // start small, grow
							let qy = py + 0.2*dy;

							this.addInitialParticleAtLocation(qx, qy);
							let iq = this.particleIndices[this.particleIndices.length -1];
							let aSpring = new Spring(myParticles);
							aSpring.setParticleIndicesAndRestLength(ip, iq, L, SPRING_K);
							this.springs.push(aSpring);
							this.lastAddSegmentTime = simulationFrameCount;
						}
					}
				} else {
					// GREEDY: Consume nearby unused particles, if any. 
					// TODO: if it hasn't grown in a while, make it stop growing. 
					if (availableParticleIndex >= 0){
						let ip = this.particleIndices[availableParticleIndex]; 
						let px = myParticles[ip].p.x; 
						let py = myParticles[ip].p.y; 

						let bFound = false;
						const searchR = this.mom.REST_L * 2.0; 
						let L = availableParticleRestLen * this.PROPERTY_A; // branch size dimimish factor: e.g. 90% of length of prev
						for (let i=0; i<myParticles.length; i++){// for each particle

							if (!bFound && 
								(!myParticles[i].bIsABoundarySite) && 
								(myParticles[i].isPartOfStructure == -1)){ // if it's not part of something
								let qx = myParticles[i].p.x;
								let qy = myParticles[i].p.y;

								let dx = px - qx; 
								let dy = py - qy; 
								let dh = Math.sqrt(dx*dx + dy*dy);
								if (dh < searchR){ // if it's within our search radius
									
									this.particleIndices.push(i);
									myParticles[i].setIsPartOfStructure (this.id);
									myParticles[i].mass = this.MASS_MULTIPLIER;

									let aSpring = new Spring(myParticles);
									aSpring.setParticleIndicesAndRestLength(ip, i, L, SPRING_K);
									this.springs.push(aSpring);
									bFound = true; 
									this.lastAddSegmentTime = simulationFrameCount;
								}
							}
						}
					}
				}
			}
			break;

		//----------------------
		case STRUCTURE_TYPE_STAR:
			{ // Add segment.
				let centerIndex = this.particleIndices[0];
				let cx = myParticles[centerIndex].p.x;
				let cy = myParticles[centerIndex].p.y; 
				let nSpokes = this.PROPERTY_A; 
				let nLayers = this.PROPERTY_B;
			
				// For each of the terminal (nSpokes) particles,
				const starRestL = this.mom.REST_L * Math.pow(0.875, nLayers);
				for (let i=(nParticles-nSpokes); i<nParticles; i++){
					let ip = this.particleIndices[i]; 
					let px = myParticles[ip].p.x; 
					let py = myParticles[ip].p.y; 

					let dx = px - cx; 
					let dy = py - cy; 
					let dh = Math.sqrt(dx*dx + dy*dy);
					dx = dx/dh * starRestL;
					dy = dy/dh * starRestL;
					let qx = px + dx;
					let qy = py + dy;

					// connect a new particle to each, pointing away from the center index
					this.addInitialParticleAtLocation(qx, qy);
					let iq = this.particleIndices[this.particleIndices.length -1];
					let aSpring = new Spring(myParticles);
					aSpring.setParticleIndicesAndRestLength(ip, iq, starRestL, SPRING_K);
					this.springs.push(aSpring);
					this.lastAddSegmentTime = simulationFrameCount;
				}
				this.PROPERTY_B++;
			}
			break;
		  
		//----------------------
		case STRUCTURE_TYPE_LOOP:
		case STRUCTURE_TYPE_LINE:
			// Add segment.
			if (nParticles < this.growthSizeLimit){
				// -- insert at place closest to an unclaimed particle (for greedy), OR
				// -- insert at point of highest or lowest curvature

				const areaApprox = PI * (maskR * BASE_DIM) * (maskR * BASE_DIM);
				const areaPerPoint = areaApprox / this.mom.nInteriorPoints;
				const predictedPointSeparation = Math.sqrt(3.0)*Math.sqrt(areaPerPoint/(3.0*Math.sqrt(3.0)/2.0)); 
				const searchR = predictedPointSeparation * 1.15; 
				const searchR2 = searchR*searchR; 

				if (this.bUseGreedyGrowth){
					// Add the closest unclaimed particle
					let distance2ToClosestParticle = Number.POSITIVE_INFINITY;
					let indexOfClosestParticle = 0;
					let indexForInsertion = 0; 
					for (let j=0; j<nParticles; j++){ // for each particle on my boundary
						let jindex = this.particleIndices[j];
						let jp = myParticles[jindex];
						for (let i=nMaskPoints; i<myParticles.length; i++){ // compare it to every particle in the world
							let ip = myParticles[i];
							if ((!ip.bIsABoundarySite) && 
								(ip.isPartOfStructure == -1)){ // if it's not part of something
								let dx = jp.p.x - ip.p.x;
								let dy = jp.p.y - ip.p.y;
								let dh2 = (dx*dx + dy*dy); 
								if (dh2 < searchR2){
									if (dh2 < distance2ToClosestParticle){
										distance2ToClosestParticle = dh2;
										indexOfClosestParticle = i;
										indexForInsertion = j;
									}
								}
							}
						}
					}
					if (indexOfClosestParticle > 0){
						this.insertExistingParticleIntoSpringChainAtIndex(indexForInsertion, indexOfClosestParticle);
						this.lastAddSegmentTime = simulationFrameCount;
					}

				} else { // Non-greedy
					let bGetHighestCurvature = true; // vs. lowest 
					if (this.type == STRUCTURE_TYPE_LOOP){
						bGetHighestCurvature = theStyleSheet.bLoopsGrowAtHighestCurvature;
					} else if (this.type == STRUCTURE_TYPE_LINE){
						bGetHighestCurvature = theStyleSheet.bLinesGrowAtHighestCurvature;
					}
					let indexOfHighestCurvature = this.getIndexOfHighestCurvature(bGetHighestCurvature); 
					insertIndex = max(0, indexOfHighestCurvature); // handle error if index = -1!
					this.insertNewParticleIntoLoopStructureAtIndex(insertIndex); 
					this.lastAddSegmentTime = simulationFrameCount;
				}
			}
			break;
			
		//----------------------
		case STRUCTURE_TYPE_WHEEL:
			// Add segment.
			if (nParticles < this.growthSizeLimit){

				// clobber the insert index that was provided in the argument. 
				let bGetHighestCurvature = theStyleSheet.bLoopsGrowAtHighestCurvature;
				insertIndex = this.particleIndices[this.getIndexOfHighestCurvature(bGetHighestCurvature)]; 
				insertIndex = (insertIndex + nParticles) % nParticles;
				let ip =  ((insertIndex % 2) == 1) ? (insertIndex-1):insertIndex;
				
				// We will inject a new pair of points between 00-01 and 10-11
				let ii00 = this.particleIndices[(ip + 0)% nParticles];
				let ii01 = this.particleIndices[(ip + 1)% nParticles];
				let ii10 = this.particleIndices[(ip + 2)% nParticles];
				let ii11 = this.particleIndices[(ip + 3)% nParticles];
		
				// Kill 4 springs
				let ski = (ip/2)*5 + 1;
				this.springs.splice(ski, 4);
		
				// Add 2 Particles pA and pB at average of 00-10 and 01-11
				let p00 = myParticles[ii00]; 
				let p01 = myParticles[ii01]; 
				let p10 = myParticles[ii10]; 
				let p11 = myParticles[ii11]; 
				let ax = (p00.p.x + p10.p.x) / 2.0;
				let ay = (p00.p.y + p10.p.y) / 2.0;
				let bx = (p01.p.x + p11.p.x) / 2.0;
				let by = (p01.p.y + p11.p.y) / 2.0;
				let pA = new Particle();
				let pB = new Particle();
				pA.set(ax, ay, this.MASS_MULTIPLIER);
				pB.set(bx, by, this.MASS_MULTIPLIER);
				pA.setIsPartOfStructure(this.id);
				pB.setIsPartOfStructure(this.id);
				pA.setDropoutLikelihood(theStyleSheet.blobDropoutPercent, theStyleSheet.nucleusDropoutPercent);
				pB.setDropoutLikelihood(theStyleSheet.blobDropoutPercent, theStyleSheet.nucleusDropoutPercent);
				myParticles.push(pA); 
				myParticles.push(pB); 
				let ipa = myParticles.length-2;
				let ipb = myParticles.length-1;
				this.particleIndices.splice(ip + 2, 0, ipa);
				this.particleIndices.splice(ip + 3, 0, ipb);
			
				// Add 4 springs (in 00,01,a,b) and 4 springs (in a,b,10,11)
				this.lastAddSegmentTime = simulationFrameCount;
				const pairs = [[ii00,ipa],[ii01,ipb],[ii00,ipb],[ipa,ii01],
							[ipa,ipb],[ipa,ii10],[ipb,ii11],[ipa,ii11],[ii10,ipb]];
				const rlsc = [1, 1, sqrt2, sqrt2, 1, 1, 1, sqrt2, sqrt2]; 
				for (let j=0; j<pairs.length; j++){
					let aSpring = new Spring(myParticles); 
					let ia = pairs[j][0]; 
					let ib = pairs[j][1];
					aSpring.setParticleIndicesAndRestLength(ia, ib, this.mom.REST_L*rlsc[j], SPRING_K);
					this.springs.splice(ski, 0, aSpring);
					ski++;
				}
			}
			break;

		//----------------------
		case STRUCTURE_TYPE_TRUSS:
			// Add segment.
			if ((insertIndex >= 0) && (insertIndex < (nParticles-2))){
				// We inject a new pair of points between 00-01 and 10-11
				let ip =  ((insertIndex % 2) == 1) ? (insertIndex-1):insertIndex;
				let ii00 = this.particleIndices[ip + 0];
				let ii01 = this.particleIndices[ip + 1];
				let ii10 = this.particleIndices[ip + 2];
				let ii11 = this.particleIndices[ip + 3];
			
				// Kill 4 springs
				let ski = (ip/2)*5 + 1;
				this.springs.splice(ski, 4);
				
				// Add 2 Particles pA and pB at average of 00-10 and 01-11
				let p00 = myParticles[ii00]; 
				let p01 = myParticles[ii01]; 
				let p10 = myParticles[ii10]; 
				let p11 = myParticles[ii11]; 
				let ax = (p00.p.x + p10.p.x) / 2.0;
				let ay = (p00.p.y + p10.p.y) / 2.0;
				let bx = (p01.p.x + p11.p.x) / 2.0;
				let by = (p01.p.y + p11.p.y) / 2.0;
				let pA = new Particle();
				let pB = new Particle();
				pA.set(ax, ay, this.MASS_MULTIPLIER);
				pB.set(bx, by, this.MASS_MULTIPLIER);
				pA.setIsPartOfStructure(this.id);
				pB.setIsPartOfStructure(this.id);
				pA.setDropoutLikelihood(theStyleSheet.blobDropoutPercent, theStyleSheet.nucleusDropoutPercent);
				pB.setDropoutLikelihood(theStyleSheet.blobDropoutPercent, theStyleSheet.nucleusDropoutPercent);
				myParticles.push(pA); 
				myParticles.push(pB); 
				let ipa = myParticles.length-2;
				let ipb = myParticles.length-1;
				this.particleIndices.splice(ip + 2, 0, ipa);
				this.particleIndices.splice(ip + 3, 0, ipb);
				
				// Add 4 springs (in 00,01,a,b) and 5 springs (in a,b,10,11)
				this.lastAddSegmentTime = simulationFrameCount;
				const pairs = [[ii00,ipa],[ii01,ipb],[ii00,ipb],[ipa,ii01],
							[ipa,ipb],[ipa,ii10],[ipb,ii11],[ipa,ii11],[ii10,ipb]];
				const rlsc = [1, 1, sqrt2, sqrt2, 1, 1, 1, sqrt2, sqrt2]; 

				let bTaper = theStyleSheet.trussesTaperWhenGrowing; 
				for (let j=0; j<pairs.length; j++){
					let aSpring = new Spring(myParticles); 
					let ia = pairs[j][0]; 
					let ib = pairs[j][1];

					let taper = (bTaper) ? map(nParticles, 10,this.growthSizeLimit, 0.8, 1.2, true) : 1.0;
					aSpring.setParticleIndicesAndRestLength(ia, ib, taper * this.mom.REST_L*rlsc[j], SPRING_K);
					this.springs.splice(ski, 0, aSpring);
					ski++;
				}
  
			} else {
				// ADDS SEGMENT AT FAR END:
				const birthScale = 0.5;
				const ii00 = this.particleIndices[nParticles - 4];
				const ii01 = this.particleIndices[nParticles - 3];
				const ii10 = this.particleIndices[nParticles - 2];
				const ii11 = this.particleIndices[nParticles - 1];
				const p00 = myParticles[ii00]; 
				const p01 = myParticles[ii01]; 
				const p10 = myParticles[ii10]; 
				const p11 = myParticles[ii11]; 
				const pax = p10.p.x + (p10.p.x - p00.p.x)*birthScale; 
				const pay = p10.p.y + (p10.p.y - p00.p.y)*birthScale; 
				const pbx = p11.p.x + (p11.p.x - p01.p.x)*birthScale; 
				const pby = p11.p.y + (p11.p.y - p01.p.y)*birthScale; 
				let PA = new Particle();
				let PB = new Particle();
				PA.set(pax, pay, this.MASS_MULTIPLIER);
				PB.set(pbx, pby, this.MASS_MULTIPLIER);
				PA.setIsPartOfStructure(this.id);
				PB.setIsPartOfStructure(this.id);
				PA.setDropoutLikelihood(theStyleSheet.blobDropoutPercent, theStyleSheet.nucleusDropoutPercent);
				PB.setDropoutLikelihood(theStyleSheet.blobDropoutPercent, theStyleSheet.nucleusDropoutPercent);
				myParticles.push(PA);
				myParticles.push(PB);
				let ipa = myParticles.length-2;
				let ipb = myParticles.length-1;
				this.particleIndices.push(ipa);
				this.particleIndices.push(ipb);
	
				this.lastAddSegmentTime = simulationFrameCount;
				const pairs = [[ii10,ipa],[ii11,ipb],[ii10,ipb],[ipa,ii11],[ipa,ipb]];
				const rlsc = [1, 1, sqrt2, sqrt2, 1];
				for (let j=0; j<pairs.length; j++){
					let aSpring = new Spring(myParticles);
					let ia = pairs[j][0];
					let ib = pairs[j][1];
					aSpring.setParticleIndicesAndRestLength(ia, ib, this.mom.REST_L*rlsc[j], SPRING_K);
					this.springs.push(aSpring);
				}
			}
		  	break;
  
	  	}
	}

	//----------------------------------------------
	addSegmentClosestToLocation(mx, my){
		let particleIndexOfClosest = this.getGlobalIndexOfParticleClosestTo(mx, my);
		if (particleIndexOfClosest >=0){
			let np = this.particleIndices.length;
			for (let i=0; i<np; i++){
				let ip = this.particleIndices[i]; 
				if (ip == particleIndexOfClosest){
					this.addSegment(i); 
					break;
				}
			}
		}
	}

	//----------------------------------------------
	purgeInteriorParticles(){
		if (this.bLoop){
			let myParticles = this.mom.myParticles;
			let nMaskPoints = this.mom.nMaskPoints;

			// Make sure there are no free-floating points inside of me
			for (let i=nMaskPoints; i<myParticles.length; i++){
				let P = myParticles[i];
				if (P.isPartOfStructure == -1){ // if it's not part of something else
					let px = P.p0.x;
					let py = P.p0.y;
					if (this.pointInside (px, py)){
						// shoot it hard towards.. somewhere? the center of the screen
						let dx = px - BASE_DIM/2;
						let dy = py - BASE_DIM/2;
						let dh = Math.sqrt(dx*dx + dy*dy);
						let fx = 50.0 * dx/dh; 
						let fy = 50.0 * dy/dh; 
						myParticles[i].addForce(fx, fy, 1); 
						myParticles[i].addForce(fx, fy, 2); 
					}
				}
			}
		}
	}

	//----------------------------------------------
	applySmoothingForces(whichPass) {
		const N = this.particleIndices.length;
		let theStyleSheet = this.mom.theStyleSheet; 
		let myParticles = this.mom.myParticles;
		let nMaskPoints = this.mom.nMaskPoints;
		let pAsubB;
		let pCsubB;
  
		switch (this.type) {
			case STRUCTURE_TYPE_OFFSETS:
				break; // Not applicable.

			case STRUCTURE_TYPE_DASH:
				{ // rotate dash into alignment with velocity. 
					const i0 = this.particleIndices[0];
					const i1 = this.particleIndices[1];

					let vax = myParticles[i0].v.x;
					let vay = myParticles[i0].v.y;
					let vbx = myParticles[i1].v.x;
					let vby = myParticles[i1].v.y;
					let vx = (vax + vbx)/2; 
					let vy = (vay + vby)/2; 
					let vh = (vx*vx + vy*vy);
					if (vh > 0){
						vh = Math.sqrt(vh); 
						vx /= vh;
						vy /= vh;

						let pax = myParticles[i0].p.x;
						let pay = myParticles[i0].p.y;
						let pbx = myParticles[i1].p.x;
						let pby = myParticles[i1].p.y;
						let dx = (pbx - pax);
						let dy = (pby - pay);
						let dh = (dx*dx + dy*dy);
						if (dh > 0){
							dh = Math.sqrt(dh);
							dx /= dh; 
							dy /= dh; 

							let cross = (vx*dy) - (vy*dx);
							if (Math.abs(cross) > 0.1){
								let fx = 0.2 * cross *    dy; 
								let fy = 0.2 * cross * (0-dx); 
								myParticles[i0].addForce( fx,  fy, whichPass); 
								myParticles[i1].addForce(-fx, -fy, whichPass); 
							}
						}
					}
				}
				break; 

			case STRUCTURE_TYPE_MEMBRANE: // Smoothing
				if (N > 0){
					// vary the mass from outermost loop (lightest) to innermost (heaviest)
					let innermostLoopMass = this.PROPERTY_C;
					let nLoops = N / nMaskPoints;
					let iAccum = 0; 
					for (let whichLoop=0; whichLoop<nLoops; whichLoop++){
						let massForThisLoop = map (whichLoop, 0, nLoops, 1, innermostLoopMass); 
						for (let i=0; i<nMaskPoints; i++){
							let ii = this.particleIndices[iAccum];
							myParticles[ii].mass = massForThisLoop;
							iAccum++; 
						}
					}
				}
				break;

			case STRUCTURE_TYPE_TREE: // Smoothing
				{ // Style: Mutual repulsion of all tree points. Looks good
					let bEnableTreePhysicsMutualRepulsion = true;
					if (bEnableTreePhysicsMutualRepulsion){
						let branchMutualRepulsionFactor = this.PROPERTY_B; //e.g. 0.05; 
						if (branchMutualRepulsionFactor > 0){
							for (let j=0; j<this.particleIndices.length; j++){
								let jthI = this.particleIndices[j];
								let jthPoint = (whichPass == 1) ? myParticles[jthI].p0 : myParticles[jthI].pE;

								for (let i=0; i<j; i++){
									let ithI = this.particleIndices[i];
									let ithPoint = (whichPass == 1) ? myParticles[ithI].p0 : myParticles[ithI].pE;
									let dx = ithPoint.x - jthPoint.x; 
									let dy = ithPoint.y - jthPoint.y; 
									let dh2 = (dx*dx + dy*dy); 
									if (dh2 > 0.001){
										let fx = dx/dh2 * branchMutualRepulsionFactor;
										let fy = dy/dh2 * branchMutualRepulsionFactor;
										myParticles[ithI].addForce( fx,  fy, whichPass); 
										myParticles[jthI].addForce(-fx, -fy, whichPass); 
									}
								}
							}
						}
					}
				}
				break;

			//---------------------
			case STRUCTURE_TYPE_STAR: // Smoothing
				const nSpokes = this.PROPERTY_A; 
				const nSegs = (N-1)/nSpokes;
				if (nSegs >= 3){
					for (let sj=0; sj<(nSegs-2); sj++){
						for (let si = 1; si <= nSpokes; si++) {
							const h = si + nSpokes*(sj  );
							const i = si + nSpokes*(sj+1);
							const j = si + nSpokes*(sj+2);
							const pih = this.particleIndices[h];
							const pii = this.particleIndices[i];
							const pij = this.particleIndices[j];
							let pA = myParticles[pih];
							let pB = myParticles[pii];
							let pC = myParticles[pij];
							
							if (whichPass == 1){
								pAsubB = p5.Vector.sub(pA.p0, pB.p0);
								pCsubB = p5.Vector.sub(pC.p0, pB.p0);
							} else {
								pAsubB = p5.Vector.sub(pA.pE, pB.pE);
								pCsubB = p5.Vector.sub(pC.pE, pB.pE);
							}
							pAsubB.normalize();
							pCsubB.normalize();
							let f = (p5.Vector.add(pAsubB, pCsubB)).mult(this.SMOOTHING);
							myParticles[pii].addForce( f.x, f.y, whichPass);
							myParticles[pih].addForce(-f.x / 2, -f.y / 2, whichPass);
							myParticles[pij].addForce(-f.x / 2, -f.y / 2, whichPass);
						}
					}
				}
				break;

			//---------------------
			case STRUCTURE_TYPE_LOOP: // Smoothing
			case STRUCTURE_TYPE_LINE:
				{
					if (this.type == STRUCTURE_TYPE_LOOP){
						theStyleSheet.loopStructureSmoothing = 2.5; //map(mouseX, 0,width, 1,4); // REMOVE
						this.SMOOTHING = theStyleSheet.loopStructureSmoothing;
					} else if (this.type == STRUCTURE_TYPE_LINE){
						this.SMOOTHING = theStyleSheet.lineStructureSmoothing;
					}

					const ia = this.bLoop ? 0 : 1;
					const ib = this.bLoop ? N : N - 1;
					for (let i = ia; i < ib; i++) {
						const h = (i - 1 + N) % N;
						const j = (i + 1) % N;
						const pih = this.particleIndices[h];
						const pii = this.particleIndices[i];
						const pij = this.particleIndices[j];
						let pA = myParticles[pih];
						let pB = myParticles[pii];
						let pC = myParticles[pij];
						
						if (whichPass == 1){
							pAsubB = p5.Vector.sub(pA.p0, pB.p0);
							pCsubB = p5.Vector.sub(pC.p0, pB.p0);
						} else {
							pAsubB = p5.Vector.sub(pA.pE, pB.pE);
							pCsubB = p5.Vector.sub(pC.pE, pB.pE);
						}
						pAsubB.normalize();
						pCsubB.normalize();
						let f = (p5.Vector.add(pAsubB, pCsubB)).mult(this.SMOOTHING);
						myParticles[pii].addForce( f.x, f.y, whichPass);
						myParticles[pih].addForce(-f.x / 2, -f.y / 2, whichPass);
						myParticles[pij].addForce(-f.x / 2, -f.y / 2, whichPass);
					}
				}
				break;
  
			//---------------------
			case STRUCTURE_TYPE_TRUSS:
			case STRUCTURE_TYPE_WHEEL: 
				{ 	// Apply smoothing forces
					const nSegments = N/2;
					const ia = this.bLoop ? 0 : 1;
					const ib = this.bLoop ? nSegments : nSegments - 1;

					let pAsubBx, pAsubBy, pAsubBh;
					let pCsubBx, pCsubBy, pCsubBh; 
					let fx,fy; 
					for (let i = ia; i < ib; i++) {
						for (let k = 0; k <= 1; k++){ // do both sides of truss
							const ih = ((i - 1)*2 + k + N) % N;
							const ii = ((i    )*2 + k    ) % N;
							const ij = ((i + 1)*2 + k    ) % N;
							const pih = this.particleIndices[ih];
							const pii = this.particleIndices[ii];
							const pij = this.particleIndices[ij];
							
							if (whichPass == 1){
								let pAp0 = myParticles[pih].p0;
								let pBp0 = myParticles[pii].p0;
								let pCp0 = myParticles[pij].p0;
								pAsubBx = pAp0.x - pBp0.x;
								pAsubBy = pAp0.y - pBp0.y;
								pCsubBx = pCp0.x - pBp0.x;
								pCsubBy = pCp0.y - pBp0.y;
							} else {
								let pApE = myParticles[pih].pE;
								let pBpE = myParticles[pii].pE;
								let pCpE = myParticles[pij].pE;
								pAsubBx = pApE.x - pBpE.x;
								pAsubBy = pApE.y - pBpE.y;
								pCsubBx = pCpE.x - pBpE.x;
								pCsubBy = pCpE.y - pBpE.y;
							}
							pAsubBh = Math.sqrt(pAsubBx*pAsubBx + pAsubBy*pAsubBy); 
							pCsubBh = Math.sqrt(pCsubBx*pCsubBx + pCsubBy*pCsubBy); 
							pAsubBx = pAsubBx/pAsubBh;
							pAsubBy = pAsubBy/pAsubBh;
							pCsubBx = pCsubBx/pCsubBh;
							pCsubBy = pCsubBy/pCsubBh;
							fx = this.SMOOTHING * (pAsubBx + pCsubBx);
							fy = this.SMOOTHING * (pAsubBy + pCsubBy);

							myParticles[pii].addForce( fx, fy, whichPass);
							myParticles[pih].addForce(-fx / 2, -fy / 2, whichPass);
							myParticles[pij].addForce(-fx / 2, -fy / 2, whichPass);
						}
					}
				}
				break;

			case STRUCTURE_TYPE_CENTI:
				// Apply smoothing forces
				let bDoRevoltingWiggle = mouseIsPressed; //false;
				if (bDoRevoltingWiggle){
					let nSegments = N/4;
					let wiggleAmount = 0.333; //this.SMOOTHING
					for (let i = 1; i < nSegments - 1; i++) {
						for (let k = 0; k <= 1; k++){ // do both sides of truss
							const ih = (i - 1)*4 + k;
							const ii = (i + 0)*4 + k;
							const ij = (i + 1)*4 + k;
							const pih = this.particleIndices[ih];
							const pii = this.particleIndices[ii];
							const pij = this.particleIndices[ij];

							let pA = myParticles[pih];
							let pB = myParticles[pii];
							let pC = myParticles[pij];
							if (whichPass == 1){
								pAsubB = p5.Vector.sub(pA.p0, pB.p0);
								pCsubB = p5.Vector.sub(pC.p0, pB.p0);
							} else {
								pAsubB = p5.Vector.sub(pA.pE, pB.pE);
								pCsubB = p5.Vector.sub(pC.pE, pB.pE);
							}
							pAsubB.normalize();
							pCsubB.normalize();
							let f = (p5.Vector.add(pAsubB, pCsubB)).mult(wiggleAmount);
							myParticles[pih].addForce(-f.x / 2, -f.y / 2, whichPass);
							myParticles[pij].addForce(-f.x / 2, -f.y / 2, whichPass);
						}
					}
				}
				break;
			
			case STRUCTURE_TYPE_URCHIN:
				{	// Apply smoothing forces
					let ptsPerSeg = 2 + this.PROPERTY_A;
					let nSegments = N/ptsPerSeg;
					
					let pAsubBx, pAsubBy, pAsubBh;
					let pCsubBx, pCsubBy, pCsubBh; 
					let fx,fy;
					for (let i = 0; i < nSegments; i++) {
						for (let k = 0; k <= 1; k++){ // smooth the wheel part; do both sides
							const pih = this.particleIndices[ ((i - 1)*ptsPerSeg + k + N) % N ];
							const pii = this.particleIndices[ ((i    )*ptsPerSeg + k    ) % N ];
							const pij = this.particleIndices[ ((i + 1)*ptsPerSeg + k    ) % N ];

							if (whichPass == 1){
								let pAp0 = myParticles[pih].p0;
								let pBp0 = myParticles[pii].p0;
								let pCp0 = myParticles[pij].p0;
								pAsubBx = pAp0.x - pBp0.x;
								pAsubBy = pAp0.y - pBp0.y;
								pCsubBx = pCp0.x - pBp0.x;
								pCsubBy = pCp0.y - pBp0.y;
							} else {
								let pApE = myParticles[pih].pE;
								let pBpE = myParticles[pii].pE;
								let pCpE = myParticles[pij].pE;
								pAsubBx = pApE.x - pBpE.x;
								pAsubBy = pApE.y - pBpE.y;
								pCsubBx = pCpE.x - pBpE.x;
								pCsubBy = pCpE.y - pBpE.y;
							}
							pAsubBh = Math.sqrt(pAsubBx*pAsubBx + pAsubBy*pAsubBy); 
							pCsubBh = Math.sqrt(pCsubBx*pCsubBx + pCsubBy*pCsubBy); 
							fx = this.SMOOTHING * (pAsubBx/pAsubBh + pCsubBx/pCsubBh);
							fy = this.SMOOTHING * (pAsubBy/pAsubBh + pCsubBy/pCsubBh);
				
							myParticles[pii].addForce( fx, fy, whichPass);
							myParticles[pih].addForce(-fx / 2, -fy / 2, whichPass);
							myParticles[pij].addForce(-fx / 2, -fy / 2, whichPass);
						}

						// do the spines of the urchin, tripletwise
						for (let k=1; k<(ptsPerSeg-1); k++){
							const ih = i*ptsPerSeg + k-1; 
							const ii = i*ptsPerSeg + k  ; 
							const ij = i*ptsPerSeg + k+1; 
							const pih = this.particleIndices[ih];
							const pii = this.particleIndices[ii];
							const pij = this.particleIndices[ij];
							let pA = myParticles[pih];
							let pB = myParticles[pii];
							let pC = myParticles[pij];
								
							if (whichPass == 1){
								pAsubB = p5.Vector.sub(pA.p0, pB.p0);
								pCsubB = p5.Vector.sub(pC.p0, pB.p0);
							} else {
								pAsubB = p5.Vector.sub(pA.pE, pB.pE);
								pCsubB = p5.Vector.sub(pC.pE, pB.pE);
							}
							pAsubB.normalize();
							pCsubB.normalize();
							let f = (p5.Vector.add(pAsubB, pCsubB)).mult(this.SMOOTHING);
							myParticles[pii].addForce( f.x, f.y, whichPass);
							myParticles[pih].addForce(-f.x / 2, -f.y / 2, whichPass);
							myParticles[pij].addForce(-f.x / 2, -f.y / 2, whichPass);
						}
					}
				}
				break;
	  	}
	}


	//----------------------------------------------
	applyScrunchingForces(whichPass){
	  	const N = this.particleIndices.length;
	  	if (N > 10){
			let myParticles = this.mom.myParticles;
			const bDoUnsmooth = true; 
			const bDoTwist = true; 
			let pKsubI;
			let pGsubI;
			
			switch (this.type) {
				case STRUCTURE_TYPE_DASH:
				case STRUCTURE_TYPE_OFFSETS:
					break; // Not applicable.

				case STRUCTURE_TYPE_STAR:
					const nSpokes = this.PROPERTY_A;
					let nSegs = (N-1)/nSpokes;
					if (nSegs >= 5){
						for (let sj=0; sj<(nSegs-4); sj++){
							for (let si = 1; si <= nSpokes; si++) {
								const ig = this.particleIndices[si + nSpokes*(sj  )];
								const ii = this.particleIndices[si + nSpokes*(sj+2)];
								const ik = this.particleIndices[si + nSpokes*(sj+4)];
								let pG = myParticles[ig];
								let pI = myParticles[ii];
								let pK = myParticles[ik];

								if (bDoUnsmooth){
									if (whichPass == 1){
										pKsubI = p5.Vector.sub(pK.p0, pI.p0);
										pGsubI = p5.Vector.sub(pG.p0, pI.p0);
									} else {
										pKsubI = p5.Vector.sub(pK.pE, pI.pE);
										pGsubI = p5.Vector.sub(pG.pE, pI.pE);
									}
									pKsubI.normalize();
									pGsubI.normalize();
									let f = (p5.Vector.add(pKsubI, pGsubI)).mult(this.SCRUNCHING);
									myParticles[ii].addForce(-f.x,-f.y, whichPass);
									myParticles[ik].addForce( f.x / 2, f.y / 2, whichPass);
									myParticles[ig].addForce( f.x / 2, f.y / 2, whichPass);
								}
							}
						}
					}
					break;

				case STRUCTURE_TYPE_TRUSS:
				case STRUCTURE_TYPE_WHEEL: 
					// Apply scrunching forces
					if (bDoUnsmooth){
						let nSegments = N/2;
						let ia = this.bLoop ? 0 : 3;
						let ib = this.bLoop ? nSegments : nSegments - 3;
						let pKsubIx, pKsubIy, pKsubIh;
						let pGsubIx, pGsubIy, pGsubIh;
						let fx,fy;

						for (let i = ia; i < ib; i++) {
							for (let k = 0; k <= 1; k++){ // do both sides of truss
								const ig = ((i - 3)*2 + k + N) % N;
								const ii = ((i    )*2 + k    ) % N;
								const ik = ((i + 3)*2 + k    ) % N;
								const pig = this.particleIndices[ig];
								const pii = this.particleIndices[ii];
								const pik = this.particleIndices[ik];
								
								if (whichPass == 1){
									let pGp0 = myParticles[pig].p0;
									let pIp0 = myParticles[pii].p0;
									let pKp0 = myParticles[pik].p0;
									pKsubIx = pKp0.x - pIp0.x;
									pKsubIy = pKp0.y - pIp0.y;
									pGsubIx = pGp0.x - pIp0.x;
									pGsubIy = pGp0.y - pIp0.y;
								} else {
									let pGpE = myParticles[pig].pE;
									let pIpE = myParticles[pii].pE;
									let pKpE = myParticles[pik].pE;
									pKsubIx = pKpE.x - pIpE.x;
									pKsubIy = pKpE.y - pIpE.y;
									pGsubIx = pGpE.x - pIpE.x;
									pGsubIy = pGpE.y - pIpE.y;
								}
								pKsubIh = Math.sqrt(pKsubIx*pKsubIx + pKsubIy*pKsubIy);
								pGsubIh = Math.sqrt(pGsubIx*pGsubIx + pGsubIy*pGsubIy);
								pKsubIx /= pKsubIh;
								pKsubIy /= pKsubIh;
								pGsubIx /= pGsubIh;
								pGsubIy /= pGsubIh;
								fx = this.SCRUNCHING * (pKsubIx + pGsubIx);
								fy = this.SCRUNCHING * (pKsubIy + pGsubIy);
								myParticles[ii].addForce(-fx, -fy, whichPass);
								myParticles[ik].addForce( fx / 2, fy / 2, whichPass);
								myParticles[ig].addForce( fx / 2, fy / 2, whichPass);
							}
						}
					}
					break;
			
				//---------------------
				case STRUCTURE_TYPE_LOOP:
				case STRUCTURE_TYPE_LINE:
					{
						let k = (this.bLoop) ? 0 : 3;
						for (let i = k; i < (N-k); i++) {
							const g = (i - 2 + N) % N;
							const h = (i - 1 + N) % N;
							const j = (i + 1 ) % N;
							const k = (i + 2 ) % N;
				
							const ig = this.particleIndices[g];
							const ih = this.particleIndices[h];
							const ii = this.particleIndices[i];
							const ij = this.particleIndices[j];
							const ik = this.particleIndices[k];
				
							let pG = myParticles[ig];
							let pI = myParticles[ii];
							let pK = myParticles[ik];
							if (bDoUnsmooth){
								// Unsmooth at a large scale
								if (whichPass == 1){
									pKsubI = p5.Vector.sub(pK.p0, pI.p0);
									pGsubI = p5.Vector.sub(pG.p0, pI.p0);
								} else {
									pKsubI = p5.Vector.sub(pK.pE, pI.pE);
									pGsubI = p5.Vector.sub(pG.pE, pI.pE);
								}
								pKsubI.normalize();
								pGsubI.normalize();
								let f = (p5.Vector.add(pKsubI, pGsubI)).mult(this.SCRUNCHING); 
								myParticles[ii].addForce(-f.x,-f.y, whichPass);
								myParticles[ik].addForce( f.x / 2, f.y / 2, whichPass);
								myParticles[ig].addForce( f.x / 2, f.y / 2, whichPass);
							}
				
							// Push into S shapes
							if (bDoTwist) {
								let pKsubG; 
								if (whichPass == 1){
									pKsubG = p5.Vector.sub(pK.p0, pG.p0);
								} else {
									pKsubG = p5.Vector.sub(pK.pE, pG.pE);
								}
								let f = pKsubG.mult(this.TWISTING);
								myParticles[ig].addForce( f.x,  f.y, whichPass);
								myParticles[ik].addForce(-f.x, -f.y, whichPass);
								f = pKsubG.mult(0.6); // perpendicular force
								if (i%2 == 0){
									myParticles[ih].addForce(-f.y,  f.x, whichPass);
									myParticles[ij].addForce( f.y, -f.x, whichPass);
								} else {
									myParticles[ih].addForce( f.y, -f.x, whichPass);
									myParticles[ij].addForce(-f.y,  f.x, whichPass);
								}
							}
						}
					}
					break;
			}
		}
	}


	//----------------------------------------------
	getContours(bSimplified = false){
		// 'bSimplified' is used exclusively for distance transform
		let out = []; // an array of StyledPolylines

		if (this.hasSubstituteSubcell){
			this.bDisplayEnclosedBlobs = false; 
			return out; 
		}


		let polyline0 = [];
		let polyline1 = [];
		const nSprings = this.springs.length;
		let theStyleSheet = this.mom.theStyleSheet;
		let myParticles = this.mom.myParticles;
		let nMaskPoints = this.mom.nMaskPoints;
		let simulationFrameCount = this.mom.simulationFrameCount;

		let bEnclosureIsBlack = false;
		let enclosingStructureId = this.getEnclosingStructureId(); 
		if (enclosingStructureId != -1){
			if (this.mom.myStructures[enclosingStructureId].type == STRUCTURE_TYPE_WHEEL){
				let enclosureStyle = this.mom.myStructures[enclosingStructureId].STYLE_ID;
				if ((enclosureStyle == 12) /* || (enclosureStyle == 10) */ ){ bEnclosureIsBlack = true;}
			} else if (this.mom.myStructures[enclosingStructureId].type == STRUCTURE_TYPE_LOOP){
				let enclosureStyle = this.mom.myStructures[enclosingStructureId].STYLE_ID;
				if ((enclosureStyle == 1) || (enclosureStyle == 3) || (enclosureStyle == 4)){bEnclosureIsBlack = true;}
			}
		}

		switch (this.type) {
					
			case STRUCTURE_TYPE_OFFSETS: // getContours
				if (bSimplified) { return out; }
				if (theStyleSheet.bDoOffsetRings && theStyleSheet.bEnableExternalRingsOrHairs){
					out = this.mom.getOffsetCurveContours(this); 
				}
				break;

			case STRUCTURE_TYPE_MEMBRANE: // getContours
				if (bSimplified) { 
					return out; 
				} else {
					let nLoops = this.particleIndices.length / nMaskPoints;
					if (nLoops == 0){
						// Draw plain contour if there are no layers in the membrane
						for (let i=0; i<nMaskPoints; i++){
							polyline0.push(myParticles[ i ].p); 
						}
						let aStyledPolyline = new StyledPolyline(polyline0, true, true, false, false, STROKE_BLACK, FILL_NONE, WEIGHT_3, 0,0, true);
						out.push(aStyledPolyline); 
						aStyledPolyline = null;
						polyline0 = null;

					} else {
						let pointSkip = 1; // default value;  0,1,2,3,6,12 work well
						let loopSkip = (nLoops-1); // default value; 0, 1 - (nLoops-1)
						let loopIndent = (nLoops <= 3) ? 0 : theStyleSheet.membraneLoopIndent;
						
						let pointOffset = 0; // default value
						let bTaperBands = false;
						let bAddDoubledBands = false; 
						let bAllLoopsDashedExceptFinal = false; 
						let bDashIntermediateBands = false;
						let bAddBandFillets = false;
						let bAddMiniNuclei = theStyleSheet.bAddMiniNuclei;
						let bRandomizeRadialBandSkip = false; 
						let bDiagonals = false;
						let bAddDitherDots = theStyleSheet.membrane_bAddDitherDots;
						let pskLo = 2; 
						let pskHi = 4;

						switch(this.STYLE_ID){
							default: 
							case 0:  // Nothing inside, just empty space. 
								pointSkip = 0; 
								loopSkip = (nLoops*2);
								break;
							case 1: // inner and outer loops, connected by all bands
								pointSkip = 1; 
								loopSkip = (nLoops-1); 
								break;
							case 2: // cells: inner and outer loops, connected by bands, skipping 2
								pointSkip = 3; 
								loopSkip = (nLoops-1); 
								bAddBandFillets = true;
								break;
							case 3: // inner and outer loops, bands skip by membrane3pointSkip; dimples. nLoops MUST be odd
								pointSkip = theStyleSheet.membrane3pointSkip;  
								loopSkip = (nLoops-1); 
								pointOffset = ~~(nLoops/2); 
								bAddBandFillets = true; 

								if (theStyleSheet.membrane3variant == 1){
									loopSkip = 1;
									bAllLoopsDashedExceptFinal = true;
								} else if (theStyleSheet.membrane3variant == 2){
									bDiagonals = true;
								} else if (theStyleSheet.membrane3variant == 3){
									bTaperBands = true;
								}

								break;
							case 4: // irregularly dashed concentric loops
								pointSkip = 0; 
								loopSkip = 1; 
								bAllLoopsDashedExceptFinal = true;
								break;
							case 5: // dense tapering bands, no loops
								bTaperBands = true; 
								loopSkip = (nLoops*2);
								pointSkip = 1; 
								break;
							case 6: // bumpy special mode
								pointSkip = 0; 
								loopSkip = 0; 
								break;
							case 7: // inner and outer loops, connected by all bands plus intermediate bands, dashed
								bAddDoubledBands = true; 
								bDashIntermediateBands = true;
								pointSkip = 1; 
								loopSkip = (nLoops-1); 
								break;
							case 8: // inner and outer loops, connected by all bands plus intermediate bands
								bAddDoubledBands = true; 
								bTaperBands = true; 
								pointSkip = 1; 
								loopSkip = (nLoops*2);// loopSkip = (nLoops-1); 
								break;
							case 9: // inner and outer loops, connected by all bands, and doubled bands
								pointSkip = 1; 
								bAddDoubledBands = true;
								loopSkip = (nLoops-1); 
								break;
							case 10: // irregular cells (modified #2)
								pointSkip = 3; 
								pskLo = 2; 
								pskHi = 4; 
								loopSkip = (nLoops-1); 
								bAddBandFillets = true;
								bRandomizeRadialBandSkip = true;
								break;
							case 11: // irregular #7
								bAddDoubledBands = true; 
								bDashIntermediateBands = true;
								loopSkip = (nLoops-1); 
								bRandomizeRadialBandSkip = true;
								pointSkip = 1; 
								pskLo = 1; 
								pskHi = 3; 
								break;
							case 12: 
								pointSkip = 0;
								bDiagonals = true;
								break;
						}

						if (bAddDitherDots){
							let rCount = 0; 
							const end1 = this.particleIndices.length - nMaskPoints;
							const end2 = end1-nMaskPoints;

							let aStyledPolylineDot = null; 
							let aPolylineDot = null; 
							let pStart = loopIndent * nMaskPoints; 

							for (let i=pStart; i<this.particleIndices.length; i++){
								const frac = sq(1.0 - i/this.particleIndices.length);
								const dotW = frac * WEIGHT_1;

								const ii = this.particleIndices[i];
								const ix = myParticles[ii].p.x;
								const iy = myParticles[ii].p.y;
								if (i < nMaskPoints){
									if (this.mom.rand20K[rCount++] < frac){
										let lll = (i+1)%nMaskPoints;
										const ll = this.particleIndices[lll];
										const lx = myParticles[ll].p.x;
										const ly = myParticles[ll].p.y;

										const jjj = i+nMaskPoints;
										const jj = this.particleIndices[jjj];
										const jx = myParticles[jj].p.x;
										const jy = myParticles[jj].p.y;
										const px = (ix + lx + jx)/3.0; 
										const py = (iy + ly + jy)/3.0;

										aPolylineDot = [];
										aPolylineDot.push( createVector(px, py) ); 
										aStyledPolylineDot = new StyledPolyline(aPolylineDot, false,false,false,true, STROKE_BLACK, FILL_NONE, dotW, 0,0, false);
										out.push(aStyledPolylineDot); 
									}

								} else {
									if (this.mom.rand20K[rCount++] < frac){
										aPolylineDot = [];
										aPolylineDot.push(myParticles[ii].p); 
										aStyledPolylineDot = new StyledPolyline(aPolylineDot, false,false,false,true, STROKE_BLACK, FILL_NONE, dotW, 0,0, false);
										out.push(aStyledPolylineDot); 
									}

									if (i < end1){
										let hhh = i-1; 
										let ggg = i-nMaskPoints;
										let jjj = i+nMaskPoints-1;
										if (i%nMaskPoints == 0){
											jjj++; ggg++;
											hhh+=nMaskPoints-1;
										}
										const hh = this.particleIndices[hhh];
										const hx = myParticles[hh].p.x;
										const hy = myParticles[hh].p.y;
										const jj = this.particleIndices[jjj];
										const jx = myParticles[jj].p.x;
										const jy = myParticles[jj].p.y;

										if (this.mom.rand20K[rCount++] < frac){
											const px = (hx + ix + jx)/3.0; 
											const py = (hy + iy + jy)/3.0;
											aPolylineDot = [];
											aPolylineDot.push( createVector(px, py) ); 
											aStyledPolylineDot = new StyledPolyline(aPolylineDot, false,false,false,true, STROKE_BLACK, FILL_NONE, dotW, 0,0, false);
											out.push(aStyledPolylineDot); 
										}
									
										if ((loopIndent == 0) || (ggg > nMaskPoints)){
											if (this.mom.rand20K[rCount++] < frac){
												const gg = this.particleIndices[ggg];
												const gx = myParticles[gg].p.x;
												const gy = myParticles[gg].p.y;
												const qx = (hx + ix + gx)/3.0; 
												const qy = (hy + iy + gy)/3.0;
												aPolylineDot = [];
												aPolylineDot.push( createVector(qx, qy) ); 
												aStyledPolylineDot = new StyledPolyline(aPolylineDot, false,false,false,true, STROKE_BLACK, FILL_NONE, dotW, 0,0, false);
												out.push(aStyledPolylineDot); 
											}
										}
									
										if (i >= end2){
											if (this.mom.rand20K[rCount++] < frac){
												let lll = i+1;
												let kx = myParticles[jj].p.x;
												let ky = myParticles[jj].p.y;
												if (i == end2){
													const kkk = i+2*nMaskPoints-1;
													const kk = this.particleIndices[kkk];
													kx = myParticles[kk].p.x;
													ky = myParticles[kk].p.y;
													lll--;
												} else if (i==(end1-1)){
													lll-=nMaskPoints;
												}

												const ll = this.particleIndices[lll];
												const lx = myParticles[ll].p.x;
												const ly = myParticles[ll].p.y;
												const rx = (lx + jx + kx)/3.0; 
												const ry = (ly + jy + ky)/3.0;
												aPolylineDot = [];
												aPolylineDot.push( createVector(rx, ry) ); 
												aStyledPolylineDot = new StyledPolyline(aPolylineDot, false,false,false,true, STROKE_BLACK, FILL_NONE, dotW, 0,0, false);
												out.push(aStyledPolylineDot); 
											}
										}
									}
								}
							}

							aStyledPolylineDot = null; 
							aPolylineDot = null; 
						}
						
						// Render radial bands
						if (pointSkip > 0){
							myRandomReset("123456789abcdefghijkmnopqrstuvwxyz");
							let end = (bAddDoubledBands) ? (nMaskPoints + pointSkip) : nMaskPoints;
							const bandWodd  = theStyleSheet.radialBandWeights[0];
							const bandWeven = theStyleSheet.radialBandWeights[1];
							const bnLoopsOdd = (nLoops%2 == 1); 

							let prevNx = 0;
							let prevNy = 0;
							let prevPointSkip = pointSkip;
							const nucWeights = [WEIGHT_1,WEIGHT_2];

							for (let j=pointOffset; j<end; j+=pointSkip){
								if (bRandomizeRadialBandSkip){
									pointSkip = int(Math.round(myRandomAB(pskLo,pskHi))); 
								}

								let aPolyline = [];
								let nSegs = nLoops/2; // to get perpendicular spokes
								let nPointsPerSeg = nMaskPoints * 2; 

								let ni = (j%nMaskPoints) + loopIndent*nMaskPoints;
								let previi = 0; 
								let segB = nSegs;

								if (bnLoopsOdd){ 
									segB = nSegs-loopIndent;
								}
								let bSpecialCase = ((loopIndent == 1) && (this.STYLE_ID == 3)); 
								if (bSpecialCase){

									for (let i=0; i<segB; i++){
										let ii = this.particleIndices[ni];
										if (i > 0){
											const mx = (myParticles[previi].p.x + myParticles[ii-1].p.x)/2;
											const my = (myParticles[previi].p.y + myParticles[ii-1].p.y)/2;
											aPolyline.push( createVector(mx, my) ); 
										}
										
										let mx = (myParticles[ii].p.x + myParticles[this.particleIndices[ni-loopIndent]].p.x)/2;
										let my = (myParticles[ii].p.y + myParticles[this.particleIndices[ni-loopIndent]].p.y)/2;
										aPolyline.push(createVector(mx, my)); 
										ni += nPointsPerSeg - 1;
										if ((j%nMaskPoints)==i){
											ni += nMaskPoints;
										}
										previi = ii;
									}
	
									if (nLoops > 3){
										if (((loopIndent == 0) && (!bnLoopsOdd)) ||
											((loopIndent == 1) && ( bnLoopsOdd))){
											ni = ni + nMaskPoints - nPointsPerSeg;
											let nj = ni+1;
											if (nj >= this.particleIndices.length){ nj -= nMaskPoints; }
											let ii = this.particleIndices[ni];
											let jj = this.particleIndices[nj];
											let px = (myParticles[ii].p.x); // + myParticles[jj].p.x)/2;
											let py = (myParticles[ii].p.y); // + myParticles[jj].p.y)/2;
											let midpoint = createVector(px, py); 
											aPolyline.push(midpoint);
										}
									}

								} else {

									for (let i=0; i<segB; i++){
										let ii = this.particleIndices[ni];
										if (i > 0){
											let mx = (myParticles[previi].p.x + myParticles[ii].p.x)/2;
											let my = (myParticles[previi].p.y + myParticles[ii].p.y)/2;
											let midpoint = createVector(mx, my);
											aPolyline.push(midpoint); 
										}
										aPolyline.push(myParticles[ii].p); 
										ni += nPointsPerSeg - 1;
										if ((j%nMaskPoints)==i){
											ni += nMaskPoints;
										}
										previi = ii;
									}
	
									if (nLoops > 3){
										if (((loopIndent == 0) && (!bnLoopsOdd)) ||
											((loopIndent == 1) && ( bnLoopsOdd))){
											ni = ni + nMaskPoints - nPointsPerSeg;
											let nj = ni+1;
											if (nj >= this.particleIndices.length){ nj -= nMaskPoints; }
											let ii = this.particleIndices[ni];
											let jj = this.particleIndices[nj];
											let px = (myParticles[ii].p.x + myParticles[jj].p.x)/2;
											let py = (myParticles[ii].p.y + myParticles[jj].p.y)/2;

											let midpoint = createVector(px, py); 
											aPolyline.push(midpoint);
										}
									}
								}

								if (bAddMiniNuclei){
									let nx = (aPolyline[0].x + aPolyline[aPolyline.length-1].x)/2;
									let ny = (aPolyline[0].y + aPolyline[aPolyline.length-1].y)/2;
									if ((j != pointOffset) && (this.mom.rand20K[j] < 0.9)) {
										let nucx = (nx + prevNx)/2;
										let nucy = (ny + prevNy)/2;
										let nuc = createVector(nucx,nucy); 
										let nucw = nucWeights[ Math.round(map(prevPointSkip, pskLo,pskHi, 0,1, true)) ];
										out.push( new StyledPolyline([nuc], false, false, false, true, STROKE_NONE, FILL_BLACK, nucw, 0,0) );
									}
									prevNx = nx; prevNy = ny;
									prevPointSkip = pointSkip;
								}
			
								if (bAddDoubledBands){
									if (out.length > 0){
										let prevStyledPolyline = out[out.length-1];
										let prevVerts = prevStyledPolyline.verts;
										let midVerts = [];
										for (let v=0; v<prevVerts.length; v++){
											let vx = (prevVerts[v].x + aPolyline[v].x)/2;
											let vy = (prevVerts[v].y + aPolyline[v].y)/2;
											let mid = createVector(vx,vy); 
											midVerts.push(mid);
										}
										let g = (bDashIntermediateBands) ? 1: 0;
										let d = (bDashIntermediateBands) ? 2: 0;
										let interLine = new StyledPolyline(midVerts, false, true, bTaperBands, false, 
											STROKE_BLACK, FILL_NONE, bandWeven, g,d);
										out.push(interLine); 
										interLine = null;
										midVerts = null;
									}
								}

							
								if (j < nMaskPoints){
									let aStyledPolyline = new StyledPolyline(aPolyline, false, true, bTaperBands, false, 
										STROKE_BLACK, FILL_NONE, bandWodd, 0,0);
									out.push(aStyledPolyline); 

									if (bAddBandFillets){ 
										const apl = aPolyline.length;
										if (apl >= 2){
											let aPolylineFillets = [];
											let g = (apl > 2) ? 2:1;

											let ax = aPolyline[0].x;
											let ay = aPolyline[0].y;
											let bx = aPolyline[g].x;
											let by = aPolyline[g].y;
											aPolylineFillets = this.createWedgePolyline (ax, ay, bx, by, WEIGHT_3, 9, 0.66);
											out.push( new StyledPolyline(aPolylineFillets, false, false, false, false, STROKE_BLACK, FILL_NONE, WEIGHT_0, 0,0) );

											let apL = aPolyline.length; 
											let zx = aPolyline[apL-1].x;
											let zy = aPolyline[apL-1].y;
											let wx = aPolyline[apL-g].x;
											let wy = aPolyline[apL-g].y;
											aPolylineFillets = this.createWedgePolyline (zx, zy, wx, wy, WEIGHT_3, 7, 0.66);
											out.push( new StyledPolyline(aPolylineFillets, false, false, false, false, STROKE_BLACK, FILL_NONE, WEIGHT_0, 0,0) );
											aPolylineFillets = null;
										}
									}
									aStyledPolyline = null; 
									aPolyline = null; 
								}

							}
						}

						// Render concentric Loops
						let bDrawOutermostLoop = true; // always, basically
						if (bDrawOutermostLoop){ // Draw outermost loop first.
							let aPolyline = [];
							for (let i=0; i<nMaskPoints; i++){
								aPolyline.push(myParticles[ this.particleIndices[i] ].p); 
							}
							let upmag = 1.0; 
							if (this.mom.nestedLevel > 0){
								// upmag = 10; //WEIGHT_3 / WEIGHT_2; 
							}
							let aStyledPolyline = new StyledPolyline(aPolyline, true, true, false, false, STROKE_BLACK, FILL_NONE, upmag*WEIGHT_3, 0,0, true);
							out.push(aStyledPolyline); 
							aStyledPolyline = null;
							aPolyline = null;
						}

						// Draw concentric loop for the indented loop. 
						if (loopIndent == 1){
							let aPolyline = [];
							let nm2 = nMaskPoints*2; 
							for (let i=nMaskPoints; i<nm2; i++){
								aPolyline.push(myParticles[ this.particleIndices[i] ].p); 
							}
							
							let loopIndentWeight = theStyleSheet.loopIndentWeight; 
							let aStyledPolyline = new StyledPolyline(aPolyline, true, true, false, false, STROKE_BLACK, FILL_NONE, loopIndentWeight, 0,0, true);
							out.push(aStyledPolyline); 
							aStyledPolyline = null;
							aPolyline = null;
						}


						if (loopSkip > 0){ 
							if (bAllLoopsDashedExceptFinal){ 
								// for STYLE_ID #4, render final loop solid; render all others dashed
								for (let l=loopSkip; l<nLoops; l+=loopSkip){
									let indexStart = l*nMaskPoints;
									let indexEnd = indexStart+nMaskPoints;
									// print(indexEnd + " " + this.particleIndices.length)
									// indexEnd = Math.min(indexEnd, this.particleIndices.length);

									let aStyledPolyline;
									let aPolyline = [];
									for (let i=indexStart; i<indexEnd; i++){
										const ii = this.particleIndices[i];
										aPolyline.push(myParticles[ii].p); 
									}
									if (l == (nLoops-1)){ // Render final loop solid and heavy
										aStyledPolyline = new StyledPolyline(aPolyline, true, true, false, false, STROKE_BLACK, FILL_NONE, WEIGHT_2, 0,0, true);
										out.push(aStyledPolyline); 
									} else { // Render inner loops dashed: 
										aStyledPolyline = new StyledPolyline(aPolyline, true, false, false, false, STROKE_BLACK, FILL_NONE, WEIGHT_0, 1,6); // dashed: ..-..-
										out.push(aStyledPolyline); 
									}
									aStyledPolyline = null;
									aPolyline = null;
								}

							} else {
								let bShade = (this.STYLE_ID == 3) ? false : true; 
								let aPolyline = [];
								for (let l=loopSkip; l<nLoops; l+=loopSkip){
									let indexStart = l*nMaskPoints;
									let indexEnd = indexStart+nMaskPoints;
									aPolyline = [];
									for (let i=indexStart; i<indexEnd; i++){
										const ii = this.particleIndices[i];
										aPolyline.push(myParticles[ii].p); 
									}
									let aStyledPolyline = new StyledPolyline(aPolyline, true, true, false, false, STROKE_BLACK, FILL_NONE, WEIGHT_2, 0,0, bShade);
									out.push(aStyledPolyline); 
									aStyledPolyline = null;
								}
								aPolyline = null;
							}
						}

						// Special bumpy style with one innermost ring and interior "cells" 
						if (this.STYLE_ID == 6){
							for (let j=0; j<nMaskPoints; j++){
								let aPolyline = [];
								let nSegs = nLoops/2; 
								let nPointsPerSeg = nMaskPoints * 2; 
								let ni = j; 

								for (let i=0; i<nSegs; i++){
									let ii = this.particleIndices[ni];
									aPolyline.push(myParticles[ii].p); 
									ni += nPointsPerSeg - 1;
									if (j==i){ ni += nMaskPoints;}
								}
								if ((nLoops > 2)  ){
									ni -= (nPointsPerSeg - 1);
									ni += -1;
									let ii = this.particleIndices[ni];
									aPolyline.push(myParticles[ii].p);
								}
								let lw = (this.mom.rand20K[3] < 0.975) ? WEIGHT_0 : WEIGHT_1;  
								let aStyledPolyline = new StyledPolyline(aPolyline, false, true, false, false, STROKE_BLACK, FILL_NONE, lw, 0,0);
								out.push(aStyledPolyline); 
								aStyledPolyline = null;
								aPolyline = null;
							}

							if (nLoops%2 == 0){
								let aPolyline = [];
								let del = (nLoops-1)*nMaskPoints;
								for (let i=0; i<nMaskPoints; i++){
									aPolyline.push(myParticles[ this.particleIndices[i + del]].p); 
								}
								let aStyledPolyline = new StyledPolyline(aPolyline, true, true, false, false, STROKE_BLACK, FILL_NONE, WEIGHT_2, 0,0, true);
								out.push(aStyledPolyline); 
								aStyledPolyline = null;
								aPolyline = null;
							} 
						}

						if (bDiagonals){
							const nLoopsm1 = nLoops-1;
							if (nLoopsm1 > 1){
								for (let i=0; i<nMaskPoints; i++){
									let hairPolyline = [];
									for (let j=loopIndent; j<nLoopsm1; j++){
										let index = i + j*(nMaskPoints+1);
										if ((j > 0) && (i >= (nMaskPoints - nLoops))){
											index = j*nMaskPoints + (i+j)%nMaskPoints;
										}
										let aPt = myParticles[index].p;
										hairPolyline.push(aPt); 
									}
		
									let diagW = WEIGHT_0 * 0.75; //(WEIGHT_0 + WEIGHT_1)/2;
									if (nLoopsm1 == 2){
										out.push( new StyledPolyline(hairPolyline, false, false, false, false, STROKE_NONE, FILL_BLACK, diagW, 0,0, true) );
									} else {
										out.push( new StyledPolyline(hairPolyline, false, true, false, false, STROKE_BLACK, FILL_NONE, diagW, 0,0, true) );
									}
									hairPolyline = null;
								}
							}
						}
					}

					if (theStyleSheet.doMembraneHairs && theStyleSheet.bEnableExternalRingsOrHairs){
						let hairSkip = theStyleSheet.membraneHairSkip; 
						let hairBaseLen = this.mom.REST_L * theStyleSheet.membraneHairLengthFactor;
						let hairWeight = theStyleSheet.membraneHairWeight;
						for (let i=0; i<nMaskPoints; i+=hairSkip){
							let p0 = myParticles[i].p;
							let p1 = myParticles[(i+1)%nMaskPoints].p;
						
							let dx01 = p1.x - p0.x; 
							let dy01 = p1.y - p0.y; 
							let dh01 = Math.sqrt(dx01*dx01 + dy01*dy01); 
							if (dh01 > 0){
							   
								let nHairsPerSeg = theStyleSheet.membraneHairsPerSeg; 
								if (nHairsPerSeg == 1){
									let hairPolyline = [];
									let hairLen = hairBaseLen * myRandomAB(0.95, 1.05); 
									let hairPt = createVector(p0.x + hairLen*dy01/dh01, p0.y - hairLen*dx01/dh01);
									hairPolyline.push(p0); 
									hairPolyline.push(hairPt); 
									out.push( new StyledPolyline(hairPolyline, false, false, true, false, STROKE_NONE, FILL_BLACK, hairWeight, 0,0) );
									hairPolyline = null;

								} else {
									let p2 = myParticles[(i+2)%nMaskPoints].p;
									let dx12 = p2.x - p1.x; 
									let dy12 = p2.y - p1.y; 
									let dh12 = Math.sqrt(dx12*dx12 + dy12*dy12); 
									if (dh12 > 0){

										if (theStyleSheet.doMembraneHairsStubbly){
											for (let j=0; j<nHairsPerSeg; j++){
												let frac = myRandom01();
												let hairLen = hairBaseLen * myRandomAB(0.95, 1.05); 
												let hair0x = p0.x + hairLen*dy01/dh01; let hair0y = p0.y - hairLen*dx01/dh01;
												let hair1x = p1.x + hairLen*dy12/dh12; let hair1y = p1.y - hairLen*dx12/dh12;
												let hairX = hair0x + frac*(hair1x-hair0x); let hairY = hair0y + frac*(hair1y-hair0y); 
												let hairPolyline = [];
												hairPolyline.push(createVector(p0.x + frac*dx01,p0.y + frac*dy01));
												hairPolyline.push(createVector(hairX,hairY));
												out.push( new StyledPolyline(hairPolyline, false, false, true, false, STROKE_NONE, FILL_BLACK, hairWeight, 0,0) );
												hairPolyline = null;
											}
											
										} else {
											for (let j=0; j<nHairsPerSeg; j++){
												let frac = (j/nHairsPerSeg);
												let hairPolyline = [];
												let hairLen = hairBaseLen * myRandomAB(0.95, 1.05); 
												let rootX = p0.x + frac*dx01;
												let rootY = p0.y + frac*dy01;
												let hair0x = p0.x + hairLen*dy01/dh01;
												let hair0y = p0.y - hairLen*dx01/dh01;
												let hair1x = p1.x + hairLen*dy12/dh12;
												let hair1y = p1.y - hairLen*dx12/dh12;
												let hairX = hair0x + frac*(hair1x-hair0x); 
												let hairY = hair0y + frac*(hair1y-hair0y); 

												hairPolyline.push(createVector(rootX,rootY));
												hairPolyline.push(createVector(hairX,hairY));
												out.push( new StyledPolyline(hairPolyline, false, false, true, false, STROKE_NONE, FILL_BLACK, hairWeight, 0,0) );
												hairPolyline = null;
											}
										}
									}
								}
							}
						}
					}

					if (theStyleSheet.doMembraneExtraInnerMembrane){
						if (this.particleIndices.length > 0){
							let aPolyline = [];
							let offset = this.mom.REST_L * theStyleSheet.membraneExtraInnerMembraneSeparation;
						
							let endi = this.particleIndices.length; 
							let starti = endi - nMaskPoints; 
							let ij = this.particleIndices[endi-1];
							for (let i=starti; i<endi; i++){
								let ii = this.particleIndices[i];

								let px = myParticles[ii].p.x;
								let py = myParticles[ii].p.y;
								let qx = myParticles[ij].p.x;
								let qy = myParticles[ij].p.y;
								let dx = px - qx; 
								let dy = py - qy; 
								let dh2 = dx*dx + dy*dy; 
								if (dh2 > 0){
									let dh = Math.sqrt(dh2); 
									dx = offset * dx / dh; 
									dy = offset * dy / dh; 
									aPolyline.push( createVector(px - dy, py + dx)); 
								}
								ij = ii; 
							}
							let aStyledPolyline = new StyledPolyline(aPolyline, true, true, false, false, STROKE_BLACK, FILL_NONE, WEIGHT_1, 0,0, true);
							out.push(aStyledPolyline); 
							aStyledPolyline = null;
							aPolyline = null; 

						}
					}
				}
				break;
			
		//------------------
		case STRUCTURE_TYPE_BALL: // getContours
			{
				let sStyle = STROKE_BLACK; 
				let fStyle = FILL_NONE;
				let bDrawSpokes = false; 
				let bTaperSpokes = true; 
				let bDrawPupil = false;
				let bDrawSpiral = false; 
				let bDrawNubbles = false; 
				let bDrawInnerMembrane = false;
				let bDrawSpokesThickened = false;
				let bShadeOutline = false; 
				let bDrawCenterDot = false;
				let bDoHatch = false; 
				let spokeSkip = 1; 
				let sWeight = WEIGHT_2;

				if (bSimplified){
					bDrawSpokes = false; 
					bTaperSpokes = false; 
					bDrawPupil = false;
					bDrawSpiral = false; 
					bDrawNubbles = false; 
					bDrawInnerMembrane = false;
					bDrawSpokesThickened = false;
					bShadeOutline = false;
					spokeSkip = 1; 
				} else {

					switch(this.STYLE_ID){
						case 0: // Empty outline with nubbles
							bDrawCenterDot = theStyleSheet.bBallCenterDot; 
							bDrawNubbles = true;
							fStyle = FILL_WHITE;
							break; 
						case 1: // Pizza
							bDrawSpokes = true; 
							fStyle = FILL_WHITE;
							break; 
						case 2: // Black ball
							bDrawCenterDot = theStyleSheet.bBallCenterDot; 
							sStyle = STROKE_WHITE;
							fStyle = FILL_BLACK;
							sWeight = WEIGHT_1;
							break;
						case 3: // Inner parallel line
							bDrawInnerMembrane = true; 
							fStyle = FILL_WHITE;
							break;
						case 4: // Spiral
							bDrawSpiral = true;
							fStyle = FILL_WHITE;
							break;
						case 5: // Eye
							bDrawPupil = true; 
							bDrawInnerMembrane = true; 
							bShadeOutline = false;
							fStyle = FILL_WHITE;
							break;
						case 6: // Big Eye: Pupil and Nubbles
							bDrawPupil = true; 
							fStyle = FILL_WHITE;
							sWeight = (WEIGHT_2 + WEIGHT_3)/2;
							bShadeOutline = true;
							break;

						case 8: // Hatched sphere
							sWeight = (WEIGHT_1 + WEIGHT_2)/2;
							fStyle = FILL_WHITE;
							bDoHatch = true;
							bShadeOutline = false;
							break;
						case 10: // Hatched nubbles
							bDrawCenterDot = theStyleSheet.bBallCenterDot; 
							bDrawNubbles = true;
							bDoHatch = true;
							fStyle = FILL_WHITE;
							break; 
						case 11: // Hatched Pizza
							bDrawSpokes = true; 
							bDoHatch = true;
							fStyle = FILL_WHITE;
							break;
						case 13: // Hatched Inner parallel line
							sWeight = WEIGHT_1;
							fStyle = FILL_WHITE;
							bDoHatch = true;
							bDrawInnerMembrane = true;
							break;
						case 14: // Hatched Spiral
							bDrawSpiral = true;
							bDoHatch = true; 
							fStyle = FILL_WHITE;
							break;
					}
				}

				let nP = this.particleIndices.length; 
				for (let i=1; i<nP; i++){ 
					const ii = this.particleIndices[i];
					polyline0.push(myParticles[ii].p); 
				}
				out.push( new StyledPolyline(polyline0, true, true, false, false, sStyle, fStyle, sWeight, 0,0, bShadeOutline) );
				polyline0 = null; 

				
				if (bDoHatch){
					// Calculate center point (centroid)
					let scx = 0; 
					let scy = 0; 
					for (let i = 1; i < nP; i++) {
						scx += myParticles[this.particleIndices[i]].p.x;
						scy += myParticles[this.particleIndices[i]].p.y;
					}
					scx = scx/(nP-1);
					scy = scy/(nP-1);

					// Calculate max radius
					let rAvg = 0; 
					for (let i = 1; i < nP; i++) {
						let pix = myParticles[this.particleIndices[i]].p.x;
						let piy = myParticles[this.particleIndices[i]].p.y;
						let pdx = pix - scx;
						let pdy = piy - scy;
						let pdh = Math.sqrt(pdx*pdx + pdy*pdy); 
						if (pdh > rAvg) {rAvg = pdh; }
					} 
					const offset = 0.75 * rAvg;
					const ang = 0.85 * TWO_PI;
					const tx = offset * cos(ang);
					const ty = offset * sin(ang);
					scx += tx;
					scy += ty;

					for (let i = 1; i < nP; i++) {
						const ii = this.particleIndices[i];
						const ix = myParticles[ii].p.x;
						const iy = myParticles[ii].p.y;
						let j = i + 1; if (j == nP) {j = 1;}
						const ij = this.particleIndices[j];
						const jx = myParticles[ij].p.x;
						const jy = myParticles[ij].p.y;

						// Determine which ball segments to augment
						let dx = jx - ix;
						let dy = jy - iy;
						let dh = Math.sqrt(dx * dx + dy * dy);
						let cros = tx * dy/dh - ty * dx/dh;
						if (cros < 0) {
						
							// Subdivide the segments
							let nStrokesPerSeg  = max(1, Math.floor(Math.abs(cros)/2.0));
							for (let s = 0; s < nStrokesPerSeg; s++) {
								let st = ((s + myRandomAB(0.1,0.3) ) / nStrokesPerSeg);
								let sx1 = ix * (1.0 - st) + jx * st;
								let sy1 = iy * (1.0 - st) + jy * st;
								
								let a = tx * tx + ty * ty;
								let b = 2 * (tx * (sx1 - scx) + ty * (sy1 - scy));
								let c = scx * scx + scy * scy;
								c += sx1 * sx1 + sy1 * sy1;
								c -= 2 * (scx * sx1 + scy * sy1);
								c -= rAvg * rAvg;
								let bb4ac = b * b - 4 * a * c;

								// If they intersect the translated circle,
								if (! ((Math.abs(a) < 0.000001) || (bb4ac < 0))) {
									// Calculate the intersection with the translated circle
									let mu2 = (-b - Math.sqrt(bb4ac)) / (2 * a);
									let cix2 = sx1 + mu2 * tx; // circle intersection point
									let ciy2 = sy1 + mu2 * ty;

									let aPolyline = []; 
									aPolyline.push(createVector(sx1, sy1)); 
									aPolyline.push(createVector(cix2, ciy2)); 
									out.push( new StyledPolyline(aPolyline, false, false, true, false, STROKE_BLACK, FILL_BLACK, WEIGHT_1, 0,0) );
									aPolyline = null;
								}
							}
						}
					}
				}

				if (bDrawSpokes){
					let centerPoint = myParticles[ this.particleIndices[0] ].p;
					let fStyleInv = (fStyle == FILL_BLACK) ? FILL_WHITE : FILL_BLACK; 
					if (bDrawSpokesThickened){
						for (let i=1; i<nP; i+=spokeSkip){
							let aPolyline = []; 
							aPolyline.push(myParticles[ this.particleIndices[i] ].p); 
							aPolyline.push(centerPoint); 
							out.push( new StyledPolyline(aPolyline, false, false, bTaperSpokes, false, sStyle, fStyleInv, WEIGHT_1, 0,0) );

							let px = myParticles[ this.particleIndices[i] ].p.x;
							let py = myParticles[ this.particleIndices[i] ].p.y;
							let dx = px - centerPoint.x;
							let dy = py - centerPoint.y;
							let dh = Math.sqrt(dx*dx + dy*dy); 
							dx = WEIGHT_1 * dx/dh;
							dy = WEIGHT_1 * dy/dh;
							let qx = (px * 0.6) + (centerPoint.x * 0.4);
							let qy = (py * 0.6) + (centerPoint.y * 0.4);
							
							for (let k=-2; k<=2; k++){
								aPolyline = []; 
								aPolyline.push(createVector(qx,qy)); 
								aPolyline.push(createVector(px - k*dy, py + k*dx)); 
								out.push( new StyledPolyline(aPolyline, false, false, bTaperSpokes, false, sStyle, fStyleInv, WEIGHT_1, 0,0) );
								aPolyline = null;
							} 
						}
					} else {
						for (let i=1; i<nP; i+=spokeSkip){
							let aPolyline = []; 
							aPolyline.push(centerPoint); 
							aPolyline.push(myParticles[ this.particleIndices[i] ].p); 
							out.push( new StyledPolyline(aPolyline, false, false, bTaperSpokes, false, sStyle, fStyleInv, WEIGHT_1, 0,0) );
							aPolyline = null; 
						} 
					}
				}

				if (bDrawNubbles){
					let centerPoint = myParticles[ this.particleIndices[0] ].p;
					let outset = WEIGHT_1 * ((bShadeOutline && theStyleSheet.bUseVertexShadedLines) ? 0.5 : 1.618); 
					for (let i=1; i<nP; i++){
						const ii = this.particleIndices[i];
						let dx = myParticles[ii].p.x - centerPoint.x;
						let dy = myParticles[ii].p.y - centerPoint.y;
						let dh = Math.sqrt(dx*dx + dy*dy); 
						dx = dx/dh * outset;
						dy = dy/dh * outset;
						let px = myParticles[ii].p.x + dx;
						let py = myParticles[ii].p.y + dy;
						let aPolyline = []; 
						aPolyline.push( createVector(px, py) ); 
						out.push( new StyledPolyline(aPolyline, false, false, bTaperSpokes, true, STROKE_NONE, FILL_BLACK, WEIGHT_3, 0,0) );
						aPolyline = null;
					}
				}

				if (bDrawCenterDot){
					let centerPoint = myParticles[ this.particleIndices[0] ].p;
					let aPolyline = []; 
					aPolyline.push( centerPoint ); 
					if (fStyle == FILL_WHITE){
						out.push( new StyledPolyline(aPolyline, false, false, false, true, STROKE_BLACK, FILL_BLACK, WEIGHT_0, 0,0) );
					} else if (fStyle == FILL_BLACK){
						out.push( new StyledPolyline(aPolyline, false, false, false, true, STROKE_WHITE, FILL_WHITE, WEIGHT_1, 0,0) );
					}
					aPolyline = null;
				}

				if (bDrawPupil){
					let mxA = 0.333; // dilation
					let mxB = 1.0 - mxA;

					let cx = 0; 
					let cy = 0;
					for (let i=1; i<nP; i++){
						let ap = myParticles[ this.particleIndices[i] ].p;
						cx += ap.x; 
						cy += ap.y; 
					} 
					cx /= (nP-1); 
					cy /= (nP-1);

					let bBlinking = false;
					let maxHypId = 1; 
					if (mouseIsPressed){
						// move the center point
						let dch = 0; 
						let maxHyp = 0; 
						for (let i=1; i<nP; i++){
							let p0 = myParticles[ this.particleIndices[0] ].p;
							let ap = myParticles[ this.particleIndices[i] ].p;
							let dcx = (p0.x - ap.x); 
							let dcy = (p0.y - ap.y); 
							let hyp = Math.sqrt(dcx*dcx + dcy*dcy); 
							dch += hyp;
							if (hyp > maxHyp) {
								maxHyp = hyp;
								maxHypId = i;
							}
						} dch /= (nP-1); 
						dch *= mxB * 0.75;

						let dmx = mouseX - cx; 
						let dmy = mouseY - cy; 
						let dmh = Math.sqrt(dmx*dmx + dmy*dmy); 
						if (dmh > 0){
							let pct = Math.pow(Math.min(1.0, dmh / (BASE_DIM/2)), 0.25);
							dch *= pct;
							dmx /= dmh; 
							dmy /= dmh; 
							cx += dmx * dch;
							cy += dmy * dch;
							if ((simulationFrameCount % 600) == (this.id * 10)){
								bBlinking = true; 
							}
						}
					}

					let aPolyline = []; 
					for (let i=1; i<nP; i++){
						const ii = this.particleIndices[i];
						let px = (mxA*myParticles[ii].p.x) + (mxB*cx);
						let py = (mxA*myParticles[ii].p.y) + (mxB*cy);
						aPolyline.push( createVector(px, py) ); 
					}
					let pupilFill = (bBlinking) ? FILL_NONE : FILL_BLACK;
					out.push( new StyledPolyline(aPolyline, true, true, false, false, STROKE_BLACK, pupilFill, WEIGHT_0, 0,0)); 
					aPolyline = null;
				}

				if (bDrawInnerMembrane){
					let centerPoint = myParticles[ this.particleIndices[0] ].p;
					let aPolyline = []; 
					let inset = WEIGHT_2 * ((theStyleSheet.bUseVertexShadedLines) ? 2.0 : 1.414);
					for (let i=1; i<nP; i++){
						const ii = this.particleIndices[i];
						let dx = myParticles[ii].p.x - centerPoint.x;
						let dy = myParticles[ii].p.y - centerPoint.y;
						let dh = Math.sqrt(dx*dx + dy*dy); 
						dx = dx/dh * inset;
						dy = dy/dh * inset;
						let px = myParticles[ii].p.x - dx;
						let py = myParticles[ii].p.y - dy;
						aPolyline.push( createVector(px, py) ); 
					}
					out.push( new StyledPolyline(aPolyline, true, true, false, false, STROKE_BLACK, FILL_NONE, WEIGHT_0, 0,0)); 
					aPolyline = null;
				}

				if (bDrawSpiral){
					let centerPoint = myParticles[ this.particleIndices[0] ].p;
					const cx = centerPoint.x; 
					const cy = centerPoint.y;
					const nTurns = 5; 
					const totalSpiralPoints = nTurns * (nP-1); 

					let aPolyline = []; 
					for (let i=0; i<=totalSpiralPoints; i++){
						let A = i/totalSpiralPoints;
						let B = 1.0 - A; 
						let sid = 1 + (i%(nP-1)) // spoke index
						let ii = this.particleIndices[sid];
						let px = (A*myParticles[ii].p.x) + (B*cx);
						let py = (A*myParticles[ii].p.y) + (B*cy);
						aPolyline.push( createVector(px, py) ); 
					}
					out.push( new StyledPolyline(aPolyline, false, true, false, false, STROKE_BLACK, FILL_NONE, WEIGHT_0, 0,0)); 
					aPolyline = null; 
				}
			}
			break;

		//------------------
		case STRUCTURE_TYPE_STAR: // getContours
			{
				let bTapered = false; 
				let bDoNubbles = false; 
				let bDoWebbing = false;
				let bDoNubbleTapers = false;
				let starLineWeight = WEIGHT_1; 
				let nubbleEyeWeight = WEIGHT_2;
				let bDoCenterDot = false;
				let bDoNubbleEyes = false;

				switch(this.STYLE_ID){
					case 0: // Plain plain 
						break;
					case 1: // Tapered
						bTapered = true; 
						break;
					case 2: // Skinny with nubbles
						bDoNubbles = true; 
						bDoNubbleEyes = (this.mom.rand20K[4] < 0.30);
						nubbleEyeWeight = (this.mom.rand20K[5] < 0.2) ? WEIGHT_1 : WEIGHT_2;
						bTapered = false; 
						starLineWeight = WEIGHT_0;
						break;
					case 3: // Scary spider
						starLineWeight = WEIGHT_2;
						bDoWebbing = true;
						bTapered = true; 
						bDoCenterDot = theStyleSheet.bDoStarCenterDot;
						break;
					case 4: // Even thickness with nubbles and tapers
						starLineWeight = WEIGHT_1;
						bDoWebbing = true;
						bTapered = false; 
						bDoNubbles = true;
						bDoNubbleEyes = (this.mom.rand20K[4] < 0.15);
						nubbleEyeWeight = (this.mom.rand20K[5] < 0.8) ? WEIGHT_1 : WEIGHT_2;
						break;
					case 5: // 
						starLineWeight = WEIGHT_1;
						bDoWebbing = true;
						bTapered = false; 
						bDoNubbles = true;
						bDoNubbleEyes = (this.mom.rand20K[4] < 0.20);
						nubbleEyeWeight = (this.mom.rand20K[5] < 0.15) ? WEIGHT_1 : WEIGHT_2;
						bDoNubbleTapers = true;
						break;
					case 6: // 
						starLineWeight = WEIGHT_0;
						bDoNubbleTapers = true;
						bDoWebbing = true;
						break;
				}

				let starFillColor = FILL_BLACK;
				let starStrokeColor = STROKE_BLACK;
				if (bEnclosureIsBlack){
					starFillColor = FILL_WHITE;
					starStrokeColor = STROKE_WHITE;
				}
				
				// Determine number of spokes, by counting springs attached to 0'th particle.
				const nSpokes = this.PROPERTY_A;
				const centerIndex = this.particleIndices[0];

				// Draw the legs of the star
				let nSegs = ((this.particleIndices.length)-1)/nSpokes;
				for (let si = 1; si <= nSpokes; si++) {
					let aPolyline = [];
					aPolyline.push(myParticles[centerIndex].p); 
					for (let sj=0; sj<nSegs; sj++){
						const j = si + nSpokes*sj;
						const pij = this.particleIndices[j];
						aPolyline.push(myParticles[pij].p); 
					}
					if (nSegs == 1){
						out.push( new StyledPolyline(aPolyline, false, true, bTapered, false, STROKE_NONE, starFillColor, starLineWeight, 0,0) );
					} else {
						out.push( new StyledPolyline(aPolyline, false, true, bTapered, false, starStrokeColor, FILL_NONE, starLineWeight, 0,0) );
					}
					aPolyline = null; 
				}
			
				if (bDoWebbing){
					const i0 = this.particleIndices[0];
					let pi0 = myParticles[i0].p; 
					let x0 = pi0.x;
					let y0 = pi0.y;

					let nWebs = 16; 
					for (let si = 1; si <= nSpokes; si++) {
						const j = (si  )%nSpokes+1;
						const k = (si+1)%nSpokes+1;
						const pj = this.particleIndices[j];
						const pk = this.particleIndices[k];
						let jx = myParticles[pj].p.x;
						let jy = myParticles[pj].p.y;
						let kx = myParticles[pk].p.x;
						let ky = myParticles[pk].p.y;
						
						for (let i=0; i<nWebs; i++){
							const t0 = i/nWebs;
							const t1 = 1-t0; 

							let px = t0*x0 + t1*jx;
							let py = t0*y0 + t1*jy;
							let qx = t1*x0 + t0*kx;
							let qy = t1*y0 + t0*ky;

							let aPolyline = [];
							aPolyline.push(createVector(px, py)); 
							aPolyline.push(createVector(qx, qy)); 
							// FILL_BLACK fill because it's a 2-point polyline, thus it's rendered as a filled quad
							out.push( new StyledPolyline(aPolyline, false, true, false, false, STROKE_NONE, starFillColor, WEIGHT_1, 0,0) );
							aPolyline = null; 
						}
					}
				}

				if (bDoNubbleTapers){
					for (let si = 1; si <= nSpokes; si++) {
						const j = si + nSpokes*(nSegs-1);
						const i = (nSegs == 1) ? 0 : si + nSpokes*(nSegs-2);
						const pij = this.particleIndices[j];
						const pii = this.particleIndices[i];
						let baseX = myParticles[pij].p.x;
						let baseY = myParticles[pij].p.y;
						let tipX = myParticles[pii].p.x;
						let tipY = myParticles[pii].p.y;
						let aStyledElement = [];
						aStyledElement = this.createWedgePolyline (baseX, baseY, tipX, tipY, WEIGHT_2*0.9, 7, 0.6);
						out.push( new StyledPolyline(aStyledElement, false, false, false, false, starStrokeColor, FILL_NONE, WEIGHT_0, 0,0) );
						aStyledElement = null;
					}
				}

				if (bDoNubbles){
					let aStyledDot = []; // terminal dots
					const i0 = this.particleIndices[0];
					aStyledDot.push(myParticles[i0].p); 
					out.push( new StyledPolyline(aStyledDot, false, false, false, true, STROKE_NONE, starFillColor, WEIGHT_3, 0,0));
					for (let si = 1; si <= nSpokes; si++) {
						const j = si + nSpokes*(nSegs-1);
						const pij = this.particleIndices[j];
						let aStyledDot = [];
						aStyledDot.push(myParticles[pij].p); 
						out.push( new StyledPolyline(aStyledDot, false, false, false, true, STROKE_NONE, starFillColor, WEIGHT_1, 0,0)); 
						out.push( new StyledPolyline(aStyledDot, false, false, false, true, STROKE_NONE, starFillColor, WEIGHT_2, 0,0)); 
						out.push( new StyledPolyline(aStyledDot, false, false, false, true, STROKE_NONE, starFillColor, WEIGHT_3, 0,0)); 
						
						if (bDoNubbleEyes){
							let aStyledDot = [];
							aStyledDot.push(myParticles[pij].p); 
							out.push( new StyledPolyline(aStyledDot, false, false, false, true, STROKE_NONE, 1-starFillColor, nubbleEyeWeight, 0,0)); 
						}
						aStyledDot = null; 
					} 
				}

				if (bDoCenterDot){
					const i0 = this.particleIndices[0];
					const cx = myParticles[i0].p.x;
					const cy = myParticles[i0].p.y;

					let aPolyline = [];
					if (this.id%2 == 0){
						aPolyline.push(createVector(cx, cy)); 
						out.push( new StyledPolyline(aPolyline, false, false, false, true, starStrokeColor, 1-starFillColor, WEIGHT_2, 0,0) );
					} else {
						for (let si = 1; si <= nSpokes; si++) {
							const pj = this.particleIndices[si];
							const jx = myParticles[pj].p.x;
							const jy = myParticles[pj].p.y;
							const px = (4*cx + jx)/5;
							const py = (4*cy + jy)/5;
							aPolyline.push(createVector(px, py)); 
						}
						out.push( new StyledPolyline(aPolyline, true, true, false, false, starStrokeColor, 1-starFillColor, WEIGHT_1, 0,0) );
					}
					aPolyline = null; 
				}
			}
			break;
		
		//------------------
		case STRUCTURE_TYPE_TREE:  // getContours
			{
				let bDoTaper = false; 
				let bDoNubbles = false; 
				let bDoElbows = false;
				let bDoStringArtJoints = false;

				switch(this.STYLE_ID){
					case 0: // plain
						bDoStringArtJoints = true;
						break;
					case 1: // taper
						bDoTaper = true; 
						bDoElbows = true;
						break;
					case 2: // nubbles
						bDoNubbles = true; 
						break;
					case 3: // taper & nubbles
						bDoTaper = true; 
						bDoElbows = true;
						bDoNubbles = true; 
						break;
				}

				let treeFillColor = FILL_BLACK;
				let treeStrokeColor = STROKE_BLACK;
				if (bDoNubbles || bDoTaper || bDoStringArtJoints){
					// Count nSpringsAttachedTo for each particle in the tree
					for (let i=0; i<nSprings; i++){
						(this.springs[i].getP()).nSpringsAttachedTo = 0; 
						(this.springs[i].getQ()).nSpringsAttachedTo = 0; 
					}
					for (let i=0; i<nSprings; i++){
						(this.springs[i].getP()).nSpringsAttachedTo++; 
						(this.springs[i].getQ()).nSpringsAttachedTo++; 
					}
				}

				if (!bDoTaper){
					for (let i=0; i<nSprings; i++){
						let aPolyline = [];
						const P = this.springs[i].getP(); 
						const Q = this.springs[i].getQ();
						aPolyline.push(P.p);
						aPolyline.push(Q.p);
						out.push( new StyledPolyline(aPolyline, false, true, false, false, STROKE_NONE, treeFillColor, WEIGHT_1, 0,0) );
						aPolyline = null; 
					}
				} else if (bDoTaper){
					for (let i=0; i<nSprings; i++){
						let aPolyline = [];
						const P = this.springs[i].getP(); 
						const Q = this.springs[i].getQ();
						aPolyline.push(P.p);
						aPolyline.push(Q.p);
						let nMin = min(P.nSpringsAttachedTo, Q.nSpringsAttachedTo); 
						let W = WEIGHT_2 * (this.springs[i].getRestLength() / this.mom.REST_L);
						if (nMin == 1){
							out.push( new StyledPolyline(aPolyline, false, true, true, false, STROKE_NONE, treeFillColor, W, 0,0) ); 
						} else {
							out.push( new StyledPolyline(aPolyline, false, true, false, false, STROKE_NONE, treeFillColor, W, 0,0) );
						}
						aPolyline = null; 
					}
				}

				if (bDoElbows){
					for (let i=0; i<nSprings; i++){
						const P = this.springs[i].getP(); 
						const Q = this.springs[i].getQ();
						let nMin = min(P.nSpringsAttachedTo, Q.nSpringsAttachedTo); 
						if (nMin > 1){
							let aDot = [];
							aDot.push(P.p);
							let W = (bDoTaper) ? WEIGHT_2 * (this.springs[i].getRestLength() / this.mom.REST_L) : WEIGHT_3; 
							out.push( new StyledPolyline(aDot, false, false, false, true, STROKE_NONE, treeFillColor, W, 0,0)); // ball joint
							aDot = null;
						}
					}
				}

				if (bDoStringArtJoints){
					const fA = 0.55;
					const fB = 1.0-fA; 
					for (let i=0; i<nSprings; i++){
						let branchFrac = this.springs[i].getRestLength() / this.mom.REST_L;
						if (branchFrac > 0.70){

							const Q = this.springs[i].getQ();
							if (Q.nSpringsAttachedTo > 1){

								let dK = Math.max(0, this.springs[i].getDistention())/this.mom.REST_L;
								const nK = ~~(5 + dK); 
								const nKm1 = nK-1;
								
								const P = this.springs[i].getP();  
								for (let j=(i+1); j<nSprings; j++){
									const R = this.springs[j].getP(); 
									if (R == Q){
										const S = this.springs[j].getQ(); 
										for (let k=1; k<nKm1; k++){
											const frac = k/nKm1;
											const A = (1.0 - frac) * fA; 
											const B = 1.0 - A; 
											const C = 1.0 - frac * (1.0-fB); //// map(k,0,nKm1, 1.0,fB);
											const D = 1.0 - C; 
											const pqx = A*P.p.x + B*Q.p.x;
											const pqy = A*P.p.y + B*Q.p.y;
											const rsx = C*R.p.x + D*S.p.x;
											const rsy = C*R.p.y + D*S.p.y;

											let aPolyline = [];
											aPolyline.push(createVector(pqx, pqy)); 
											aPolyline.push(createVector(rsx, rsy)); 
											out.push( new StyledPolyline(aPolyline, false, false, false, false, treeStrokeColor, treeFillColor, WEIGHT_1, 0,0)); 
											aPolyline = null; 
										}
									}
								}
							}
						}
					}
				}

				if (bDoNubbles){
					for (let i=0; i<nSprings; i++){
						let Q = this.springs[i].getQ();
						if (Q.nSpringsAttachedTo == 1){
							let aPolyline = [];
							aPolyline.push(Q.p);
							out.push( new StyledPolyline(aPolyline, false, false, false, true, STROKE_NONE, treeFillColor, WEIGHT_3, 0,0)); 
							aPolyline = null; 
						}
					}
				}
			}
			break;
			
		//------------------
		case STRUCTURE_TYPE_LOOP: // getContours
			{
				let outerW = WEIGHT_1; 
				let outerS = STROKE_BLACK; 
				let outerF = FILL_NONE; //WHITE;
				
				let bDrawInnerMembrane = false; 
				let innerW = WEIGHT_0;
				let innerS = STROKE_BLACK;
				let innerF = FILL_NONE;
				let innerDash = 0; 
				let bShadeLines = false;

				if (bSimplified){
					;
				} else {
					
					if (this.STYLE_ID == 0){ // black line, no fill, no membrane 
						bShadeLines = true;
						outerW = WEIGHT_2; 
					} else if (this.STYLE_ID == 1){ // black shape
						bDrawInnerMembrane = true; 
						outerF = FILL_BLACK;
						innerW = WEIGHT_1;
						innerS = STROKE_WHITE;
						innerF = FILL_NONE;
					} else if (this.STYLE_ID == 2){ // white with membrane
						bDrawInnerMembrane = true;
						if (this.mom.rand20K[17] < 0.85){
							bShadeLines = true;
							outerW = WEIGHT_1 * 1.5; 
						}
						outerF = FILL_NONE;
						innerF = FILL_NONE;
					} else if (this.STYLE_ID == 3){ // black shape with outer but no inner membrane
						bDrawInnerMembrane = true;
						outerF = FILL_WHITE;
						innerS = STROKE_NONE;
						innerF = FILL_BLACK;
					} else if (this.STYLE_ID == 4){ // black with membranes
						bDrawInnerMembrane = true;
						outerF = FILL_WHITE;
						innerF = FILL_BLACK;
					} else if (this.STYLE_ID == 5){ // bubble
						bDrawInnerMembrane = true;
						outerF = FILL_NONE;
						innerF = FILL_NONE;
						innerDash = 3; 
					} else if (this.STYLE_ID == 6){
						bShadeLines = true;
						outerW = WEIGHT_1; 
						outerS = STROKE_BLACK; 
						outerF = FILL_NONE;
					}
				}

				if (this.bDisplayEnclosedBlobs){ // then also calculate bbox
					let rL = Number.POSITIVE_INFINITY;
					let rR = Number.NEGATIVE_INFINITY; 
					let rT = Number.POSITIVE_INFINITY;
					let rB = Number.NEGATIVE_INFINITY; 
					for (let i=0; i<this.particleIndices.length; i++){ 
						const ii = this.particleIndices[i];
						let aParticle = myParticles[ii].p; 
						polyline0.push(aParticle); 
						if (aParticle.x < rL) { rL = aParticle.x; }
						if (aParticle.x > rR) { rR = aParticle.x; }
						if (aParticle.y < rT) { rT = aParticle.y; }
						if (aParticle.y > rB) { rB = aParticle.y; }
					}
					this.boundingBox = {"L":rL, "T":rT, "R":rR, "B":rB};
				} else {
					for (let i=0; i<this.particleIndices.length; i++){ 
						const ii = this.particleIndices[i];
						polyline0.push(myParticles[ii].p); 
					}
				}

				out.push( new StyledPolyline(polyline0, true, true, false, false, outerS, outerF, outerW, 0,0, bShadeLines) );
				polyline0 = null;

				if (bDrawInnerMembrane){
					let inset = WEIGHT_2 * 1.414; 
					let npi = this.particleIndices.length;
					let aPolyline = []; 
					for (let i=0; i<npi; i++){ 
						const i0 = this.particleIndices[i];
						const i1 = this.particleIndices[(i+1)%npi];

						const pax = myParticles[i0].p.x;
						const pay = myParticles[i0].p.y;
						const pbx = myParticles[i1].p.x;
						const pby = myParticles[i1].p.y;

						let dx = pbx - pax;
						let dy = pby - pay;
						let dh = Math.sqrt(dx*dx + dy*dy); 
						dx = dx/dh * inset;
						dy = dy/dh * inset;
						let px = pax - dy;
						let py = pay + dx;
						aPolyline.push( createVector(px, py) ); 
					}
					out.push( new StyledPolyline(aPolyline, true, true, false, false, innerS, innerF, innerW, innerDash,innerDash, bShadeLines)); 
					aPolyline = null;
				}
			}
			break;

		//------------------
		case STRUCTURE_TYPE_DASH: // getContours
			if (this.particleIndices.length == 2){
				const i0 = this.particleIndices[0];
				const i1 = this.particleIndices[1];
				const pax = myParticles[i0].p.x;
				const pay = myParticles[i0].p.y;
				const pbx = myParticles[i1].p.x;
				const pby = myParticles[i1].p.y;

				if (true){ // all styles have the tail
					if (this.mom.TEMPERATURE > 0){
						this.history.shift(); 
						this.history.push( createVector(pbx,pby)); 
					}
					let aPolyline = [];
					for (let i=this.history.length-1; i>=0; i--){
						aPolyline.push( this.history[i]); 
					}
					out.push( new StyledPolyline(aPolyline, false, true, true, false, STROKE_BLACK, FILL_NONE, WEIGHT_0, 0,0) ); 
					aPolyline = null;
				}

				if (bSimplified || this.STYLE_ID == 0){
					// plain dash
					let aPolyline = [];
					aPolyline.push( createVector(pax, pay)); 
					aPolyline.push( createVector(pbx, pby)); 
					out.push( new StyledPolyline(aPolyline, false, true, false, false, STROKE_NONE, FILL_BLACK, WEIGHT_1, 0,0) ); 
					aPolyline = null;
				
				} else if (this.STYLE_ID == 1){
					// cluster of dots
					let cx = (pbx + pax)/2;
					let cy = (pby + pay)/2;
					let dx = (pbx - pax)/2; 
					let dy = (pby - pay)/2; 
					let dh = Math.sqrt(dx*dx + dy*dy); 
					let aPolyline;

					let vx = myParticles[i0].v.x;
					let vy = myParticles[i0].v.y;
					let vh = Math.sqrt(vx*vx + vy*vy);

					for (let i=0; i<8; i++){
						let ra = Math.atan2(vy,vx); //myRandomA(TWO_PI) + ang;//Math.atan2(vy,vx) + ang ; //
						let rr = (0.25+vh) * myRandomGaussian(0, dh);
						let rw = (abs(rr) < dh) ? WEIGHT_2 : WEIGHT_1; 
						let px = pbx + 0.33 * rr*Math.cos(ra);  
						let py = pby + 0.33 * rr*Math.sin(ra);  
						aPolyline = [];
						aPolyline.push( createVector(px,py)); 
						out.push( new StyledPolyline(aPolyline, false, false, false, true, STROKE_NONE, FILL_BLACK, rw, 0,0) ); 
					}
					aPolyline = null;

				} else if (this.STYLE_ID == 2){
					// thatch of lines
					let dx = (pbx - pax)/2; 
					let dy = (pby - pay)/2; 
					let cx = (pbx + pax)/2;
					let cy = (pby + pay)/2;

					let nt = 5; 
					let spread = 0.125;  
					let aPolyline;
					for (let i=0; i<nt; i++){
						let t = spread * map(i,0,nt-1, -1,1); 
						let amp = Math.sin(map(i,0,nt-1, 0.3,PI-0.3));

						let ra = amp*myRandomAB(0.8, 1.0);
						let cax = (cx - dy*t) + ra*dx;
						let cay = (cy + dx*t) + ra*dy;
						let rb = amp*myRandomAB(0.5, 0.9);
						let cbx = (cx - dy*t) - rb*dx;
						let cby = (cy + dx*t) - rb*dy;
						
						aPolyline = [];
						aPolyline.push( createVector(cax,cay)); 
						aPolyline.push( createVector(cbx,cby)); 
						out.push( new StyledPolyline(aPolyline, false, true, false, false, STROKE_NONE, FILL_BLACK, WEIGHT_1, 0,0) ); 
					}
					aPolyline = null;

				} else if (this.STYLE_ID == 3){
					// wedge
					let aPolyline = [];
					let pointiness = map(Math.sin(this.id + this.mom.myMillis/500),-1,1, 0.25,0.75);

					aPolyline = this.createWedgePolyline (pax, pay, pbx, pby, WEIGHT_2, 3, pointiness);
					out.push( new StyledPolyline(aPolyline, false, false, false, false, STROKE_BLACK, FILL_NONE, WEIGHT_0, 0,0) ); 
					aPolyline = [];
					aPolyline.push( createVector(pax, pay)); 
					out.push( new StyledPolyline(aPolyline, false, false, false, true, STROKE_NONE, FILL_BLACK, WEIGHT_2, 0,0) ); 
					aPolyline = null;
				}
			}
			break;

		//------------------
		case STRUCTURE_TYPE_LINE: // getContours
			{
				let bDoBlurpStart = false; 
				let bDoBlurpEnd = false; 
				let bTaperBody = false;
				let bMakeSinOutline = false;
				let lineBodyWeight = WEIGHT_1;
				let sineBodyWeight = WEIGHT_0; 
				let hairLen = 0.45; 
				let nHairsPerSeg = 3;
				let bMakeBodyHairs = false;
				let bShadeLines = false;

				switch(this.STYLE_ID){
					case 0: // plain plain 
						lineBodyWeight = (WEIGHT_1 + WEIGHT_2)/2;
						bShadeLines = true; 
						break;
					case 1: // NubblesAndBlurps on terminals
						bShadeLines = true;
						bDoBlurpStart = true; 
						bDoBlurpEnd = true; 
						break;
					case 2: 
						bDoBlurpStart = true; 
						bTaperBody = true; 
						lineBodyWeight = WEIGHT_0;
						break;
					case 3: // leaf, Sine outline A
						bTaperBody = true;
						bDoBlurpEnd = true;
						lineBodyWeight = WEIGHT_0;
						sineBodyWeight = WEIGHT_1; 
						bMakeSinOutline = true;
						hairLen = 0.30;
						break;
					case 4: // Sine outline B
						lineBodyWeight = 0.0;
						sineBodyWeight = WEIGHT_1; 
						bMakeSinOutline = true;
						bMakeBodyHairs = true;
						hairLen = 0.30;
						break;
					case 5: // hairy
						bTaperBody = true;
						bDoBlurpStart = true;
						bMakeBodyHairs = true;
						hairLen = 0.45;
						break;
					case 6: // only used as flagellum 
						bTaperBody = true; 
						lineBodyWeight = WEIGHT_1;
						break;
				}

				let lineFillColor = FILL_BLACK;
				let lineStrokeColor = STROKE_BLACK;
				if (bEnclosureIsBlack){
					lineFillColor = FILL_WHITE;
					lineStrokeColor = STROKE_WHITE;
				}

				const npl = this.particleIndices.length;
				if (lineBodyWeight > 0){
					for (let i=0; i<npl; i++){ 
						const ii = this.particleIndices[i];
						polyline0.push(myParticles[ii].p); 
					}
					out.push( new StyledPolyline(polyline0, false, true, bTaperBody, false, lineStrokeColor, FILL_NONE, lineBodyWeight, 0,0, bShadeLines)); 
					polyline0 = null;
				}

				// Hairs
				if (bMakeBodyHairs){
					const npm1Elts = (npl-1)*nHairsPerSeg;
					let aStyledElement = [];

					let rib = 0;
					let ribBend = (bMakeSinOutline) ? 0.1 : 1.0; 
					for (let i=0; i<(npl-1); i++){ 
						const ia = this.particleIndices[i];
						const ib = this.particleIndices[i+1];
						const pax = myParticles[ia].p.x;
						const pay = myParticles[ia].p.y;
						const pbx = myParticles[ib].p.x;
						const pby = myParticles[ib].p.y;
						const dx = (pbx - pax)*hairLen; 
						const dy = (pby - pay)*hairLen; 

						rib = ribBend*(1.0 - i/npl); 
						let ribdx = rib*dx;
						let ribdy = rib*dy;
						for (let j=0; j<nHairsPerSeg; j++){
							let px = lerp(pax, pbx, j/nHairsPerSeg); 
							let py = lerp(pay, pby, j/nHairsPerSeg); 
							let sint = Math.sin(map(i*nHairsPerSeg+j, 0,npm1Elts, 0,PI)); 

							aStyledElement = [];
							aStyledElement.push(createVector(px, py)); 
							aStyledElement.push(createVector(px + sint*dy + ribdx, py - sint*dx + ribdy)); 
							out.push( new StyledPolyline(aStyledElement, false, false, true, false, STROKE_NONE, lineFillColor, WEIGHT_0, 0,0));
							aStyledElement = [];
							aStyledElement.push(createVector(px, py)); 
							aStyledElement.push(createVector(px - sint*dy + ribdx, py + sint*dx + ribdy)); 
							out.push( new StyledPolyline(aStyledElement, false, false, true, false, STROKE_NONE, lineFillColor, WEIGHT_0, 0,0));
						}
					}
					aStyledElement = null;
				}

				if (bMakeSinOutline){
					const Nz = 2; 
					let pax, pay, pbx, pby;
					let taperSine = false;
					for (let z=0; z<Nz; z++){
						let aStyledElement = [];
						let zSign = map(z, 0,Nz-1, -1,1);
						for (let i=0; i<(npl-1); i++){ 
							const ia = this.particleIndices[i];
							const ib = this.particleIndices[i+1];
							pax = myParticles[ia].p.x;
							pay = myParticles[ia].p.y;
							pbx = myParticles[ib].p.x;
							pby = myParticles[ib].p.y;
							const dx = (pbx - pax)*hairLen; 
							const dy = (pby - pay)*hairLen; 
							let sint = Math.sin(map(i, 0,npl-1, 0,PI)); 
							sint = zSign * Math.pow(sint, 0.5); 
							aStyledElement.push(createVector(pax + sint*dy, pay - sint*dx)); 
						}
						aStyledElement.push(createVector(pbx, pby)); 
						if (z > 0) {
							sineBodyWeight = WEIGHT_2;
							taperSine = true;
						}
						out.push( new StyledPolyline(aStyledElement, false, true, taperSine, false, lineStrokeColor, FILL_NONE, sineBodyWeight, 0,0));
						aStyledElement = null;
					}
				}

				// Blurps on terminals
				if (this.particleIndices.length >= 2){
					let aStyledElement;
					let baseX, baseY, tipX, tipY; 
					let bWhiteEyeBlurps = (!bShadeLines) && (this.mom.rand20K[7] < 0.2)
					let bWhiteEyeWeight = (this.mom.rand20K[3] < 0.4) ? WEIGHT_1 : WEIGHT_2; 

					if (bDoBlurpStart){
						const ia = this.particleIndices[0];
						const ib = this.particleIndices[1];
						
						baseX = myParticles[ia].p.x;
						baseY = myParticles[ia].p.y;
						tipX = myParticles[ib].p.x;
						tipY = myParticles[ib].p.y;
						aStyledElement = [];
						aStyledElement = this.createWedgePolyline (baseX, baseY, tipX, tipY, WEIGHT_2, 7, 0.5);
						out.push( new StyledPolyline(aStyledElement, false, false, false, false, lineStrokeColor, FILL_NONE, WEIGHT_0, 0,0)); 

						aStyledElement = [];
						aStyledElement.push(myParticles[ia].p); // first terminal
						out.push( new StyledPolyline(aStyledElement, false, false, false, true, lineStrokeColor, lineFillColor, WEIGHT_1, 0,0));
						out.push( new StyledPolyline(aStyledElement, false, false, false, true, lineStrokeColor, lineFillColor, WEIGHT_2, 0,0));
						out.push( new StyledPolyline(aStyledElement, false, false, false, true, lineStrokeColor, lineFillColor, WEIGHT_3, 0,0));
						
						if (bWhiteEyeBlurps){ 
							aStyledElement = [];
							aStyledElement.push(myParticles[ia].p); // first terminal
							out.push( new StyledPolyline(aStyledElement, false, false, false, true, STROKE_NONE, 1-lineFillColor, bWhiteEyeWeight, 0,0));
						}
						aStyledElement = null;
					} 
					if (bDoBlurpEnd){
						const iy = this.particleIndices[this.particleIndices.length-2];
						const iz = this.particleIndices[this.particleIndices.length-1];

						baseX = myParticles[iz].p.x;
						baseY = myParticles[iz].p.y;
						tipX = myParticles[iy].p.x;
						tipY = myParticles[iy].p.y;
						aStyledElement = [];
						aStyledElement = this.createWedgePolyline (baseX, baseY, tipX, tipY, WEIGHT_2, 7, 0.5);
						out.push( new StyledPolyline(aStyledElement, false, false, false, false, lineStrokeColor, FILL_NONE, WEIGHT_0, 0,0)); 

						aStyledElement = [];
						aStyledElement.push(myParticles[iz].p); // last terminal
						out.push( new StyledPolyline(aStyledElement, false, false, false, true, lineStrokeColor, lineFillColor, WEIGHT_1, 0,0));
						out.push( new StyledPolyline(aStyledElement, false, false, false, true, lineStrokeColor, lineFillColor, WEIGHT_2, 0,0));
						out.push( new StyledPolyline(aStyledElement, false, false, false, true, lineStrokeColor, lineFillColor, WEIGHT_3, 0,0));

						if (bWhiteEyeBlurps){
							aStyledElement = [];
							aStyledElement.push(myParticles[iz].p); // first terminal
							out.push( new StyledPolyline(aStyledElement, false, false, false, true, STROKE_NONE, 1-lineFillColor, bWhiteEyeWeight, 0,0));
						}
						aStyledElement = null;
					}
				}
			}
			break;
			
		//------------------
		case STRUCTURE_TYPE_TRUSS: // getContours
			{
				let bDrawContour = true;
				let bDrawSpine = false; 
				let bDrawEye1 = false; 
				let bDrawEye2 = false;
				let bDrawSegments = false;
				let bDrawThickDashedSpine = false;
				let bShadeLines = false; 
				let bIntestine = false; 
				let fStyle = FILL_WHITE;
				let sStyle = STROKE_BLACK;
				let contourWeight = WEIGHT_2;
				let nP = this.particleIndices.length; 

				if (bSimplified){
					;
				} else {
					switch(this.STYLE_ID){
						case 0: // simple empty loop
							bShadeLines = true;
							break;
						case 1: // one-eyed, no spine
							bDrawEye1 = true; 
							break;
						case 2: // intestine
							bIntestine = true;
							bShadeLines = true;
							bDrawSpine = true;
							break;
						case 3: // long thin stripe and eyes
							bDrawEye1 = true; 
							bDrawEye2 = true; 
							bDrawSpine = true;
							bShadeLines = true; 
							break;
						case 4: // dashed thick stripe
							bDrawThickDashedSpine = true; 
							bShadeLines = true;
							break;
						case 5: // segmented
							bDrawSegments = true;
							break;
						case 6: // black outline, pattern fill
							fStyle = FILL_BLACK;
							sStyle = STROKE_WHITE;
							contourWeight = WEIGHT_1;
							break;
						case 7: // INVISIBLE
							bDrawContour = false;
							break;
					}
				}

				// Draw main outer contour 
				if (bDrawContour){
					let aPolyline = [];
					if (!bIntestine){ // Regular!
						for (let i=0; i<nP; i+=2){ 
							const ie = this.particleIndices[i];
							polyline0.push(myParticles[ie].p); }
						for (let i=(nP-1); i>0; i-=2){ 
							const io = this.particleIndices[i];
							polyline0.push(myParticles[io].p); }
						out.push( new StyledPolyline(polyline0, true, true, false, false, sStyle, fStyle, contourWeight, 0,0, bShadeLines) );

					} else { // intestines
						const nCycles = TWO_PI * nP / 6; 
						const intestineTime = this.mom.myMillis/100.0;
						const peristalsisAmp = 0.1 * this.mom.fadeInPhysics; 
						for (let i=0; i<=(nP-2); i+=2){ 
							let ie = this.particleIndices[i];
							let io = this.particleIndices[i+1];
							let pA = 1.0 + peristalsisAmp * Math.sin(intestineTime + map(i, 0, nP, 0, nCycles));
							let pB = 1.0-pA;
							let px = pA*myParticles[ie].p.x + pB*myParticles[io].p.x;
							let py = pA*myParticles[ie].p.y + pB*myParticles[io].p.y;
							polyline0.push(createVector(px,py)); 
						}
						for (let i=(nP-1); i>1; i-=2){ 
							let io = this.particleIndices[i];
							let ie = this.particleIndices[i-1];
							let pA = 1.0 + peristalsisAmp * Math.sin(intestineTime + map(i-1, 0, nP, 0, nCycles));
							let pB = 1.0-pA;
							let px = pA*myParticles[io].p.x + pB*myParticles[ie].p.x;
							let py = pA*myParticles[io].p.y + pB*myParticles[ie].p.y;
							polyline0.push(createVector(px,py)); 
						}
						let i1 = this.particleIndices[1];
						polyline0.push(myParticles[i1].p); 
						out.push( new StyledPolyline(polyline0, true, true, false, false, sStyle, fStyle, WEIGHT_2, 0,0, bShadeLines) );
					}
				}

				polyline0 = null;
				// Draw "eyes" at the end(s) of the truss
				if (bDrawEye1 || bDrawEye2){
					const eyeBools = [bDrawEye1, bDrawEye2]; 
					const eyeIds = [[0,1,2,3] , [nP-4,nP-3,nP-2,nP-1]];
					for (let e=0; e<eyeBools.length; e++){
						if (eyeBools[e]){
							if (nP >= 4){
								let eyeIdSet = eyeIds[e];
								let ie = this.particleIndices[eyeIdSet[0]];
								let io = this.particleIndices[eyeIdSet[1]];
								let je = this.particleIndices[eyeIdSet[2]];
								let jo = this.particleIndices[eyeIdSet[3]];
								let iex = myParticles[ie].p.x, iey = myParticles[ie].p.y; 
								let iox = myParticles[io].p.x, ioy = myParticles[io].p.y; 
								let jex = myParticles[je].p.x, jey = myParticles[je].p.y; 
								let jox = myParticles[jo].p.x, joy = myParticles[jo].p.y; 
								let px = (iex + iox + jex + jox)/4;
								let py = (iey + ioy + jey + joy)/4;
								let dx = iex - iox; 
								let dy = iey - ioy; 
								let dh = sqrt(dx*dx + dy*dy); 
								
								let noi = noise(this.id + simulationFrameCount/100.0); 
								let W = dh * map(noi, 0,1, 0.1,0.5);
								let aPolyline = [];
								aPolyline.push(createVector(px, py) ); 
								out.push( new StyledPolyline(aPolyline, false, false, false, true, STROKE_BLACK, FILL_NONE, W, 0,0) );
								aPolyline = null;
							}
						}
					}
				}

				if (bDrawSegments){
					let starti = 2;
					let endi = nP-2; 
					for (let i=starti; i<endi; i+=2){ 
						let ie = this.particleIndices[i];
						let io = this.particleIndices[i+1];
						let iex = myParticles[ie].p.x;
						let iey = myParticles[ie].p.y; 
						let iox = myParticles[io].p.x;
						let ioy = myParticles[io].p.y; 
						let aPolyline = [];
						aPolyline.push(createVector(iex,iey));
						aPolyline.push(createVector(iox,ioy)); 
						out.push ( new StyledPolyline(aPolyline, false, false, false, false, STROKE_BLACK, FILL_BLACK, WEIGHT_0, 0,0)); 
						aPolyline = null;
					}
				}

				// A stripe that runs down the middle, possibly dashed
				if (bDrawSpine || bDrawThickDashedSpine){
					if (nP > 4){
						let starti = 2;
						let endi = nP-2; 
						let aPolyline = [];
						for (let i=starti; i<endi; i+=2){ 
							let ie = this.particleIndices[i];
							let io = this.particleIndices[i+1];
							let iex = myParticles[ie].p.x, iey = myParticles[ie].p.y; 
							let iox = myParticles[io].p.x, ioy = myParticles[io].p.y; 
							let px = (iex + iox)/2;
							let py = (iey + ioy)/2;
							aPolyline.push( createVector(px, py) ); 
						}
						if (bDrawSpine){
							out.push ( new StyledPolyline(aPolyline, false, true, false, false, STROKE_BLACK, FILL_NONE, WEIGHT_0, 0,0));
						} else if (bDrawThickDashedSpine){
							out.push ( new StyledPolyline(aPolyline, false, true, false, false, STROKE_BLACK, FILL_NONE, WEIGHT_3, 1,4));
						}
						aPolyline = null;
					}
				}
			}
			break;
		
		//------------------
		case STRUCTURE_TYPE_WHEEL: // getContours
			{
				let bDrawInnerLoop = true;
				let bDrawOuterLoop = true;
				let nRadialLinesPerSegment = 0;
				let bTaperRadialLines = false;
				let bFlipTaperingRadialLineDir = false;
				let nAnnularLoops = 0;
				let bWheelDecorativeNuclei = false; 
				let bDrawCellBevelsInner = false;
				let bDrawCellBevelsOuter = false;
				let bBiasAnnularLoopsToOutside = false; 
				let bBiasAnnularDashesToOutside = false;
				let annularLoopMaxGap = 0; 
				let annularLoopMaxDash = 3;
				let bDrawOuterParticles = false;
				let innerLoopWeight = WEIGHT_2; 
				let outerLoopWeight = WEIGHT_2; 
				let innerLoopStroke = STROKE_BLACK;
				let outerLoopStroke = STROKE_BLACK;
				let innerLoopFill = FILL_NONE;
				let outerLoopFill = FILL_NONE;
				let bShadeOuter = true;
				let bShadeInner = true;
				let bDottedOuter = false;
				let bWheelCellBoxes = false;
				let bWheelCellBoxes2 = false;
				let bTinyDashedInner = false;
				let bWigglyFlute = false; 
				let bDrawAllRadialLines = true;

				let scrunchTickProb = theStyleSheet.scrunchTickProbabilities[this.STYLE_ID]/100.0;
				let bAddWheelScrunchTicks = (this.mom.rand20K[ this.STYLE_ID ] < scrunchTickProb);

				if (bSimplified){
					bDrawOuterLoop = true;
					bDrawInnerLoop = false;
				} else {

					switch(this.STYLE_ID){
						case 0: // bold outer loop, inner thin line
							bDrawInnerLoop = false;
							nAnnularLoops = (this.bDisplayEnclosedBlobs) ? 1 : 2;
							break;
						case 1: // cells with bevels
							nRadialLinesPerSegment = 1;
							bDrawCellBevelsInner = true;
							bDrawCellBevelsOuter = true;
							bShadeInner = false;
							innerLoopWeight = WEIGHT_1; 
							break;
						case 2: // dense radial bands
							nRadialLinesPerSegment = theStyleSheet.nWheelRadialBands; 
							bDrawAllRadialLines = theStyleSheet.bDrawAllRadialLines;
							if (this.bDisplayEnclosedBlobs){
								innerLoopWeight = WEIGHT_1; 
							}
							break;
						case 3: // wall made of cells
							nRadialLinesPerSegment = 1;
							bWheelDecorativeNuclei = true;
							bDrawCellBevelsInner = true;
							innerLoopWeight = WEIGHT_1; 
							break;
						case 4: // fluted tube, highway
							nAnnularLoops = theStyleSheet.nWheelAnnularLoops; 
							innerLoopWeight = WEIGHT_1; 
							bShadeInner = false;
							bWigglyFlute = true; 
							break;
						case 5: // hairy (exterior hachure)
							bDrawOuterLoop = false;
							nRadialLinesPerSegment = 3;
							bTaperRadialLines = true;
							bDrawCellBevelsInner = true;
							bDrawCellBevelsOuter = false;
							break;
						case 6: // interior hachure
							bDrawInnerLoop = false;
							nRadialLinesPerSegment = 3;
							bTaperRadialLines = true;
							bFlipTaperingRadialLineDir = true;
							break;
						case 7: // vacuole bubble
							bDrawInnerLoop = false;	
							nAnnularLoops = 2; 
							bBiasAnnularLoopsToOutside = true;
							bBiasAnnularDashesToOutside = true;
							annularLoopMaxGap = 1;
							annularLoopMaxDash = 3;
							bShadeOuter = true;
							break;
						case 8: // engraved techno-torus
							nAnnularLoops = 2;// was 3
							annularLoopMaxGap = 1;
							annularLoopMaxDash = 5;
							innerLoopWeight = WEIGHT_1; 
							bShadeOuter = true;
							break;
						case 9: // dotted
							bDrawInnerLoop = false;
							bDrawOuterLoop = false;
							bShadeOuter = false;
							bDottedOuter = true; 
							outerLoopWeight = WEIGHT_0; 
							break;
						case 10: // hairy doinks
							bDrawOuterLoop = false;
							nRadialLinesPerSegment = (this.id % 4 == 3) ? 2 : 1;;
							bDrawOuterParticles = true;
							break;
						case 11: // just the loops
							bDrawInnerLoop = true;
							bDrawOuterLoop = true;
							innerLoopWeight = (WEIGHT_1+WEIGHT_2)/2;
							outerLoopWeight = WEIGHT_2;
							break;
						case 12: // black (outlined and hatched)
							outerLoopWeight = WEIGHT_1; //(theStyleSheet.HATCH_DENSITY > 3) ? WEIGHT_2 : WEIGHT_1; 
							bDrawInnerLoop = false;
							bDrawOuterLoop = true; 
							bShadeOuter = false;
							outerLoopStroke = STROKE_NONE; //(theStyleSheet.HATCH_DENSITY <= 2) ? STROKE_BLACK : STROKE_NONE;
							outerLoopFill = FILL_BLACK;
							break;
						case 13: // blank spot for letters
							bDrawInnerLoop = false;
							bDrawOuterLoop = true;
							outerLoopFill = FILL_WHITE;
							outerLoopStroke = STROKE_NONE;
							bShadeOuter = false;
							break;
						case 14:
							break; // use defaults
						case 15: 
							bDrawInnerLoop = true;
							bDrawOuterLoop = true;
							innerLoopFill = FILL_NONE;
							outerLoopFill = FILL_NONE;
							innerLoopWeight = WEIGHT_2; 
							outerLoopWeight = WEIGHT_2; 
							bWheelCellBoxes = true;
							bShadeOuter = false;
							bShadeInner = false;
							break;
						case 16: 
							bDrawInnerLoop = true;
							bDrawOuterLoop = true;
							innerLoopFill = FILL_NONE;
							outerLoopFill = FILL_NONE;
							innerLoopWeight = WEIGHT_2; 
							outerLoopWeight = WEIGHT_2; 
							bWheelCellBoxes2 = true;
							bShadeOuter = false;
							bShadeInner = false;
							break;
						case 17:
							bTinyDashedInner = true;
							bDrawInnerLoop = false;
							bDrawOuterLoop = true;
							innerLoopFill = FILL_NONE;
							outerLoopFill = FILL_NONE;
							innerLoopWeight = WEIGHT_1; 
							outerLoopWeight = WEIGHT_2; 
							bShadeOuter = true;
							break;
					}
				} 
				
				const nParticles = this.particleIndices.length;
				if (this.bDisplayEnclosedBlobs){ // then also calculate bbox
					let rL = Number.POSITIVE_INFINITY;
					let rR = Number.NEGATIVE_INFINITY; 
					let rT = Number.POSITIVE_INFINITY;
					let rB = Number.NEGATIVE_INFINITY; 
					for (let i=0; i<nParticles; i+=2){ 
						const ie = this.particleIndices[i]    ; // even-indexed points
						const io = this.particleIndices[i] + 1; // odd-indexed points
						if (bDrawInnerLoop){ polyline0.push(myParticles[ie].p); }
						if (bDrawOuterLoop){ polyline1.push(myParticles[io].p); }

						let aParticle = myParticles[ie].p; 
						if (aParticle.x < rL) { rL = aParticle.x; }
						if (aParticle.x > rR) { rR = aParticle.x; }
						if (aParticle.y < rT) { rT = aParticle.y; }
						if (aParticle.y > rB) { rB = aParticle.y; }
					}
					this.boundingBox = {"L":rL, "T":rT, "R":rR, "B":rB};
				} else {
					for (let i=0; i<nParticles; i+=2){ 
						const ie = this.particleIndices[i]    ; // even-indexed points
						const io = this.particleIndices[i] + 1; // odd-indexed points
						if (bDrawInnerLoop){ polyline0.push(myParticles[ie].p); }
						if (bDrawOuterLoop){ polyline1.push(myParticles[io].p); }
					}
				}

				if (bDrawOuterLoop){
					out.push( new StyledPolyline(polyline1, true, true, false, false, outerLoopStroke, outerLoopFill, outerLoopWeight, 0,0, bShadeOuter) ); 
					polyline1 = null;
				}
				if (bDrawInnerLoop){
					out.push( new StyledPolyline(polyline0, true, true, false, false, innerLoopStroke, innerLoopFill, innerLoopWeight, 0,0, bShadeInner) ); 
					polyline0 = null;
				}
			
				if (bAddWheelScrunchTicks){
					const crsThresh = 1.0;
					const crsPow = 0.75; 

					let prevSx = 0; 
					let prevSy = 0; 
					let prevTx = 0; 
					let prevTy = 0; 

					let pprevSx = 0; 
					let pprevSy = 0; 
					let pprevTx = 0; 
					let pprevTy = 0; 

					let tickWeight = WEIGHT_0; 
					let bDoTicksOnBothSides = false; 
					let bDoDoubledScrunchTicks = (this.mom.rand20K[ 123 ] < 0.30);
					/*
					if ((this.STYLE_ID = 11) || (this.STYLE_ID = 14)){
						if (this.mom.rand20K[ 11 ] < 0.02){ tickWeight = WEIGHT_2; }
						if ((this.mom.rand20K[ 3 ] < 0.22)|| (this.mom.rand20K[ this.id ] < 0.125)) {
							bDoTicksOnBothSides = true; 
						}
					}
					*/

					for (let i=0; i<(nParticles+1); i++){ 
						const ih = this.particleIndices[(i-2+nParticles)%nParticles ];
						const ii = this.particleIndices[(i  )%nParticles ];
						const ij = this.particleIndices[(i+2)%nParticles ];

						const pih = myParticles[ih].p;
						const pii = myParticles[ii].p;
						const pij = myParticles[ij].p;

						const v1x = pih.x - pii.x; 
						const v1y = pih.y - pii.y; 
						const v2x = pij.x - pii.x; 
						const v2y = pij.y - pii.y; 
						let crs = (v1x*v2y) - (v1y*v2x);

						let sx = (pih.x + 2*pii.x + pij.x)/4; 
						let sy = (pih.y + 2*pii.y + pij.y)/4; 
						let oppIndex = (i%2 == 0) ? (i+1) : (i-1); 
						let iopp = this.particleIndices[ (oppIndex+nParticles)%nParticles];
						let popp = myParticles[iopp].p;
						let dx = popp.x - pii.x; 
						let dy = popp.y - pii.y; 
						let crsFactor = Math.pow(map(Math.abs(crs),0,35, 0,1, true), crsPow);
						if (bDoTicksOnBothSides){crsFactor *= 0.6; }
						dx = dx * crsFactor; 
						dy = dy * crsFactor; 
						let tx = sx + dx;
						let ty = sy + dy;

						let bDoit = (i%2 == 0) ? (crs < (0-crsThresh)) : (crs > crsThresh);
						bDoit |= bDoTicksOnBothSides; 
						if (bDoit && (crsFactor > 0.1)){

							let aPolyline = [];
							aPolyline.push( createVector(sx, sy) );
							aPolyline.push( createVector(tx, ty) );
							let aStyledPolyline = new StyledPolyline(aPolyline, false, false, true, false, STROKE_BLACK, FILL_BLACK, tickWeight, 0,0, false);
							out.push(aStyledPolyline); 
							if (pprevSx != 0){
								aPolyline = [];
								aPolyline.push( createVector((sx+pprevSx)/2, (sy+pprevSy)/2) );
								aPolyline.push( createVector((tx+pprevTx)/2, (ty+pprevTy)/2) );
								aStyledPolyline = new StyledPolyline(aPolyline, false, false, true, false, STROKE_BLACK, FILL_BLACK, tickWeight, 0,0, false);
								out.push(aStyledPolyline); 
							}

							if (bDoDoubledScrunchTicks){
								if (pprevSx != 0){
									aPolyline = [];
									aPolyline.push( createVector((sx*0.75+pprevSx*0.25), (sy*0.75+pprevSy*0.25)) );
									aPolyline.push( createVector((tx*0.75+pprevTx*0.25), (ty*0.75+pprevTy*0.25)) );
									aStyledPolyline = new StyledPolyline(aPolyline, false, false, true, false, STROKE_BLACK, FILL_BLACK, tickWeight, 0,0, false);
									out.push(aStyledPolyline); 
		
									aPolyline = [];
									aPolyline.push( createVector((sx*0.25+pprevSx*0.75), (sy*0.25+pprevSy*0.75)) );
									aPolyline.push( createVector((tx*0.25+pprevTx*0.75), (ty*0.25+pprevTy*0.75)) );
									aStyledPolyline = new StyledPolyline(aPolyline, false, false, true, false, STROKE_BLACK, FILL_BLACK, tickWeight, 0,0, false);
									out.push(aStyledPolyline); 
								}
							}
							
							aStyledPolyline = null;
							aPolyline = null;
						}

						pprevSx = prevSx; pprevSy = prevSy; 
						pprevTx = prevTx; pprevTy = prevTy; 
						prevSx = sx; prevSy = sy; 
						prevTx = tx; prevTy = ty; 
					}
				}


				if (bTinyDashedInner){
					let aPolyline = [];
					let u = map(this.mom.rand20K[this.id], 0,1, 0.16,0.33);
					const fi = map(this.mom.rand20K[0], 0,1, 0.666,1.333);
					const fo = 1.0-fi;
					for (let i=0; i<nParticles; i+=2){ 
						const pii = this.particleIndices[i];
						const pji = this.particleIndices[(i+2)%nParticles];

						let xi = myParticles[pii].p.x;
						let yi = myParticles[pii].p.y;
						let xj = myParticles[pji].p.x;
						let yj = myParticles[pji].p.y;
						if (!this.bDisplayVoronoiCells){
							const pio = this.particleIndices[i] + 1;
							const pjo = this.particleIndices[(i+2)%nParticles] + 1;
							xi = (xi*fi + myParticles[pio].p.x*fo); 
							yi = (yi*fi + myParticles[pio].p.y*fo); 
							xj = (xj*fi + myParticles[pjo].p.x*fo); 
							yj = (yj*fi + myParticles[pjo].p.y*fo); 
						}
						
						const uu = u + map(this.mom.rand20K[i], 0,1, -0.03,0.03);
						const vv = 1.0 - uu;
						const px = xj*uu + xi*vv; const py = yj*uu + yi*vv;
						const qx = xj*vv + xi*uu; const qy = yj*vv + yi*uu;
						aPolyline = [];
						aPolyline.push( createVector(qx, qy));  
						aPolyline.push( createVector(px, py));  
						out.push( new StyledPolyline(aPolyline, false, false, false, false, STROKE_BLACK, FILL_BLACK, innerLoopWeight, 0,0));
					}
					aPolyline = null; 
				}

				if (bDottedOuter){
					let aPolyline = [];
					for (let i=0; i<nParticles; i+=2){ 
						const io = this.particleIndices[i] + 1;
						const jo = this.particleIndices[(i+2)%nParticles] + 1;
						const xi = myParticles[io].p.x;
						const yi = myParticles[io].p.y;
						const xj = myParticles[jo].p.x;
						const yj = myParticles[jo].p.y;
						for (let k=0; k<3; k++){
							let t = k/3;
							let px = xj*t + xi*(1-t);
							let py = yj*t + yi*(1-t);
							aPolyline = [];
							aPolyline.push( createVector(px, py));  
							out.push( new StyledPolyline(aPolyline, false, false, false, true, STROKE_BLACK, FILL_NONE, outerLoopWeight, 0,0));
						}
					}
					aPolyline = null; 
				}

				if (bDrawCellBevelsOuter || bDrawCellBevelsInner){
					const la = 0.333; 
					const lb = 1.0-la; 
					let aPolyline;
					
					for (let i=0; i<nParticles; i+=2){ 
						let iq = this.particleIndices[i];
						let ip = this.particleIndices[i] + 1;
						let iqq = myParticles[iq].p;
						let ipp = myParticles[ip].p;

						if (bDrawCellBevelsInner){
							let qx = ipp.x*la + iqq.x*lb; 
							let qy = ipp.y*la + iqq.y*lb; 
							aPolyline = [];
							aPolyline = this.createWedgePolyline (iqq.x, iqq.y, qx, qy, WEIGHT_2, 3, 0.9);
							out.push( new StyledPolyline(aPolyline, false, false, false, false, STROKE_BLACK, FILL_NONE, WEIGHT_0, 0,0) );
						}
						if (bDrawCellBevelsOuter){
							let px = ipp.x*lb + iqq.x*la; 
							let py = ipp.y*lb + iqq.y*la; 
							aPolyline = [];
							aPolyline = this.createWedgePolyline (ipp.x, ipp.y, px, py, WEIGHT_3, 3, 0.9);
							out.push( new StyledPolyline(aPolyline, false, false, false, false, STROKE_BLACK, FILL_NONE, WEIGHT_0, 0,0) );
						}
					}
					aPolyline = null; 
				}

				// Add little doinks at the end of hairs
				if (bDrawOuterParticles){  
				
					for (let i=0; i<nParticles; i+=2){ 
						let iq = this.particleIndices[i];
						let ip = this.particleIndices[i] + 1;
						let iqq = myParticles[iq].p;
						let ipp = myParticles[ip].p;
						let px = ipp.x; 
						let py = ipp.y;
						let qx = iqq.x; 
						let qy = iqq.y;

						let dx = px - qx; 
						let dy = py - qy; 
						let dh = Math.sqrt(dx*dx + dy*dy);
						if (dh > 0) {
							let M = Math.sin(i + this.mom.myMillis/400.0); //1000*i); // substitute for random
							dx/=dh; 
							dy/=dh; 
							let aPolyline = [];
							aPolyline.push( createVector(px - M*dx,py - M*dy) );  
							out.push( new StyledPolyline(aPolyline, false, false, false, true, STROKE_NONE, FILL_BLACK, WEIGHT_2, 0,0) );
							aPolyline = null; 
						}
					}
				}

				// Add radial lines around the wheel
				if (nRadialLinesPerSegment > 0){
					let fa = 0, fb = 1; 
					if (bFlipTaperingRadialLineDir){ fa = 1, fb = 0; }
					if (nRadialLinesPerSegment == 1){
						for (let i=0; i<nParticles; i+=2){ 
							const ie = this.particleIndices[i] + fa; // even-indexed points
							const io = this.particleIndices[i] + fb; // odd-indexed points

							let aPolyline = [];
							aPolyline.push(myParticles[ie].p); 
							aPolyline.push(myParticles[io].p); 
							out.push( new StyledPolyline(aPolyline, false, false, bTaperRadialLines, false, STROKE_NONE, FILL_BLACK, WEIGHT_0, 0,0) );
							aPolyline = null;
						}
					} else {
						let scount = this.id * 20; 
						const drawRadialLinePercent = theStyleSheet.drawRadialLinePercent; 
						for (let i=0; i<nParticles; i+=2){ 
							const ie = this.particleIndices[i] + fa; // even-indexed points
							const io = this.particleIndices[i] + fb; // odd-indexed points
							const je = this.particleIndices[(i+2)%nParticles] + fa; // even-indexed points
							const jo = this.particleIndices[(i+2)%nParticles] + fb; // odd-indexed points
							const pie = myParticles[ie].p;
							const pje = myParticles[je].p;
							const pio = myParticles[io].p;
							const pjo = myParticles[jo].p;
							for (let j=0; j<nRadialLinesPerSegment; j++){
								if (bDrawAllRadialLines || (this.mom.rand20K[scount] < drawRadialLinePercent)){
									const t = j/nRadialLinesPerSegment;
									const tinv = 1.0-t; 
									const pex = pie.x*tinv + pje.x*t; // lerp(pie.x, pje.x, t);
									const pey = pie.y*tinv + pje.y*t; // lerp(pie.y, pje.y, t);
									const pox = pio.x*tinv + pjo.x*t; // lerp(pio.x, pjo.x, t);
									const poy = pio.y*tinv + pjo.y*t; // lerp(pio.y, pjo.y, t);

									let aPolyline = [];
									aPolyline.push( createVector(pex,pey) );   
									aPolyline.push( createVector(pox,poy) ); 
									out.push( new StyledPolyline(aPolyline, false, false, bTaperRadialLines, false, STROKE_NONE, FILL_BLACK, WEIGHT_0, 0,0) );
									aPolyline = null;
								}
								scount++;
							}
						}
					}
				}

				// Add (potentially dashed) inner loop(s)
				if (nAnnularLoops > 0){
					
					// propblem oohR5Muve29NbJvd77GLtuHTGxzgpjfux7pLcoLq7V8HBTysj8c
					if (bWigglyFlute && (nAnnularLoops == 1) && (!bAddWheelScrunchTicks)){
						const t = map(this.mom.rand20K[this.id], 0,1, 0.48,0.42);
						const tinv = 1.0-t;

						let aPolyline = [];
						let he = this.particleIndices[nParticles-2];
						let ho = this.particleIndices[nParticles-2] + 1; // odd-indexed points  
						for (let i=0; i<nParticles; i+=2){ 
							const ie = this.particleIndices[i]    ; // even-indexed points
							const io = this.particleIndices[i] + 1; // odd-indexed points

							const ep = myParticles[ie].p;
							const op = myParticles[io].p;
							const px = ep.x*tinv + op.x*t;
							const py = ep.y*tinv + op.y*t;
							
							const eo = myParticles[he].p;
							const oo = myParticles[ho].p;
							const ox = ((eo.x+ep.x)*t + (oo.x+op.x)*tinv)*0.5; 
							const oy = ((eo.y+ep.y)*t + (oo.y+op.y)*tinv)*0.5; 

							aPolyline.push(createVector(ox,oy));
							aPolyline.push(createVector(px,py));      
							he = ie; ho = io; 
						}
						out.push( new StyledPolyline(aPolyline, true, true, false, false, STROKE_BLACK, FILL_NONE, WEIGHT_0, 0,0) );
						aPolyline = null;
						
					} else {
						for(let j=1; j<(nAnnularLoops+1); j++){
							let t = j/(nAnnularLoops+1);
							if (bBiasAnnularLoopsToOutside){ t = Math.pow(t, 0.80); }
							let tinv = 1.0-t; 
							let aPolyline = [];
							for (let i=0; i<nParticles; i+=2){ 
								const ie = this.particleIndices[i]    ; // even-indexed points
								const io = this.particleIndices[i] + 1; // odd-indexed points
								const ep = myParticles[ie].p;
								const op = myParticles[io].p;
								let px = ep.x*tinv + op.x*t; // lerp is slow
								let py = ep.y*tinv + op.y*t; 
								let mp = createVector(px,py);
								aPolyline.push(mp);   
							}

							let g = annularLoopMaxGap;
							let d = annularLoopMaxDash;
							if (bBiasAnnularDashesToOutside){ g += (nAnnularLoops-j); d += j; }
							out.push( new StyledPolyline(aPolyline, true, true, false, false, STROKE_BLACK, FILL_NONE, WEIGHT_0, g,d) );
							aPolyline = null;
						}
					}

				}
				
				if (bWheelCellBoxes){
					const U = 4; 
					const u = U-1;
					for (let i=0; i<nParticles; i+=2){ 
						let j = (i+2)%nParticles;
						const ie = this.particleIndices[i]    ; // even-indexed points
						const io = this.particleIndices[i] + 1; // odd-indexed points
						const je = this.particleIndices[j]    ; // even-indexed points
						const jo = this.particleIndices[j] + 1; // odd-indexed points
						const pie = myParticles[ie].p; const pje = myParticles[je].p;
						const pio = myParticles[io].p; const pjo = myParticles[jo].p;
						let aPolyline = [];
						aPolyline.push( createVector( (u*pie.x+pio.x)/U, (u*pie.y+pio.y)/U )); 
						aPolyline.push( createVector( (pie.x+pio.x)/2,   (pie.y+pio.y)/2 )); 
						aPolyline.push( createVector( (pie.x+u*pio.x)/U, (pie.y+u*pio.y)/U )); 
						aPolyline.push( createVector( (u*pio.x+pjo.x)/U, (u*pio.y+pjo.y)/U )); 
						aPolyline.push( createVector( (pio.x+pjo.x)/2,   (pio.y+pjo.y)/2 )); 
						aPolyline.push( createVector( (pio.x+u*pjo.x)/U, (pio.y+u*pjo.y)/U ));      
						aPolyline.push( createVector( (u*pjo.x+pje.x)/U, (u*pjo.y+pje.y)/U ));  
						aPolyline.push( createVector( (pjo.x+pje.x)/2,   (pjo.y+pje.y)/2 ));  
						aPolyline.push( createVector( (pjo.x+u*pje.x)/U, (pjo.y+u*pje.y)/U ));    
						aPolyline.push( createVector( (u*pje.x+pie.x)/U, (u*pje.y+pie.y)/U ));
						aPolyline.push( createVector( (pje.x+pie.x)/2,   (pje.y+pie.y)/2 ));
						aPolyline.push( createVector( (pje.x+u*pie.x)/U, (pje.y+u*pie.y)/U ));
						out.push( new StyledPolyline(aPolyline, true, true, false, false, STROKE_BLACK, FILL_WHITE, WEIGHT_0, 0,0 ) );
						aPolyline = null; 
					}
				} else if (bWheelCellBoxes2){
					const U = 6; 
					const u = U-1;
					for (let i=0; i<nParticles; i+=4){ 
						let j = (i+2)%nParticles;
						let k = (i+4)%nParticles;
						const ie = this.particleIndices[i]    ; // even-indexed points
						const io = this.particleIndices[i] + 1; // odd-indexed points
						const je = this.particleIndices[j]    ; // even-indexed points
						const jo = this.particleIndices[j] + 1; // odd-indexed points
						const ke = this.particleIndices[k]    ; // even-indexed points
						const ko = this.particleIndices[k] + 1; // odd-indexed points
						const pie = myParticles[ie].p; const pje = myParticles[je].p; const pke = myParticles[ke].p;
						const pio = myParticles[io].p; const pjo = myParticles[jo].p; const pko = myParticles[ko].p;
						let aPolyline = [];

						aPolyline.push( pje ); 
						aPolyline.push( createVector( (u*pke.x+pko.x)/U, (u*pke.y+pko.y)/U )); 
						aPolyline.push( createVector( (pke.x+pko.x)/2,   (pke.y+pko.y)/2 )); 
						aPolyline.push( createVector( (pke.x+u*pko.x)/U, (pke.y+u*pko.y)/U )); 
						aPolyline.push( pjo ); 
						aPolyline.push( createVector( (pie.x+u*pio.x)/U, (pie.y+u*pio.y)/U )); 
						aPolyline.push( createVector( (pie.x+pio.x)/2,   (pie.y+pio.y)/2 )); 
						aPolyline.push( createVector( (u*pie.x+pio.x)/U, (u*pie.y+pio.y)/U )); 

						out.push( new StyledPolyline(aPolyline, true, true, false, false, STROKE_BLACK, FILL_WHITE, WEIGHT_0, 0,0 ) );
						aPolyline = null; 
					}
				}


				// Add decorative nuclei
				if (bWheelDecorativeNuclei){ 
					for (let i=0; i<nParticles; i+=2){ 
						let j = (i+2)%nParticles;
						const ie = this.particleIndices[i]    ; // even-indexed points
						const io = this.particleIndices[i] + 1; // odd-indexed points
						const je = this.particleIndices[j]    ; // even-indexed points
						const jo = this.particleIndices[j] + 1; // odd-indexed points
						const pie = myParticles[ie].p; const pje = myParticles[je].p;
						const pio = myParticles[io].p; const pjo = myParticles[jo].p;
						let pex = (pie.x + pjo.x + pio.x + pje.x)/4; 
						let pey = (pie.y + pjo.y + pio.y + pje.y)/4;
						let aPolyline = [];
						aPolyline.push( createVector(pex,pey) );   
						out.push( new StyledPolyline(aPolyline, false, false, false, true, STROKE_NONE, FILL_BLACK, WEIGHT_2, 0,0) );
						aPolyline = null; 
					}
				}

			}
		  	break;

		//------------------
		case STRUCTURE_TYPE_CENTI: // Get contours
			{
				let bDoHairs = false;
				let bDoubleHairs = false; 
				let bDoDots = false;
				let bDoEye = false; 
				let bShadeContour = true;
				let bDoTail = false;

				switch(this.STYLE_ID){
					case 0: // empty contour with eye
						bDoEye = true;
						bDoTail = true;
						break;
					case 1: // contour with hairs
						bDoubleHairs = true; 
						break;
					case 2: // double-hairs and eye
						bDoHairs = true; 
						bDoubleHairs = true; 
						bDoEye = true;
						break;
					case 3: // hairs & spots
						bDoHairs = true; 
						bDoDots = true; 
						break;
					case 4: 
						bDoHairs = true; 
						bDoubleHairs = true;
						bDoTail = true;
						bDoDots = true;
						break;
				}

				// Main body contour
				for (let i=0; i<this.particleIndices.length; i+=4){ 
					const ie = this.particleIndices[i];
					polyline0.push(myParticles[ie].p); }
				for (let i=(this.particleIndices.length-1); i>0; i-=4){ 
					const io = this.particleIndices[i];
					polyline0.push(myParticles[io].p); }
				out.push( new StyledPolyline(polyline0, true, true, false, false, STROKE_BLACK, FILL_WHITE, WEIGHT_2, 0,0, bShadeContour) ); 
				polyline0 = null; 

				if (bDoHairs){
					for (let seg = 4; seg<this.particleIndices.length-4; seg+=4) {
						let aPolyline;
						let p0 = myParticles[ this.particleIndices[seg  ] ].p;
						let p1 = myParticles[ this.particleIndices[seg+1] ].p;
						let p2 = myParticles[ this.particleIndices[seg+2] ].p;
						let p3 = myParticles[ this.particleIndices[seg+3] ].p;
						
						aPolyline = [];
						aPolyline.push(p0); 
						aPolyline.push(p2); 
						out.push( new StyledPolyline(aPolyline, false, true, true, false, STROKE_NONE, FILL_BLACK, WEIGHT_0, 0,0) ); // hair

						aPolyline = [];
						aPolyline.push(p1); 
						aPolyline.push(p3); 
						out.push( new StyledPolyline(aPolyline, false, true, true, false, STROKE_NONE, FILL_BLACK, WEIGHT_0, 0,0) ); // hair
						aPolyline = null; 
					}
				}

				if (bDoubleHairs || bDoDots || bDoEye){
					for (let seg = 0; seg<this.particleIndices.length-6; seg+=4) {
						let aPolyline;
						let p0a = myParticles[ this.particleIndices[seg  ] ].p;
						let p1a = myParticles[ this.particleIndices[seg+1] ].p;
						let p2a = myParticles[ this.particleIndices[seg+2] ].p;
						let p3a = myParticles[ this.particleIndices[seg+3] ].p;
						let p0b = myParticles[ this.particleIndices[seg+4] ].p;
						let p1b = myParticles[ this.particleIndices[seg+5] ].p;
						let p2b = myParticles[ this.particleIndices[seg+6] ].p;
						let p3b = myParticles[ this.particleIndices[seg+7] ].p;

						let p0abx = (p0a.x + p0b.x)/2;
						let p0aby = (p0a.y + p0b.y)/2;
						let p2abx = (p2a.x + p2b.x)/2;
						let p2aby = (p2a.y + p2b.y)/2;
						let p1abx = (p1a.x + p1b.x)/2;
						let p1aby = (p1a.y + p1b.y)/2;
						let p3abx = (p3a.x + p3b.x)/2;
						let p3aby = (p3a.y + p3b.y)/2;

						if (bDoubleHairs && (seg > 0)){
							aPolyline = [];
							aPolyline.push( createVector( p0abx, p0aby ));
							aPolyline.push( createVector( p2abx, p2aby ));
							out.push( new StyledPolyline(aPolyline, false, true, true, false, STROKE_NONE, FILL_BLACK, WEIGHT_1, 0,0) ); // hair
							aPolyline = [];
							aPolyline.push( createVector( p1abx, p1aby ));
							aPolyline.push( createVector( p3abx, p3aby ));
							out.push( new StyledPolyline(aPolyline, false, true, true, false, STROKE_NONE, FILL_BLACK, WEIGHT_1, 0,0) ); // hair
							aPolyline = null; 
						}
						if (bDoEye && (seg == 0)){
							aPolyline = [];
							aPolyline.push( createVector( (p0abx + p1abx)/2, (p0aby + p1aby)/2 ));
							out.push( new StyledPolyline(aPolyline, false, false, false, true, STROKE_NONE, FILL_BLACK, WEIGHT_2, 0,0) ); // dot
							aPolyline = null; 
						} 
						if (bDoDots && (seg > 0)){
							aPolyline = [];
							aPolyline.push( createVector( (p0abx + p1abx)/2, (p0aby + p1aby)/2 ));
							out.push( new StyledPolyline(aPolyline, false, false, false, true, STROKE_NONE, FILL_BLACK, WEIGHT_1, 0,0) ); // dot
							aPolyline = null; 
						}
					}
				}

				if (bDoTail){
					const i0 = this.particleIndices[this.particleIndices.length -1];
					const i1 = this.particleIndices[this.particleIndices.length -2];
					const i2 = this.particleIndices[this.particleIndices.length -3];
					const i3 = this.particleIndices[this.particleIndices.length -4];
					const pax = myParticles[i0].p.x; const pay = myParticles[i0].p.y;
					const pbx = myParticles[i1].p.x; const pby = myParticles[i1].p.y;
					const pcx = myParticles[i2].p.x; const pcy = myParticles[i2].p.y;
					const pdx = myParticles[i3].p.x; const pdy = myParticles[i3].p.y;
					const tA = 0.925; const tB = 1.0-tA;
					let tailx = tA*(pax + pbx)*0.5 + tB*(pcx + pdx)*0.5; 
					let taily = tA*(pay + pby)*0.5 + tB*(pcy + pdy)*0.5; 
					if (this.mom.TEMPERATURE > 0){
						this.history.shift(); 
						this.history.push( createVector(tailx,taily)); 
					}
					let aPolyline = [];
					for (let i=this.history.length-1; i>=0; i--){ aPolyline.push( this.history[i]); }
					out.push( new StyledPolyline(aPolyline, false, true, true, false, STROKE_BLACK, FILL_NONE, WEIGHT_2, 0,0) ); 
					aPolyline = null;
				}
			}
			break;

		//------------------
		case STRUCTURE_TYPE_URCHIN: // Get contours
			{
				let hairLen = this.PROPERTY_A;
				let skip = 2 + hairLen;
				let nSegments = (this.particleIndices.length)/skip;

				let bDrawHairs = true; 
				let bDrawHairWedges = true; 
				let bDrawInnerLoop = true; 
				let bDrawOuterLoop = true;
				let bUrchinDecorativeNuclei = false; 
				let innerLoopWeight = WEIGHT_2;
				let outerLoopWeight = WEIGHT_2;  
				let nAnnularLoops = 0; 
				let bShadeLines = true;
				let innerD = 0; 
				let innerG = 0;

				if (bSimplified) { 
					bDrawOuterLoop = true;
					bDrawInnerLoop = false; 
					bDrawHairs = (this.STYLE_ID != 4);
					bDrawHairWedges = false; 
					bUrchinDecorativeNuclei = false;
				} else {
					switch(this.STYLE_ID){
						case 0: // Plain double-loop
							innerLoopWeight = WEIGHT_1; 
							break;
						case 1: // Decorative nuclei
							bUrchinDecorativeNuclei = true;
							innerLoopWeight = WEIGHT_1; 
							break;
						case 2: // Inner loop has gaps
							innerLoopWeight = WEIGHT_0; 
							innerD = 1; 
							innerG = max(2, ~~(nSegments/3));
							break;
						case 3: // Ringed
							nAnnularLoops = 3;
							innerLoopWeight = WEIGHT_0; 
							break;
					}
				}

				// Inner and outer loops
				if (bDrawOuterLoop || bDrawInnerLoop){
					for (let i=0; i<this.particleIndices.length; i+=skip){ 
						const ie = this.particleIndices[i] + 0; // even-indexed points
						const io = this.particleIndices[i] + 1; // odd-indexed points
						if (bDrawInnerLoop){
							polyline0.push(myParticles[ie].p); 
						}
						if (bDrawOuterLoop){
							polyline1.push(myParticles[io].p); 
						}
					}
					if (bDrawOuterLoop){
						out.push( new StyledPolyline(polyline1, true, true, false, false, STROKE_BLACK, FILL_NONE, outerLoopWeight, 0,0, bShadeLines) ); 
						polyline1 = null;
					}
					if (bDrawInnerLoop){
						let bsl = (innerD == 0) ? bShadeLines : false;
						out.push( new StyledPolyline(polyline0, true, true, false, false, STROKE_BLACK, FILL_NONE, innerLoopWeight, innerD,innerG, bsl) );
						polyline0 = null;
					}
				}
				
				// Add hairs
				if (bDrawHairs){
					for (let si = 0; si<nSegments; si++) {
						let aPolyline = [];
						for (let sj=1; sj<skip; sj++){
							const j = si*skip + sj;
							const pij = this.particleIndices[j];
							aPolyline.push(myParticles[pij].p); 
						}
						if (hairLen == 1){
							out.push( new StyledPolyline(aPolyline, false, true, true, false, STROKE_NONE, FILL_BLACK, WEIGHT_0, 0,0) ); // hair
						} else {
							out.push( new StyledPolyline(aPolyline, false, true, true, false, STROKE_BLACK, FILL_NONE, WEIGHT_0, 0,0) ); // hair
						}
						aPolyline = null; 
					}

					if (bDrawHairWedges){
						if (hairLen > 1){
							let aPolyline = [];
							for (let si = 0; si<nSegments; si++) {
								const j0 = si*skip + 1;
								const j1 = si*skip + 2;
								const ij0 = this.particleIndices[j0];
								const ij1 = this.particleIndices[j1];
								const pij0 = myParticles[ij0].p;
								const pij1 = myParticles[ij1].p;
								let baseX = pij0.x; 
								let baseY = pij0.y; 
								let tipX = (pij0.x + pij1.x)/2;
								let tipY = (pij0.y + pij1.y)/2;
								aPolyline = this.createWedgePolyline (baseX, baseY, tipX, tipY, WEIGHT_2, 3, 0.5);
								out.push( new StyledPolyline(aPolyline, false, false, false, false, STROKE_BLACK, FILL_NONE, WEIGHT_0, 0,0) );
							}
							aPolyline = null;
						}
					}
				}

				// Add inner loops
				if (nAnnularLoops > 0){
					for(let j=1; j<(nAnnularLoops+1); j++){
						let t = j/(nAnnularLoops+1);
						t = Math.pow(t, 0.80); 
						let tinv = 1.0-t; 
						let aPolyline = [];

						for (let i=0; i<(this.particleIndices.length); i+=skip){ 
							const ie = this.particleIndices[i] + 0; // even-indexed points
							const io = this.particleIndices[i] + 1; // odd-indexed points
							const ep = myParticles[ie].p;
							const op = myParticles[io].p;
							let px = ep.x*tinv + op.x*t;
							let py = ep.y*tinv + op.y*t; 
							let mp = createVector(px,py);
							aPolyline.push(mp);   
						}
						out.push( new StyledPolyline(aPolyline, true, true, false, false, STROKE_BLACK, FILL_NONE, WEIGHT_0, 0,0, bShadeLines) );
						aPolyline = null;
					}
				}

				// Add decorative nuclei
				if (bUrchinDecorativeNuclei){ 
					let aPolyline;
					const nucR = WEIGHT_2/2;
					for (let i=0; i<(this.particleIndices.length); i+=skip){ 
						let j = (i+skip)%(this.particleIndices.length);
						const ie = this.particleIndices[i]    ; // even-indexed points
						const io = this.particleIndices[i] + 1; // odd-indexed points
						const je = this.particleIndices[j]    ; // even-indexed points
						const jo = this.particleIndices[j] + 1; // odd-indexed points
						const pie = myParticles[ie].p; 
						const pje = myParticles[je].p;
						const pio = myParticles[io].p; 
						const pjo = myParticles[jo].p;
						let pex = (pie.x + pjo.x + pio.x + pje.x)/4; 
						let pey = (pie.y + pjo.y + pio.y + pje.y)/4;

						aPolyline = [];
						aPolyline.push( createVector((pie.x + pio.x)/2,(pie.y + pio.y)/2) );   
						out.push( new StyledPolyline(aPolyline, false, false, false, true, STROKE_NONE, FILL_BLACK, WEIGHT_2, 0,0) );

						aPolyline = [];
						aPolyline.push( createVector(pex,pey) );   
						out.push( new StyledPolyline(aPolyline, false, false, false, true, STROKE_NONE, FILL_BLACK, WEIGHT_2, 0,0) );
					}
					aPolyline = null;
				}
			}
			break;
	  	}

	  	return out; 

	}


	createWedgePolyline (baseX, baseY, tipX, tipY, baseWidth, nLinePairs, curvature01) {
		let aPolyline = [];
		const dx = tipX - baseX;
		const dy = tipY - baseY;
		const dh2 = dx * dx + dy * dy;
		if (dh2 > 0) {
			const dh = 2 * Math.sqrt(dh2);
			const ex = dx / dh;
			const ey = dy / dh;
			let s = -1;
			for (let i = nLinePairs; i >0; i--) {
				const t = i / nLinePairs;
				const u = t * curvature01; 
				const stb = s * t * baseWidth;
				
				let bx = baseX + stb * ey; // base point
				let by = baseY - stb * ex;
				let tx = tipX - u*dx; // tip point
				let ty = tipY - u*dy;
				let cx = baseX - stb * ey; // other base point
				let cy = baseY + stb * ex;
				aPolyline.push(createVector(bx, by));
				aPolyline.push(createVector(tx, ty));
				aPolyline.push(createVector(cx, cy));
				s *= -1;
			}
			aPolyline.push(createVector(baseX, baseY));
			aPolyline.push(createVector(tipX, tipY));
		}
		return aPolyline;
	}


	//---------------------
	getBoundingBox(){
		let out = {x:0, y:0, w:0, h:0};
		const N = this.particleIndices.length;
		if (N > 0){
			let myParticles = this.mom.myParticles;
			let rL = Number.POSITIVE_INFINITY;
			let rR = Number.NEGATIVE_INFINITY; 
			let rT = Number.POSITIVE_INFINITY;
			let rB = Number.NEGATIVE_INFINITY; 
			for (let i=0; i<N; i++){ 
				const ii = this.particleIndices[i]; 
				const p = myParticles[ii].p; 
				if (p.x < rL) { rL = p.x; }
				if (p.x > rR) { rR = p.x; }
				if (p.y < rT) { rT = p.y; }
				if (p.y > rB) { rB = p.y; }
			}
			out.x = rL;  
			out.y = rT; 
			out.w = rR - rL; 
			out.h = rB - rT;
		}
		return out;
	}

	loopArea(){
		let area = 0; 
		if (this.bLoop){
			let myParticles = this.mom.myParticles;
			let verts = []; 
			let skip = 1;
			let startIndex = 0; 
			if (this.type == STRUCTURE_TYPE_WHEEL){ skip = 2; } // for WHEEL, use even-indexed points
			if (this.type == STRUCTURE_TYPE_BALL){ startIndex = 1; } // for BALL, omit the center point
			if (this.type == STRUCTURE_TYPE_URCHIN){skip = 2 + this.PROPERTY_A;} // omit spines etc.

			for (let i=startIndex; i<this.particleIndices.length; i+=skip){ 
				const ii = this.particleIndices[i]; 
				verts.push(myParticles[ii].p); 
			}
			area = polygonArea(verts);
		}
		return area;
	}

	//---------------------
	pointInside (x, y) {
		// Vector-based point-in-polygon test. 
		let inside = false;
		if (this.bLoop){
			let myParticles = this.mom.myParticles;

			let verts = []; 
			let skip = 1;
			let startIndex = 0; 
			switch(this.type){
				case STRUCTURE_TYPE_WHEEL: skip = 2; break;
				case STRUCTURE_TYPE_BALL: startIndex = 1; break;
				case STRUCTURE_TYPE_URCHIN: skip = 2 + this.PROPERTY_A; break;
			}

			for (let i=startIndex; i<this.particleIndices.length; i+=skip){ 
				const ii = this.particleIndices[i]; 
				verts.push(myParticles[ii].p); 
			}

			const nVerts = verts.length;
			for (let i = 0, j = nVerts - 1; i < nVerts; j = i++) {
				const xi = verts[i].x;
				const yi = verts[i].y;
				const xj = verts[j].x;
				const yj = verts[j].y;
				const intersect = yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
				if (intersect) {
					inside = !inside;
				}
			}
			verts = null;
		}
		return inside;
	}

	//----------------------------------------------
	getClosestDistanceOfStructureFromPoint (x, y){
		let out = Number.POSITIVE_INFINITY; 
		let myParticles = this.mom.myParticles;

		for (let i=0; i<this.particleIndices.length; i++){ 
			const ii = this.particleIndices[i]; 
			const p = myParticles[ii].p;
			const dx = p.x - x; 
			const dy = p.y - y; 
			const d2 = (dx*dx + dy*dy); 
			if (d2 < out){
				out = d2; 
			}
		}
		if (out < Number.POSITIVE_INFINITY){
			out = Math.sqrt(out); 
		}
		return out; 
	}

	//----------------------------------------------
	getCentroidWhichpass(whichPass){
		const N = this.particleIndices.length;
		let cx = 0; 
		let cy = 0; 
		if (N > 0){
			if (whichPass == 1){
				for (let i=0; i<N; i++){
					let pi = this.particleIndices[i];
					let P = this.mom.myParticles[pi].p0;
					cx += P.x;
					cy += P.y;
				} 
			} else {
				for (let i=0; i<N; i++){
					let pi = this.particleIndices[i];
					let P = this.mom.myParticles[pi].pE;
					cx += P.x;
					cy += P.y;
				} 
			}
			cx /= N; 
			cy /= N;
		}
		return createVector(cx,cy);
	}

		
	//----------------------------------------------
	getCentroid(){
		const N = this.particleIndices.length;
		let cx = 0; 
		let cy = 0; 
		if (N > 0){
			for (let i=0; i<N; i++){
				let pi = this.particleIndices[i];
				let P = this.mom.myParticles[pi].p;
				cx += P.x;
				cy += P.y;
			} 
			cx /= N; 
			cy /= N;
		}
		return createVector(cx,cy);
	}
	
	//----------------------------------------------
	getIndexOfHighestCurvature(bReturnHighest){

		let highestCurvatureIndex = -1;
		let lowestCurvatureIndex = -1;
		let highestCurvature = 0; 
		let lowestCurvature = Number.POSITIVE_INFINITY;

		const N = this.particleIndices.length;
		let skip = 1; 
		switch (this.type) {
			default: 
				return; // really? 
				break;
			case STRUCTURE_TYPE_TRUSS:
			case STRUCTURE_TYPE_WHEEL:
				skip = 2; 
				break;
			case STRUCTURE_TYPE_LINE:
			case STRUCTURE_TYPE_LOOP:
				skip = 1; 
				break; 
		}

		let ia = this.bLoop ? 0 : skip;
		let ib = this.bLoop ? N : N - skip;
		for (let i = ia; i < ib; i++) {
			const h = (i - skip + N) % N;
			const j = (i + skip) % N;
			let curvature = this.getAbsAngleBetweenParticlesWithIndices(h,i,j);
			if (curvature > highestCurvature){
				highestCurvatureIndex = i; 
				highestCurvature = curvature;
			}
			if (curvature < lowestCurvature){
				lowestCurvatureIndex = i; 
				lowestCurvature = curvature; 
			}
		}

		if (bReturnHighest == false){
			return lowestCurvatureIndex;
		}
		return highestCurvatureIndex;
	}

	getAbsAngleBetweenParticlesWithIndices (h, i, j){
		const pih = this.particleIndices[h];
		const pii = this.particleIndices[i];
		const pij = this.particleIndices[j];
		let pA = this.mom.myParticles[pih];
		let pB = this.mom.myParticles[pii];
		let pC = this.mom.myParticles[pij];
		let pAsubB = (p5.Vector.sub(pA.p0, pB.p0)).normalize();
		let pCsubB = (p5.Vector.sub(pC.p0, pB.p0)).normalize();
		return Math.abs(p5.Vector.cross(pAsubB, pCsubB).z);
	}

	//----------------------------------------------
	getEnclosingStructureId(){
		return this.isEnclosedByStructureID;
	}
	setEnclosingStructureId(sid){
		this.isEnclosedByStructureID = sid;
	}
	getFull(){
		return this.bFull;
	}
	setFull(f){
		this.bFull = f; 
	}

	//----------------------------------------------
	addInitialParticleAtLocation(px, py) {

		let aParticle = new Particle();
		aParticle.set(px, py, this.MASS_MULTIPLIER);
		aParticle.setIsPartOfStructure (this.id);
		aParticle.setDropoutLikelihood(this.mom.theStyleSheet.blobDropoutPercent, this.mom.theStyleSheet.nucleusDropoutPercent); 
		this.mom.myParticles.push(aParticle); 
		let aParticleIndex = this.mom.myParticles.length -1;
		this.particleIndices.push(aParticleIndex);
	}

	//----------------------------------------------
	insertExistingParticleIntoSpringChainAtIndex(insertIndex, globalIndexOfPointToInsert) {
		// Fetch needed data from spring; then kill it
		let killIndex = insertIndex; 
		if (this.bLoop){
			killIndex = killIndex % this.springs.length;
		} else {
			killIndex = constrain(killIndex, 0, this.springs.length-1);
		}
		
		let ip0 = this.springs[killIndex].getIP();
		let ip1 = this.springs[killIndex].getIQ();
		this.springs.splice(killIndex, 1);
	
		let ipA = globalIndexOfPointToInsert;
		this.mom.myParticles[ipA].setIsPartOfStructure(this.id);
		this.mom.myParticles[ipA].mass = this.MASS_MULTIPLIER;
		this.particleIndices.splice(killIndex + 1, 0, ipA);
	
		// insert new springs connecting p0 & pA, pA & p1
		let spring0A = new Spring(this.mom.myParticles);
		let springA1 = new Spring(this.mom.myParticles);
		spring0A.setParticleIndicesAndRestLength(ip0, ipA, this.mom.REST_L, SPRING_K);
		springA1.setParticleIndicesAndRestLength(ipA, ip1, this.mom.REST_L, SPRING_K);
		this.springs.splice(killIndex + 0, 0, spring0A);
		this.springs.splice(killIndex + 1, 0, springA1);
	}


	//----------------------------------------------
	insertNewParticleIntoLoopStructureAtIndex(insertIndex) {
		// Fetch needed data from spring; then kill it
		let killIndex = insertIndex; 
		if (this.bLoop){
			killIndex = killIndex % this.springs.length;
		} else {
			killIndex = constrain(killIndex, 0, this.springs.length-1);
		}
		
		let ip0 = this.springs[killIndex].getIP();
		let ip1 = this.springs[killIndex].getIQ();
		let P0 = this.mom.myParticles[ip0]; //this.springs[killIndex].getP();
		let P1 = this.mom.myParticles[ip1]; //this.springs[killIndex].getQ();
		this.springs.splice(killIndex, 1);
	
		// create new particle pA at average of p0 and p1, with tiny random offset
		let rx = myRandomAB(-1,1)*NUDGE;
		let ry = myRandomAB(-1,1)*NUDGE;
		let ax = (P0.p.x + P1.p.x) / 2.0 + rx;
		let ay = (P0.p.y + P1.p.y) / 2.0 + ry;
		let PA = new Particle();
		PA.set(ax, ay, this.MASS_MULTIPLIER);
		PA.setIsPartOfStructure(this.id);
		PA.setDropoutLikelihood(this.mom.theStyleSheet.blobDropoutPercent, this.mom.theStyleSheet.nucleusDropoutPercent);

		if (this.type == STRUCTURE_TYPE_LOOP){ // paranoid sanity check
			PA.damping = 0.85;
		}

		this.mom.myParticles.push(PA); 
		let ipA = this.mom.myParticles.length-1; // the index of PA in myParticles
		this.particleIndices.splice(killIndex + 1, 0, ipA);
	
		// insert new springs connecting p0 & pA, pA & p1
		let spring0A = new Spring(this.mom.myParticles);
		let springA1 = new Spring(this.mom.myParticles);
		spring0A.setParticleIndicesAndRestLength(ip0, ipA, this.mom.REST_L, SPRING_K);
		springA1.setParticleIndicesAndRestLength(ipA, ip1, this.mom.REST_L, SPRING_K);
		this.springs.splice(killIndex + 0, 0, spring0A);
		this.springs.splice(killIndex + 1, 0, springA1);
	}
	
	//----------------------------------------------
	getGlobalIndexOfParticleClosestTo(mx, my){
		const nParticlesInStructure = this.particleIndices.length;
		let maxDist = Number.POSITIVE_INFINITY;
		let particleIndexOfClosest = -1;
		for (let i = 0; i < nParticlesInStructure; i++) {
			let ip = this.particleIndices[i]; 
			let P = this.mom.myParticles[ip]; 
			let dx = mx - this.mom.myParticles[ip].p.x;
			let dy = my - this.mom.myParticles[ip].p.y;
			let dh = Math.sqrt(dx * dx + dy * dy);
			if (dh < maxDist) {
				maxDist = dh;
				particleIndexOfClosest = ip;
			}
		}
		return particleIndexOfClosest;
	}

	//----------------------------------------------
	setSmoothing(sm){
		this.SMOOTHING = sm; 
	}

	//----------------------------------------------
	clearForces(){
		for (let i=0; i<this.particleIndices.length; i++){
			const pii = this.particleIndices[i];
			this.mom.myParticles[pii].clearForcesAndVelocities();
		}
	}

	//----------------------------------------------
	applySiteForce (whichPass){ 
		let theStyleSheet = this.mom.theStyleSheet; 
		if (!theStyleSheet.bUseAmorphousCellContour){
			if (this.siteAttachmentId > -1){

				let siteParticle = siteParticles[this.siteAttachmentId];
				let sitePoint = (whichPass == 1) ? siteParticle.p0 : siteParticle.pE;
				let sx = sitePoint.x;
				let sy = sitePoint.y; 

				let centroid = this.getCentroidWhichpass(whichPass);
				let dx = sx - centroid.x; 
				let dy = sy - centroid.y;
				let dh = Math.sqrt(dx*dx + dy*dy); 
				if (dh > 0){

					const TARGET_ATTRACTION = 1.0;
					const EFFECT_RADIUS = this.mom.REST_L * BASE_DIM/4;

					let dhFrac = min(1.0, dh/EFFECT_RADIUS); 
					let factor = TARGET_ATTRACTION * sq(1.0 - dhFrac);
					let fx = dx/dh * factor; 
					let fy = dy/dh * factor; 

					for (let i=0; i<this.particleIndices.length; i++){
						const pii = this.particleIndices[i];
						this.mom.myParticles[pii].addForce(fx, fy, whichPass);
					}

				}
			}
		}
	}

	//----------------------------------------------
	applyForceTowardsTarget(px, py, whichPass, howMuch){
		let centroid = this.getCentroid();
		let dx = px - centroid.x; 
		let dy = py - centroid.y;
		let dh = Math.sqrt(dx*dx + dy*dy); 
		if (dh > 0){
			let fx = dx/dh * howMuch; 
			let fy = dy/dh * howMuch; 
			for (let i=0; i<this.particleIndices.length; i++){
				const pii = this.particleIndices[i];
				this.mom.myParticles[pii].addForce(fx, fy, whichPass);
			}
		}
	}

	//----------------------------------------------
    renderStructure(GFX_P5, GFX_P5_CTX) {
		GFX_P5.stroke(CYTO_BLACK); 
		GFX_P5.noFill();

		// Draw all of the StyledPolyline's returned from getContours
		myRandomReset(this.mom.THE_CURRENT_HASH); 
		let contours = this.getContours();
		let anOfPolyline; 
		let theStyleSheet = this.mom.theStyleSheet;
		let nibStrength = 0.45; // 0.40; // map(theStyleSheet.amorphousMaskWrinkle, 1.05,5.00, 0.25,0.45, true); //0.25;

		for (let i=0; i < contours.length; i++){
			const aStyledPolyline = contours[i]; 
			const verts = aStyledPolyline.verts;
			const bSmooth = aStyledPolyline.bSmooth;
			const bClosed = aStyledPolyline.bClosed;
			const bIsDot = aStyledPolyline.bIsDot;
			const sStyle = aStyledPolyline.strokeStyle;
			const fStyle = aStyledPolyline.fillStyle;
			let weight = aStyledPolyline.thickness;
			const maxDashGap = aStyledPolyline.dashGap;
			const bVertexShade = aStyledPolyline.bVertexShade; 

			// Initializations for vertex shader
			const noff = [1,1];  // noise offsets
			const nfrq = [15,5]; // noise frequency scale
			const namp = (weight <= WEIGHT_1) ? 2.0 : 1.0;
			const nass = 1.0;    // noise asymmetry
			const nfal = 0.65;   // noise falloff
			const niba = radians(40); // nib angle
			const nibs = nibStrength; // nib strength
			const artOffset = [0,0]; // overall art offset
			const samp = 1.0;    // sample spacing (1..3 is good)
			const krnw = 2;      // 3 ..smoothing kernel width
			const bVSmooth = true;
			const bResamp = true; 

			
			if (this.mom.nestedLevel == 0){
				weight *= 0.66; //mouseX/width; //0.6666; 
			} else {
				weight *= 1.33; 
			}
		

			if (bIsDot){
				this.drawVertexAsDot (GFX_P5, GFX_P5_CTX, verts, weight, sStyle, fStyle);

			} else if (maxDashGap > 0){ 
				if ((this.type == STRUCTURE_TYPE_MEMBRANE) && (this.STYLE_ID == 4)){
					theStyleSheet.bOrientationSensitiveDashedContours = true; 
				}
				// if this is a dashed line, i.e. a line which has a non-zero gap
				let maxDashLen = aStyledPolyline.dashLen;
				this.drawVerticesRandomlyDashed(GFX_P5, GFX_P5_CTX, verts, bSmooth, bClosed, sStyle, fStyle, weight, maxDashGap, maxDashLen);
				theStyleSheet.bOrientationSensitiveDashedContours = false;

			} else {
				if (bClosed){
					if (bSmooth){
						
						this.drawVerticesClosedPureP5(GFX_P5, GFX_P5_CTX, verts, sStyle, fStyle, weight, 
							noff,nfrq,namp,nass,nfal,niba,nibs
						); 
						
					} else {
						this.drawVerticesPolyline(GFX_P5, GFX_P5_CTX, verts, bClosed, sStyle, fStyle, weight);
					}
				} else {
					let bTapered = aStyledPolyline.bTapered;
					if (bTapered){
						this.drawVerticesTapering(GFX_P5, GFX_P5_CTX, verts, weight, sStyle, fStyle);
					} else {

						if (bSmooth || (verts.length == 2)){
							
							this.drawVerticesUnclosedContour(GFX_P5, GFX_P5_CTX, verts, sStyle, fStyle, weight);
							
						} else {
							this.drawVerticesPolyline(GFX_P5, GFX_P5_CTX, verts, bClosed, sStyle, fStyle, weight);
						}
					}
				}
			}
		}

		GFX_P5.strokeWeight(1); 
		GFX_P5.noFill();
		anOfPolyline = null;
    }

	//----------------------------------------------
    drawVertexAsDot (GFX_P5, GFX_P5_CTX, verts, weight, sStyle, fStyle){ 
      	// Assumes verts contains a single point. 
		switch(sStyle){
			case STROKE_NONE:  GFX_P5.noStroke(); break;
			case STROKE_BLACK: GFX_P5.stroke(CYTO_BLACK); break;
			case STROKE_WHITE: GFX_P5.stroke(designBgCol); break;
		}
		switch(fStyle){
			case FILL_BLACK:   GFX_P5.fill(CYTO_BLACK); break;
			case FILL_WHITE:   GFX_P5.fill(designBgCol); break;
			case FILL_NONE:    GFX_P5.noFill(); break;
			case FILL_PATTERN: break;
		}
		const R = weight/2;
		GFX_P5_CTX.beginPath();
		GFX_P5_CTX.ellipse(verts[0].x, verts[0].y, R, R, 0, 0, TWO_PI);
		if (sStyle != STROKE_NONE){ GFX_P5_CTX.stroke(); }
		if (fStyle != FILL_NONE){ GFX_P5_CTX.fill(); }
    }
  
    //----------------------------------------------
    drawVerticesTapering(GFX_P5, GFX_P5_CTX, verts, initialWeight, sStyle, fStyle){
      	const nPoints = verts.length; 
		if (nPoints <2){
          	return; 
        } else if (nPoints == 2){
			// render a single line segment as a triangle
			let dx = verts[1].x - verts[0].x;
			let dy = verts[1].y - verts[0].y;
			let dh = Math.sqrt(dx*dx + dy*dy); 
			if (dh > 0){
				dx /= dh; 
				dy /= dh;
				let weight = initialWeight/2;
				let pax = verts[0].x + (dy*weight); 
				let pay = verts[0].y - (dx*weight); 
				let pbx = verts[0].x - (dy*weight); 
				let pby = verts[0].y + (dx*weight); 
				let pcx = verts[1].x;
				let pcy = verts[1].y;
				switch(fStyle){
					case FILL_BLACK:   GFX_P5.fill(CYTO_BLACK); break;
					case FILL_WHITE:   GFX_P5.fill(designBgCol); break;
					case FILL_NONE:    GFX_P5.noFill(); break;
					case FILL_PATTERN: break;
				}
				GFX_P5.noStroke(); 
				GFX_P5.triangle(pax,pay, pbx,pby, pcx,pcy); 
			}
  
        } else {
			let p0x, p0y, p1x, p1y; 
			let p2x, p2y, p3x, p3y; 
			let last_ptx, last_pty; 
			let next_ptx, next_pty; 
			const bias = 0.2;
			const nBez = 3; 

			switch(sStyle){
				case STROKE_NONE:  GFX_P5.noStroke(); break;
				case STROKE_BLACK: GFX_P5.stroke(CYTO_BLACK); break;
				case STROKE_WHITE: GFX_P5.stroke(designBgCol); break;
			}
			GFX_P5.noFill(); 
  
		  	if (sStyle != STROKE_NONE){
				for (let i=1; i<nPoints; i++) {
					if (i == 1){
						p3x = verts[1].x;
						p3y = verts[1].y;
						p0x = verts[0].x;
						p0y = verts[0].y;
						next_ptx = verts[2].x;
						next_pty = verts[2].y;
						last_ptx = p0x - (p3x - p0x) * bias;
						last_pty = p0y - (p3y - p0y) * bias;
	
					} else if (i == (nPoints - 1)){
						p3x = verts[i].x;
						p3y = verts[i].y;
						p0x = verts[i-1].x;
						p0y = verts[i-1].y;
						last_ptx = verts[i-2].x;
						last_pty = verts[i-2].y;
						next_ptx = p3x;
						next_pty = p3y;
		
					} else {
						p3x = verts[i].x;
						p3y = verts[i].y;
						p0x = verts[i-1].x;
						p0y = verts[i-1].y;
						last_ptx = verts[i-2].x;
						last_pty = verts[i-2].y;
						next_ptx = verts[i+1].x;
						next_pty = verts[i+1].y;
					}
		
					p1x = p0x + (p3x - last_ptx) * bias;
					p1y = p0y + (p3y - last_pty) * bias;
					p2x = p3x - (next_ptx - p0x) * bias;
					p2y = p3y - (next_pty - p0y) * bias;
	
				GFX_P5.strokeWeight(initialWeight * (1.0 - i/nPoints));
				GFX_P5.beginShape(); 
				for (let b=0; b<=nBez; b++){
					const t = b/nBez;
					const t2 = t * t;
					const t3 = t * t2;
					const onemt = 1.0 - t;
					const onemt2 = onemt * onemt;
					const onemt3 = onemt * onemt2;
					const onemt2t3 = 3.0 * t * onemt2;
					const onemtt23 = 3.0 * t2 * onemt;
					let ptx = (onemt3 * p0x) + (onemt2t3 * p1x) + (onemtt23 * p2x) + (t3 * p3x);
					let pty = (onemt3 * p0y) + (onemt2t3 * p1y) + (onemtt23 * p2y) + (t3 * p3y);
					GFX_P5.vertex(ptx, pty);
				}
				GFX_P5.endShape(); 
			}
			}
        }
      
    }
  
    //----------------------------------------------
    drawVerticesUnclosedContour(GFX_P5, GFX_P5_CTX, verts, sStyle, fStyle, weight=1){ 
		const N = verts.length; 
		if (N == 2){
			// drawing a quad is faster than drawing a line segment, even with all of the math. 
			GFX_P5.noStroke(); 
			switch(fStyle){
				case FILL_BLACK:   GFX_P5.fill(CYTO_BLACK); break;
				case FILL_WHITE:   GFX_P5.fill(designBgCol); break;
				case FILL_NONE:    GFX_P5.noFill(); break;
				case FILL_PATTERN: break;
			}
			const x0 = verts[0].x; 
			const y0 = verts[0].y; 
			const x1 = verts[1].x; 
			const y1 = verts[1].y; 
			let dx = x1-x0; 
			let dy = y1-y0;
			let dh = Math.sqrt(dx*dx + dy*dy);
			if (dh > 0){
				const W = weight/2;
				dx *= W/dh; 
				dy *= W/dh; 
				GFX_P5.quad(x0+dy,y0-dx, x1+dy,y1-dx, x1-dy,y1+dx, x0-dy,y0+dx);
				// quad(x0+dy,y0-dx, x1+dy,y1-dx, x1-dy,y1+dx, x0-dy,y0+dx, 1,1); // quad() in p5.js v.1.4 has detailX, detailY
			}
  
		} else {
			switch(sStyle){
				case STROKE_NONE:  GFX_P5.noStroke(); break;
				case STROKE_BLACK: GFX_P5.stroke(CYTO_BLACK); break;
				case STROKE_WHITE: GFX_P5.stroke(designBgCol); break;
			}
			GFX_P5.strokeWeight(weight); 
			GFX_P5.noFill(); 
			GFX_P5.beginShape(); 
			GFX_P5.curveVertex(verts[0].x, verts[0].y);
			for (let i=0; i<N; i++){
				GFX_P5.curveVertex(verts[i].x, verts[i].y);
			}
			GFX_P5.curveVertex(verts[N-1].x, verts[N-1].y);
			GFX_P5.endShape(); 
		}
	}
  
    //----------------------------------------------
    drawVerticesRandomlyDashed(GFX_P5, GFX_P5_CTX, verts, bSmooth, bClosed, sStyle, fStyle, weight, maxDashGap, maxDashLen){
		// Note: uses p5.random; must be seeded from outside.
		let theStyleSheet = this.mom.theStyleSheet;

		if (maxDashGap == 0){
			if (bClosed ){
				drawVerticesBezierClosed (GFX_P5, GFX_P5_CTX, verts, sStyle, fStyle, weight);
			} else {
				drawVerticesUnclosedContour(GFX_P5, GFX_P5_CTX, verts, sStyle, fStyle, weight); 
			}
  
		} else {
			const N = verts.length; 
			GFX_P5.strokeWeight(weight);
			GFX_P5.stroke(CYTO_BLACK); 
			GFX_P5.noFill(); 
  
			let i=0; 
			if (bClosed){
				let NN = N+1;
				let offset = ~~(myRandomAB(0,N/10));

				const orientationNotchWidth = theStyleSheet.orientationSensitiveDashNotchWidth;
				const myAng = theStyleSheet.orientationSensitiveOmitDashAngle;
				const myAngX = Math.cos(myAng); 
				const myAngY = Math.sin(myAng); 
			
				while (i < N){
					let dashLen = 2 + myRandomInt(1, maxDashLen);
					let Nmi = (N-i);
					if (Nmi <= 1){
						break;
					} else if (Nmi == 2){
						bSmooth = false;
						dashLen = 1; 
					} else if (Nmi < dashLen){
						dashLen = Nmi -1; 
					}
				
					if (bSmooth){
						GFX_P5.beginShape(); 
						let vi = (i+offset)%N;
						GFX_P5.curveVertex(verts[vi].x, verts[vi].y); 
						for (let j=0; j<dashLen; j++){
							vi = (i+offset)%N;
							if (i < NN){  
								GFX_P5.curveVertex(verts[vi].x, verts[vi].y);
							} 
							i++; 
						}
						GFX_P5.curveVertex(verts[vi].x, verts[vi].y);
						GFX_P5.endShape(); 

					} else {
						if (theStyleSheet.bOrientationSensitiveDashedContours) {
							// special case for a certain style of membrane
							GFX_P5.beginShape(); 
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
										GFX_P5.vertex(verts[vi].x, verts[vi].y); 
									} else {
										bSkipThisDash = true;
									}
								} 
								i++;
							}
							GFX_P5.endShape(); 

						} else {
							GFX_P5.beginShape(); 
							for (let j=0; j<dashLen; j++){
								let vi = (i+offset)%N;
								if (i < NN){  
									GFX_P5.vertex(verts[vi].x, verts[vi].y); 
								} i++; 
							}
							GFX_P5.endShape(); 
						}
					}
					let dashGap = ~~(myRandomAB(1,maxDashGap));
					i += dashGap -1; 
				}

			} else {
				let NN = N-1;
				while (i < N){
					let dashLen = 1 + Math.round(myRandomAB(1,maxDashLen));
					if (bSmooth){
						GFX_P5.beginShape(); 
						let vi = Math.min(i, NN);
						GFX_P5.curveVertex(verts[vi].x, verts[vi].y); 
						for (let j=0; j<dashLen; j++){
							vi = Math.min(i, NN);
							GFX_P5.curveVertex(verts[vi].x, verts[vi].y); 
							i++; 
						}
						GFX_P5.curveVertex(verts[vi].x, verts[vi].y); 
						GFX_P5.endShape(); 
					} else {
						GFX_P5.beginShape(); 
						for (let j=0; j<dashLen; j++){
							let vi = Math.min(i, NN);
							if (i < NN){  
								GFX_P5.vertex(verts[vi].x, verts[vi].y); 
							} i++; 
						}
						GFX_P5.endShape(); 
					}
					let dashGap = ~~(myRandomAB(1,maxDashGap));
					i += dashGap -1; 
				}
			}
      	}
    }
  
    //----------------------------------------------
    drawVerticesPolyline (GFX_P5, GFX_P5_CTX, verts, bClosed, sStyle, fStyle, weight=1){
		if (verts.length > 1){
			switch(sStyle){
				case STROKE_NONE:  
					GFX_P5.noStroke(); break;
				case STROKE_BLACK: 
					GFX_P5.strokeWeight(weight);
					GFX_P5.stroke(CYTO_BLACK); break;
				case STROKE_WHITE: 
					GFX_P5.strokeWeight(weight);
					GFX_P5.stroke(designBgCol); break;
			}
			switch(fStyle){
				case FILL_BLACK:   GFX_P5.fill(CYTO_BLACK); break;
				case FILL_WHITE:   GFX_P5.fill(designBgCol); break;
				case FILL_NONE:    GFX_P5.noFill(); break;
				case FILL_PATTERN: break;
			}

			GFX_P5.beginShape(); 
			for (let i=0; i<verts.length; i++){
				GFX_P5.vertex(verts[i].x, verts[i].y); 
			}
			if (bClosed){
				GFX_P5.endShape(CLOSE); 
			} else {
				GFX_P5.endShape(); 
			}
		}
    }
    
    //----------------------------------------------
    drawVerticesBezierClosed(GFX_P5, GFX_P5_CTX, verts, sStyle, fStyle, weight=1){
		const N = verts.length; 
		if (N > 0){
			const tightness = 1.0/3.0; 
			let p1 = this.getVertexPoint(verts, 0, 0, tightness);
			if (p1){
				let bStroke = true;
				switch(sStyle){
					case STROKE_NONE:  
						GFX_P5.noStroke(); 
						bStroke = false; break;
					case STROKE_BLACK: 
						GFX_P5.strokeWeight(weight);
						GFX_P5.stroke(CYTO_BLACK); break;
					case STROKE_WHITE: 
						GFX_P5.strokeWeight(weight);
						GFX_P5.stroke(designBgCol); break;
				}
				let bFill = true;
				switch(fStyle){
					case FILL_BLACK:   GFX_P5.fill(CYTO_BLACK); break;
					case FILL_WHITE:   GFX_P5.fill(designBgCol); break;
					case FILL_NONE:    GFX_P5.noFill(); bFill = false; break;
					case FILL_PATTERN: break;
				}

				GFX_P5_CTX.beginPath();
				GFX_P5_CTX.moveTo(p1.x, p1.y);
				for (let i=0; i<N; i++){
					const p2 = this.getVertexPoint(verts, i,    1, tightness);
					const p3 = this.getVertexPoint(verts, i+1, -1, tightness);
					const p4 = this.getVertexPoint(verts, i+1,  0, tightness);
					GFX_P5_CTX.bezierCurveTo(p2.x,p2.y, p3.x,p3.y, p4.x,p4.y);
				}
				GFX_P5_CTX.closePath();
				if (bFill) GFX_P5_CTX.fill();
				if (bStroke) GFX_P5_CTX.stroke();
			}
		}
    }


	//----------------------------------------------
    drawVerticesClosedPureP5(GFX_P5, GFX_P5_CTX, verts, sStyle, fStyle, weight, 
		noff, nfrq, namp01, nass01, nfall01, niba, nibs){

		const N = verts.length; 
		if (N > 0){
			const tightness = 1.0/3.0; 
			let p1 = this.getVertexPoint(verts, 0, 0, tightness);
			if (p1){
				let bStroke = true;
				switch(sStyle){
					case STROKE_NONE:  
						GFX_P5.noStroke(); 
						bStroke = false; break;
					case STROKE_BLACK: 
						GFX_P5.strokeWeight(weight);
						GFX_P5.stroke(CYTO_BLACK); break;
					case STROKE_WHITE: 
						GFX_P5.strokeWeight(weight);
						GFX_P5.stroke(designBgCol); break;
				}
				let bFill = true;
				switch(fStyle){
					case FILL_BLACK:   GFX_P5.fill(CYTO_BLACK); break;
					case FILL_WHITE:   GFX_P5.fill(designBgCol); break;
					case FILL_NONE:    GFX_P5.noFill(); bFill = false; break;
					case FILL_PATTERN: break;
				}
				GFX_P5.strokeWeight(0.25);

				let dvbThickness = weight / 2;
				let dvbNoiseFrequency = 16; //nfrq; // [10,5]
				let dvbNoiseAmplitude = namp01; // 1.0
				let dvbNibAngle = niba - HALF_PI; 
				let dvbNibStrength = nibs; //0.50); 
			
				let isForExport = (GFX_P5.width > 2048); 
				const nStrokes = max(1, ceil(map(weight,0,4, 3,7) * ((isForExport) ? 2 : 1))); //(isForExport) ? 13 : 5
				const nSamplesPerSegment = (isForExport) ? 10 : 5; 
			
				for (let h=0; h<nStrokes; h++){
					let ht = map(h, 0,nStrokes-1, 0,1);
					let p1x = p1.x;
					let p1y = p1.y;
					let prevSpineX = p1x; 
					let prevSpineY = p1y; 
					let currSpineX = prevSpineX; 
					let currSpineY = prevSpineY; 
					
					GFX_P5.beginShape(); 

					for (let i=0; i<=N; i++){
						let i0 = i%N;
						let i1 = (i+1)%N;
						const p2 = this.getVertexPoint(verts, i0,  1, tightness);
						const p3 = this.getVertexPoint(verts, i1, -1, tightness);
						const p4 = this.getVertexPoint(verts, i1,  0, tightness);

						for (let j=0; j<nSamplesPerSegment; j++){
							let t = j/nSamplesPerSegment;
							prevSpineX = currSpineX;
							prevSpineY = currSpineY;
							currSpineX = bezierPoint(p1x, p2.x, p3.x, p4.x, t);
							currSpineY = bezierPoint(p1y, p2.y, p3.y, p4.y, t);
							
							// GFX_P5.vertex(currSpineX, currSpineY); // simple version

							let dx = currSpineX - prevSpineX; 
							let dy = currSpineY - prevSpineY; 
							let dvbOrientation = atan2(dy,dx); 

							let dh = Math.sqrt(dx*dx + dy*dy); 
							if (dh > 0){
								dx /= dh; 
								dy /= dh; 

								let noiA = noise(currSpineX/dvbNoiseFrequency        , currSpineY/dvbNoiseFrequency) - 0.5;
								let noiB = noise(currSpineX/dvbNoiseFrequency + 100.0, currSpineY/dvbNoiseFrequency) - 0.5;
								let thA = dvbThickness * (1.0 + dvbNoiseAmplitude*noiA); 
								let thB = dvbThickness * (1.0 + dvbNoiseAmplitude*noiB); 
								let thAngScale = dvbNibStrength*(0.5 + 0.5*cos(2.0 * (dvbOrientation + dvbNibAngle)));
								thA *= ((1.0-dvbNibStrength) + thAngScale); 
								thB *= ((1.0-dvbNibStrength) + thAngScale); 

								let ax = currSpineX + thA*dy; 
								let ay = currSpineY - thA*dx; 
								let bx = currSpineX - thB*dy; 
								let by = currSpineY + thB*dx; 

								let px = lerp(ax, bx, ht); 
								let py = lerp(ay, by, ht); 
								GFX_P5.vertex(px, py); 
							}
						}
						p1x = p4.x; 
						p1y = p4.y;
					}
					GFX_P5.endShape();

				}
			}
		}
    }




	//----------------------------------------------
	getVertexPoint(verts, index, side, tightness){
		const N = verts.length; 
		if (side === 0){
			return (verts[index%N]); 
		} else {
			const vA = verts[(index+N-1)%N];
			const vB = verts[index%N];
			const vC = verts[(index+1)%N];

			let dABx = vA.x - vB.x;
			let dABy = vA.y - vB.y;
			const dABh = Math.sqrt(dABx*dABx + dABy*dABy);
		
			let dCBx = vC.x - vB.x;
			let dCBy = vC.y - vB.y;
			const dCBh = Math.sqrt(dCBx*dCBx + dCBy*dCBy);

			dABx /= dABh;
			dABy /= dABh;
			dCBx /= dCBh; 
			dCBy /= dCBh;

			const vPerpx = dABx + dCBx; 
			const vPerpy = dABy + dCBy;
			const vPerph = Math.sqrt(vPerpx*vPerpx + vPerpy*vPerpy); // can be zero when curve is straight
			let len = 0; 
			let outx = 0; 
			let outy = 0; 
			if (vPerph > 0){
				len = tightness / vPerph;
				const vCrosz = dABx * dCBy - dABy * dCBx;
				if (side === 1){
					len *= dCBh * ((vCrosz > 0) ? -1:1);
				} else { 
					len *= dABh * ((vCrosz < 0) ? -1:1);
				}
				outx = vB.x + (vPerpy * len);
				outy = vB.y - (vPerpx * len);
			} else {
				outx = vB.x;
				outy = vB.y;
			}
			// const outx = vB.x + (vPerpy * len);
			// const outy = vB.y - (vPerpx * len);
			return (createVector(outx, outy));
		}
	}
	
	
	//----------------------------------------------
	applySpringForces(whichPass){
		const nSprings = this.springs.length; 
		if (whichPass == 1){
			for (let i = 0; i < nSprings; i++) {
				this.springs[i].updatePass1();
			}
		} else if (whichPass == 2){
			for (let i = 0; i < nSprings; i++) {
				this.springs[i].updatePass2();
			}
		}
	}
	
	//----------------------------------------------
	update(whichPass) {
		const nParticles = this.particleIndices.length;
		for (let i = 0; i < nParticles; i++) {
			const ii = this.particleIndices[i];
			this.mom.myParticles[ii].update(whichPass);
		}
		let wpig = this.whichParticleIsGrabbed;
		if (mouseIsPressed && (wpig > -1)) {
			this.mom.myParticles[wpig].p.set(mouseX, mouseY);
		}
	}
};

  
