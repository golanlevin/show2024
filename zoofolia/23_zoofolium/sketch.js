/*
	---------------------------------------------------------------
	KEY COMMANDS

	The following keys provide high-level control of the software:
	* [ ]: (Space bar): Pause the simulation for 60 seconds.
	* [r]: Reset the current composition to initial conditions.
	* [n]: Generate a novel composition.
	* [S]: Export an SVG image for pen-plotting on A4-size paper.
	* [P]: Export a PNG image 
	* [d]: Toggle debug-view information.
	* [i]: Print diagnostic information to the console.
	* [h]: Print help information to the console.
	* [f]: Print the features/traits of the composition.

	These keys toggle certain visual features, possibly improving performance:
	* [z]: Toggle the background (paper) shader.
	* [x]: Toggle external rings, and/or hairs.
	* [c]: Toggle interior particles, if they exist.
	* [v]: Toggle Voronoi boundaries, if they exist.
	* [b]: Toggle particle blobs, if they exist.
	* [l]: Toggle CPU/GPU line-rendering.

	These keys allow you to design your own (ephemeral) composition:
	* [o]: Initiate a blank composition.
	* [0-9]: Add various features to the composition.
	* [g]: Grow the most recently-added feature.
	* [.]: Add particles to the composition.

	---------------------------------------------------------------
*/

'use strict';

const STRUCTURE_TYPE_LINE = 0;
const STRUCTURE_TYPE_LOOP = 1;
const STRUCTURE_TYPE_DASH = 2;
const STRUCTURE_TYPE_TRUSS = 3;
const STRUCTURE_TYPE_WHEEL = 4;
const STRUCTURE_TYPE_STAR = 5;
const STRUCTURE_TYPE_TREE = 6;
const STRUCTURE_TYPE_URCHIN = 7;
const STRUCTURE_TYPE_CENTI = 8;
const STRUCTURE_TYPE_BALL = 9;
const STRUCTURE_TYPE_MEMBRANE = 10; 
const STRUCTURE_TYPE_OFFSETS = 11;
const STRUCTURE_TYPE_LETTER = 12; // not used
const STRUCTURE_TYPE_BORDER = 13; // not used
const STRUCTURE_TYPE_TICK = 14; // ball + line
const STRUCTURE_TYPE_TAPEWORM = 15; // truss, truss, truss
const STRUCTURE_TYPE_SLAB = 16; // truss, truss truss
const STRUCTURE_TYPE_STARBALL = 17; // star + trusses
const PARTY_STYLE = -1; 
const N_CENTI_STYLES = 5; 

const SVG_WIDTH_MM = 457.2; // 18x25.4 210;
const SVG_HEIGHT_MM = 609.6; //297;
const PEN_WEIGHT_MM = 0.38; 
const ASPECT_1824 = 0.706; 

const STROKE_NONE = -1; 
const STROKE_BLACK = 0; 
const STROKE_WHITE = 1; 
const FILL_NONE = -1; 
const FILL_BLACK = 0; 
const FILL_WHITE = 1; 
const FILL_PATTERN = 2; 	


const LLOYD_SPEED = (79.0/128.0); //0.6171875
const SPRING_K = (38.0/128.0); //0.296875
const NUDGE = (1.0/8192.0); // 0.0001220703125

const MAX_N_PARTICLES = 16000; 
const RENDER_MODE_CANVAS = 1;
const nSecondsToFreeze = (60*60*24); 

const BASE_DIM = 840; //840;  // 210mm is A4
const shaderW = 256; //840;
const shaderH = 256; //840; 
const PIXEL_DENSITY = 2;
const EXPORT_SIZE = 5760; // 4096; // max is 5760 on my M1 


const WEIGHT_0 = 0.3800;// * (1246/840); // ultralight, for dashes
const WEIGHT_1 = 1.0000;// * (1246/840); // light, for lesser objects
const WEIGHT_2 = 2.2360;// * (1246/840); // heavy, for major lines
const WEIGHT_3 = 4.0000;// * (1246/840); // ultraheavy, only for mask

const VOR_W = BASE_DIM; // BASE_DIM; 
const VOR_H = BASE_DIM; //VOR_W; 
const MOUSE_REPULSION = -5.0; 
const MOUSE_FORCE_POW = 0.75; 
const MOUSE_FORCE_RADIUS_PERCENT = 0.05;
const MOUSE_FORCE_RADIUS_TIME = 100; // ms 
const MOUSE_CONTOUR_INFLUENCE = -0.25; 
const N_INITIAL_INTERIOR_POINTS = 700; 
const N_INITIAL_PARTICLE_ITERATIONS = 80;

const WHEEL_PAIR_STYLE_MODE_PARTY = 0;  
const WHEEL_PAIR_STYLE_MODE_MONOCULTURE = 1; 
const WHEEL_PAIR_STYLE_MODE_HALFMONOCULTURE = 2; 
const CONTOUR_MODE_AMORPHOUS = 2; 

const PARTICLE_SIZE_CONSTANT = 0; 
const PARTICLE_SIZE_SPEEDBASED = 1; 
const PARTICLE_SIZE_VARIEGATED = 2; 

const dtW = 256;
const dtH = 256;
const dtWm1 = dtW - 1;
const dtHm1 = dtH - 1;

const fadeInPhysicsNFrames = 400; // 300; 
const maxNSubcellsToAdd = 64;// 20; 
const shapeStdDevThresh = 0.05; //0.3;


		/*
		TODO: 

		* vary squirculuarity of cells[0]
		* make subcells use a common hash, or not.
		
		* Varible thickness for SVG export
		* Different hashes for subcells
		* Different subcell schema based on compactness, elongation etc
		* variations of schema 106
		* decorations in 106 - stars, etc. 

		important: 
		subcellOccupancy in sketch.js
		REST_L in adjustRestLength() in cyto.js
		crowdingFactor in cyto.js


		making cell[i] small looks better, but needs adjustment for crowding. 
		*/


//===============================================================
// GLOBALS
let FPS = 60;
let mousePressedTime = 0; 
let mouseReleasedTime = 0; 
let wheelStylePairs;
let loopStylePairs; 
let bApplyMouseForces = true;
let bApplyFlockingForces = true;
let DAMPING = (123.0/128.0); // 0.9609375
let maskR = 0.4;
let bVerbose = !true; 
let bInvert = !true;

let cells = [];
let hashForSubcells; 
let ogIllustration;
let bMadeCellReplacements = false; 

let dtInGraphics;
let dtOutGraphics; 

let canvasDimPriorToScreencapture; 
let bSaveScreencapture = false; 
let exportUpscale = 1; 
let dstBBs = []; 

let CYTO_BLACK = 255;
let CYTO_WHITE = 0; 
let designBgCol = CYTO_WHITE; //'AntiqueWhite';


//===============================================================
function setup() {
	frameRate(120); 
	pixelDensity(PIXEL_DENSITY); 

	setupGlobals(); 
	ogIllustration = createGraphics(shaderW, shaderH);

	dtInGraphics = createGraphics(dtW, dtH, P2D);
	dtOutGraphics = createGraphics(dtW, dtH, P2D);
	dtInGraphics.pixelDensity(1);
	dtOutGraphics.pixelDensity(1);
	let dtiCtx = dtInGraphics.canvas.getContext("2d", { willReadFrequently: true });
	let dtoCtx = dtOutGraphics.canvas.getContext("2d", { willReadFrequently: true });
	dtiCtx.willReadFrequently = true; 
	dtoCtx.willReadFrequently = true; 


	hashForSubcells = getRandomFxhash(); // //"ooABz68TfTbK4MD7ND69m93TfdoxXiJhWqEfSob5WoRRUhKu2hu"
	cells[0] = new Cyto(0,null,null, dtInGraphics,dtOutGraphics, null); 

	windowResized();
}



function draw(){

	background(CYTO_WHITE); 

	// Draw Cell #0
	ogIllustration.clear(); 
	ogIllustration.background(CYTO_WHITE);
	ogIllustration.push(); 
	ogIllustration.scale(exportUpscale); 

	ogIllustration.blendMode(BLEND);
	cells[0].updateDebugView(); 
	cells[0].drawDesign(ogIllustration);

	updateCellReplacement(); 
	let nCells = cells.length;
	if (nCells > 1){
		for (let i=1; i<nCells; i++){
			let correspondingIdOfStructureInCell0 = cells[i].correspondingIdOfStructureInCell0;
			let correspondingStructure = cells[0].myStructures[correspondingIdOfStructureInCell0];
			let dstBB = correspondingStructure.getBoundingBox(); 
			///// let dstBB = dstBBs[i]; 
			let srcBB = cells[i].myStructures[0].getBoundingBox(); 
			let dstOx = map(0, srcBB.x,srcBB.x+srcBB.w, dstBB.x,dstBB.x+dstBB.w); 
			let dstOy = map(0, srcBB.y,srcBB.y+srcBB.h, dstBB.y,dstBB.y+dstBB.h); 
			let insertScale = dstBB.w / srcBB.w;

			ogIllustration.push(); {
				ogIllustration.translate(width/BASE_DIM*dstOx, width/BASE_DIM*dstOy); 
				ogIllustration.scale(insertScale); 
				cells[i].updateDebugView(); 
				ogIllustration.blendMode(BLEND);
				cells[i].drawDesign(ogIllustration);
			}
			ogIllustration.pop(); 
		}
	}
	ogIllustration.pop(); 
	blendMode(BLEND);
	image(ogIllustration, 0,0, ogIllustration.width, ogIllustration.height);

}



class Shape {
    constructor(id, val) {
        this.id = id;
        this.value = val;
    }
}
// Function to sort shapes by area and return the index of the largest
function findLargestShapeIndex(shapes) {
    shapes.sort((a, b) => b.value - a.value);
}
// Function to detect clusters of similarly-sized shapes
function detectClusters(shapes, thresh) {
	if (shapes.length === 0) {
	  return []; // Return an empty array if the list is empty
	}
	let clusters = [];
	let currentCluster = [shapes[0]];
	for (let i = 1; i < shapes.length; i++) {
	  if (abs(shapes[i].value - shapes[i - 1].value) < thresh){
		currentCluster.push(shapes[i]);
	  } else {
		clusters.push(currentCluster);
		currentCluster = [shapes[i]];
	  }
	}
	clusters.push(currentCluster);
	return clusters;
}
// Function to find the indices of shapes in the largest cluster
function findLargestClusterIndices(shapes, thresh) {
    let clusters = detectClusters(shapes, thresh);
    if (clusters.length === 0) {
        return []; // Return an empty array if there are no clusters
    }
    // Find the largest cluster
    let largestCluster = clusters.reduce((maxCluster, currentCluster) => 
        currentCluster.length > maxCluster.length ? currentCluster : maxCluster, []);
    // Find the indices of shapes in the largest cluster
    let indices = [];
    largestCluster.forEach(shape => {
        indices.push(shape.id /*indexOf(shape)*/ );
    });
    return indices;
}

// Function to calculate the standard deviation of an array of numbers
function calculateStandardDeviation(values) {
	const mean = values.reduce((a, b) => a + b, 0) / values.length;
	const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
	const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
	return Math.sqrt(avgSquaredDiff);
}
function determineThreshold(shapes, fractionOfStdDev = 0.5) {
	if (shapes.length === 0) {
	  return 0; // Return 0 if there are no shapes
	}
	const values = shapes.map(shape => shape.value);
	const stdDev = calculateStandardDeviation(values);
	return fractionOfStdDev * stdDev;
}



//------------------------------
function updateCellReplacement(){
	if (!bMadeCellReplacements){

	
		let nCells = cells.length;

		let bDoAddSubCells = false; 
		let whichCellAreWeAddingTo = 0; 
		if (cells[whichCellAreWeAddingTo].pauseIfJustFinished()){
			bDoAddSubCells = true;
		}
		if (nCells > 1){
			for (let i=1; i<nCells; i++){
			//	cells[i].pauseIfJustFinished(); // if we want them all to stop eventually
			}
		}

		let schemaOfCell0 = cells[whichCellAreWeAddingTo].theStyleSheet.THE_SCHEMA;

		const minContourCompactness = 0.3;//0.5;
		const minContourAreaFrac = 0.003; 
		const maxContourAreaFrac = 0.06; 
		const maxElongation = 3.2;
		let subcellOccupancy = 0.50; 
		let nAddedSubcells = 0; 
		let percentageOfShapesInCluster = 0.255;//0.55
		let bHasTupletSubcells = !true;


		// Get the outlines of target shapes for subcells
		if (cells[whichCellAreWeAddingTo].bHasFinished){
			let nStructuresInCell0 = cells[whichCellAreWeAddingTo].myStructures.length; 
			let relevantStructureCount = 0; 
			let indicesOfAcceptableStructures = [];
			let indicesOfCluster = [];

			// Find largest cluster: the indices of a cluster of shapes of similar size. 
			if (bHasTupletSubcells){
				let shapes = [];
				for (let i=0; i<nStructuresInCell0; i++){
					let ithStructure = cells[whichCellAreWeAddingTo].myStructures[i];
					if ((ithStructure.type == STRUCTURE_TYPE_LOOP) || (ithStructure.type == STRUCTURE_TYPE_WHEEL)){
						let contours = ithStructure.getContours(true);
						if (contours.length > 0){
							let contourVerts = contours[0].verts;
							let contourElongation = getElongation (contourVerts);	
							let contourArea = abs(polygonArea (contourVerts));
							let contourAreaFrac = contourArea / (BASE_DIM*BASE_DIM);
							let contourPerim = polygonPerimeter (contourVerts);
							let contourCompactness = 4*PI*contourArea / (contourPerim*contourPerim); 
							
							if ((contourCompactness > minContourCompactness) && 
								(contourAreaFrac > minContourAreaFrac) && 
								(contourElongation < maxElongation)) {  
								shapes.push(new Shape(i, contourAreaFrac)); 
							}
						}
					}
				}
				if (shapes.length > 0){
					shapes = shapes.sort((a, b) => b.value - a.value);
					let minDistToHalfCount = 999; 
					let ssdtThatProducesClusterWithApproximatelyHalfTheShapes = 0.01; 

					let ssdt = shapeStdDevThresh; 
					for (let i=1; i<100; i++){
						ssdt = 0.001 * i; 
						let areaFractionThreshold = determineThreshold(shapes, ssdt);
						let tmpIndicesOfCluster = findLargestClusterIndices(shapes, areaFractionThreshold);
						print(i + "\t" + nf(ssdt,1,4) + "\t" + tmpIndicesOfCluster.length + "\t" + tmpIndicesOfCluster); 

						let distToHalfCount = abs(tmpIndicesOfCluster.length - (shapes.length*percentageOfShapesInCluster));
						if (distToHalfCount < minDistToHalfCount){
							minDistToHalfCount = distToHalfCount; 
							ssdtThatProducesClusterWithApproximatelyHalfTheShapes = ssdt;
							indicesOfCluster = tmpIndicesOfCluster; 
						}
					}
					print ("best SSDT = " + ssdtThatProducesClusterWithApproximatelyHalfTheShapes); 
				}
			}

			// Grab indices of all acceptable WHEELS or LOOPS
			for (let i=0; i<nStructuresInCell0; i++){
				let ithStructure = cells[whichCellAreWeAddingTo].myStructures[i];
				if ((ithStructure.type == STRUCTURE_TYPE_WHEEL) || (ithStructure.type == STRUCTURE_TYPE_LOOP)){
					let contours = ithStructure.getContours(true);
					if (contours.length > 0){
						let contourVerts = contours[0].verts;
						let contourElongation = getElongation (contourVerts);	
						let contourArea = abs(polygonArea (contourVerts));
						let contourAreaFrac = contourArea / (BASE_DIM*BASE_DIM);
						let contourPerim = polygonPerimeter (contourVerts);
						let contourCompactness = 4*PI*contourArea / (contourPerim*contourPerim); 
							// subcells must be reasonably large // (contourAreaFrac > minContourAreaFrac) 
							// subcells must be reasonably compact 
							// subcells must not be too skinny 
							// and cannot be inside another structure which was already converted to a subcell.
						
						if ((contourCompactness > minContourCompactness) && 
							(contourAreaFrac > minContourAreaFrac) && 
							(contourElongation < maxElongation)) {  
							indicesOfAcceptableStructures.push(i); 
						}
					}
				}
			}


			/*
			//--------------
			if (schemaOfCell0 == 105) {
				// pick the inner wheels
				let indicesOfInnerWheels = [];
				for (let i=0; i<nStructuresInCell0; i++){
					let ithStructure = cells[whichCellAreWeAddingTo].myStructures[i];
					if (ithStructure.type == STRUCTURE_TYPE_WHEEL){
						let enclosingId = ithStructure.getEnclosingStructureId(); 
						if (enclosingId > 0){
							indicesOfInnerWheels.push(enclosingId);//i);
						}
					}
				}
				indicesOfAcceptableStructures = indicesOfInnerWheels;
			}
			*/



			//-------------
			for (let i=0; i<nStructuresInCell0; i++){
				let ithStructure = cells[whichCellAreWeAddingTo].myStructures[i];
				if ((ithStructure.type == STRUCTURE_TYPE_LOOP) || (ithStructure.type == STRUCTURE_TYPE_WHEEL)){
					relevantStructureCount++;

					let contours = ithStructure.getContours(true);
					if (contours.length > 0){
						let contourVerts = contours[0].verts;
						if (indicesOfAcceptableStructures.includes(i)){
							if (bDoAddSubCells && (nAddedSubcells < maxNSubcellsToAdd)){

								let bb = ithStructure.getBoundingBox(); 
								let bbcx = bb.x+bb.w/2; 
								let bbcy = bb.y+bb.h/2; 
								let contourScale = (bb.w > bb.h) ? (BASE_DIM / bb.w) : (BASE_DIM / bb.h);

								subcellOccupancy = 0.9870; 
								contourScale *= subcellOccupancy;
	
								let cellMask = new ofPolyline(); 
								for (let k=0; k<contourVerts.length; k++){
									let px = BASE_DIM/2 + contourScale * (contourVerts[k].x - bbcx); 
									let py = BASE_DIM/2 + contourScale * (contourVerts[k].y - bbcy); 
									cellMask.add(px,py,0); 
								} cellMask.close(); 

								nAddedSubcells++;
								let correspondingIdOfStructureInCell0 = i; 
								cells[whichCellAreWeAddingTo].hideStructureAndItsSubstructures(correspondingIdOfStructureInCell0);

								let aHash = hashForSubcells;
								if (indicesOfCluster.includes(i) && bHasTupletSubcells){
									// make each subcell in the cluster share the same hash
									aHash = hashForSubcells;
								} else {
									// make each subcell have its own hash. 
									let nr0 = int(random(100,500));
									for (let r=0; r<nr0; r++){
										aHash = getRandomFxhash();
									}
								}
						
								myRandomReset(aHash);
								let parentSchema = cells[0].theStyleSheet.THE_SCHEMA; 
								cells[nAddedSubcells] = new Cyto(1, cellMask, correspondingIdOfStructureInCell0, 
									dtInGraphics,dtOutGraphics, aHash, parentSchema);                

								for (let j=0; j<cells[whichCellAreWeAddingTo].myParticles.length; j++){
									let px = cells[whichCellAreWeAddingTo].myParticles[j].p.x;
									let py = cells[whichCellAreWeAddingTo].myParticles[j].p.y;
									if (pointInsideVerts (px, py, contourVerts, contourVerts.length)){
										cells[whichCellAreWeAddingTo].myParticles[j].bDrawSiteBlob = false; 
									}
								}

								windowResized();
							}
						}
					}

					
				}
			}
			

			bMadeCellReplacements = true; 
			
		}
	}
}



//------------------------------
function windowResized() { 
	if (bVerbose){ print("windowResized"); }
	let dim = Math.min(windowWidth, windowHeight);
    resizeCanvas(dim,dim);
	pixelDensity(PIXEL_DENSITY); 
	for (let i=0; i<cells.length; i++){
		cells[i].cyWindowResized(); 
	}
	ogIllustration.resizeCanvas(dim, dim);   
	ogIllustration.pixelDensity(PIXEL_DENSITY); 
	
}

//------------------------------
function mouseReleased() {
	mouseReleasedTime = millis(); 
	for (let i=0; i<cells.length; i++){
		cells[i].cyMouseReleased(); 
	}
}

//------------------------------
function mousePressed () {
	mousePressedTime = millis(); 
	mouseReleasedTime = mousePressedTime-1;
	for (let i=0; i<cells.length; i++){
		cells[i].cyMousePressed(); 
	}
}

//------------------------------
function keyPressed(){

	if (key == 'i'){
		bInvert = !bInvert; 
		CYTO_BLACK = 255 - CYTO_BLACK;
		CYTO_WHITE = 255 - CYTO_BLACK; 
		designBgCol = CYTO_WHITE; //'AntiqueWhite';

	}
	if ((key == 'n') || (key == 'r')){
		let nr0 = int(random(100,500));
		for (let r=0; r<nr0; r++){
			hashForSubcells = getRandomFxhash();
		}

		bMadeCellReplacements = false; 
		for (let i = 1; i < cells.length; i++) {cells[i] = null;}
		cells.length = 1;
		dstBBs = [];
	
	} else if (key == 'S'){
		// MAKE SVG. 
		createSVG(true); // membranes
		createSVG(false); // rest
		

	} else if (key == 'P'){
		for (let i = 1; i < cells.length; i++) {
			cells[i].bShowDebug = false; 
		}
		bSaveScreencapture = true; 
		handleScreenCapture(); 
	}

	for (let i=0; i<cells.length; i++){
		cells[i].cyKeyPressed(key);
	}
}





//===============================================================
function createSVG(bDoMembranesOnly){

	let TX = 0.0 - 0.5*(BASE_DIM * (1.0 - (18.0/24.0))); 
	let TY = 0; 
	let TS = 1.0; 
	let svgStr = ''; 

	let bDoCell0Only = false; 
	if (bDoCell0Only){
		svgStr += cells[0].createSVG_head(); 
		svgStr += cells[0].createSVG_body(TX, TY, TS); 
		svgStr += cells[0].createSVG_tail(); 
		let svgStrArr = [svgStr];
		let svgFilename = "zoofolium_" + cells[0].THE_CURRENT_HASH;
		saveStrings(svgStrArr, svgFilename, "svg"); 


	} else if (bDoMembranesOnly){
		svgStr += cells[0].createSVG_head(); 
		svgStr += '<g id="MAIN_CELL"> \n';
		svgStr += cells[0].createSVG_membranes(TX, TY, TS); 
		svgStr += "</g>\n"

		if (cells.length > 0){
			for (let i=1; i<cells.length; i++){
				let correspondingIdOfStructureInCell0 = cells[i].correspondingIdOfStructureInCell0;
				let correspondingStructure = cells[0].myStructures[correspondingIdOfStructureInCell0];
				let dstBB = correspondingStructure.getBoundingBox(); 
				let srcBB = cells[i].myStructures[0].getBoundingBox(); 
				let dstOx = map(0, srcBB.x,srcBB.x+srcBB.w, dstBB.x,dstBB.x+dstBB.w); 
				let dstOy = map(0, srcBB.y,srcBB.y+srcBB.h, dstBB.y,dstBB.y+dstBB.h); 
				let insertScale = dstBB.w / srcBB.w;
				let tx = TX + dstOx;
				let ty = TY + dstOy;
				let ts = TS * insertScale;
				svgStr += '<g id="CELL_' + i + '"> \n';
				svgStr += cells[i].createSVG_membranes(tx,ty,ts); 
				svgStr += "</g>\n"
			}
		}
		svgStr += cells[0].createSVG_tail(); 
		let svgStrArr = [svgStr];
		let svgFilename = "zoofolium_" + cells[0].THE_CURRENT_HASH + "_MEMB";
		saveStrings(svgStrArr, svgFilename, "svg"); 



	} else {
		let bOmitHeavyMembranes = true; 
		svgStr += cells[0].createSVG_head(); 
		svgStr += '<g id="MAIN_CELL"> \n';
		svgStr += cells[0].createSVG_body(TX, TY, TS, bOmitHeavyMembranes); 
		svgStr += "</g>\n"

		if (cells.length > 0){
			for (let i=1; i<cells.length; i++){
				let correspondingIdOfStructureInCell0 = cells[i].correspondingIdOfStructureInCell0;
				let correspondingStructure = cells[0].myStructures[correspondingIdOfStructureInCell0];
				let dstBB = correspondingStructure.getBoundingBox(); 
				let srcBB = cells[i].myStructures[0].getBoundingBox(); 
				let dstOx = map(0, srcBB.x,srcBB.x+srcBB.w, dstBB.x,dstBB.x+dstBB.w); 
				let dstOy = map(0, srcBB.y,srcBB.y+srcBB.h, dstBB.y,dstBB.y+dstBB.h); 
				let insertScale = dstBB.w / srcBB.w;
				let tx = TX + dstOx;
				let ty = TY + dstOy;
				let ts = TS * insertScale;

				svgStr += '<g id="CELL_' + i + '"> \n';
				svgStr += cells[i].createSVG_body(tx,ty,ts, bOmitHeavyMembranes); 
				svgStr += "</g>\n"
			}
		}

		svgStr += cells[0].createSVG_tail(); 
		let svgStrArr = [svgStr];
		let svgFilename = "zoofolium_" + cells[0].THE_CURRENT_HASH;
		saveStrings(svgStrArr, svgFilename, "svg"); 
	}
}

//===============================================================
function handleScreenCapture(){

	if (bSaveScreencapture){
		let beginRenderTime = millis(); 
		let pngFilename = "zoofolium_" + cells[0].THE_CURRENT_HASH;
		print("Saving... " + pngFilename);
		
		let prevDim = Math.min(windowWidth, windowHeight);
		exportUpscale = int ((16384 / PIXEL_DENSITY) / prevDim); // High-Res Export factor

		let highDim = exportUpscale * prevDim; 
		ogIllustration = createGraphics(highDim, highDim);
		draw();
		save(ogIllustration, pngFilename, 'png');
		ogIllustration = createGraphics(prevDim, prevDim);
		draw();

		bSaveScreencapture = false; 
		exportUpscale = 1; 
		let elapsed = (millis() - beginRenderTime)/1000.0; 
		let report = "Rendered output file in " + nf(elapsed,1,3) + "s. :\n" + pngFilename + ".png";
		print(report);
	}
}

//------------------------------
function setupGlobals(){
	//		  13          4         32         16         36         18         22         24         20         25           7          13          15           8           5
	wheelStylePairs = [
		[[0,0],0], [[0,1],0], [[0,2],8], [[0,3],0], [[0,4],9], [[0,5],0], [[0,6],2], [[0,7],0], [[0,8],6], [[0,9],1], [[0,10],1], [[0,11],1], [[0,12],2], [[0,14],0], [[0,17],0], /* 30 */
		[[1,0],1], [[1,1],0], [[1,2],5], [[1,3],4], [[1,4],3], [[1,5],0], [[1,6],1], [[1,7],1], [[1,8],2], [[1,9],3], [[1,10],0], [[1,11],4], [[1,12],1], [[1,14],2], [[1,17],0], /* 27 */
		[[2,0],3], [[2,1],2], [[2,2],0], [[2,3],2], [[2,4],2], [[2,5],1], [[2,6],1], [[2,7],4], [[2,8],3], [[2,9],8], [[2,10],2], [[2,11],1], [[2,12],3], [[2,14],1], [[2,17],0], /* 33 */
		[[3,0],0], [[3,1],0], [[3,2],5], [[3,3],0], [[3,4],8], [[3,5],0], [[3,6],2], [[3,7],4], [[3,8],3], [[3,9],0], [[3,10],0], [[3,11],2], [[3,12],3], [[3,14],2], [[3,17],0], /* 29 */
		[[4,0],5], [[4,1],0], [[4,2],4], [[4,3],2], [[4,4],0], [[4,5],4], [[4,6],7], [[4,7],9], [[4,8],0], [[4,9],7], [[4,10],2], [[4,11],0], [[4,12],1], [[4,14],0], [[4,17],1], /* 42 */
		[[5,0],0], [[5,1],0], [[5,2],0], [[5,3],0], [[5,4],0], [[5,5],0], [[5,6],1], [[5,7],3], [[5,8],1], [[5,9],0], [[5,10],0], [[5,11],0], [[5,12],0], [[5,14],0], [[5,17],3], /*  8 */
		[[6,0],1], [[6,1],0], [[6,2],0], [[6,3],3], [[6,4],8], [[6,5],7], [[6,6],0], [[6,7],0], [[6,8],2], [[6,9],2], [[6,10],0], [[6,11],0], [[6,12],1], [[6,14],0], [[6,17],0], /* 24 */
		[[7,0],0], [[7,1],0], [[7,2],2], [[7,3],2], [[7,4],6], [[7,5],0], [[7,6],2], [[7,7],0], [[7,8],2], [[7,9],0], [[7,10],0], [[7,11],0], [[7,12],2], [[7,14],0], [[7,17],0], /* 15 */
		[[8,0],2], [[8,1],1], [[8,2],7], [[8,3],2], [[8,4],0], [[8,5],2], [[8,6],5], [[8,7],2], [[8,8],0], [[8,9],4], [[8,10],1], [[8,11],5], [[8,12],1], [[8,14],3], [[8,17],1], /* 36 */
		[[17,0],1],[[17,1],1],[[17,2],1],[[17,3],1],[[17,4],0],[[17,5],4],[[17,6],1],[[17,7],1],[[17,8],1],[[17,9],0],[[17,10],1],[[17,11],0],[[17,12],1],[[17,14],0]             /* 13 */
	];
	loopStylePairs = [ [[0,0],20], [[0,2],15], [[2,5],20], [[0,5],20], [[2,4],23], [[3,3],2]];
	canvasDimPriorToScreencapture = width; 
	bSaveScreencapture = false; 
	bMadeCellReplacements = false; 
}