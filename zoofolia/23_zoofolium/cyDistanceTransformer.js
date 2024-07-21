
//==========================================================
/*

 /$$$$$$$  /$$$$$$  /$$$$$$  /$$$$$$$$     /$$   /$$ /$$$$$$$$ /$$$$$$  /$$$$$$$  /$$      /$$
| $$__  $$|_  $$_/ /$$__  $$|__  $$__/    | $$  / $$| $$_____//$$__  $$| $$__  $$| $$$    /$$$
| $$  \ $$  | $$  | $$  \__/   | $$       |  $$/ $$/| $$     | $$  \ $$| $$  \ $$| $$$$  /$$$$
| $$  | $$  | $$  |  $$$$$$    | $$ /$$$$$$\  $$$$/ | $$$$$  | $$  | $$| $$$$$$$/| $$ $$/$$ $$
| $$  | $$  | $$   \____  $$   | $$|______/ >$$  $$ | $$__/  | $$  | $$| $$__  $$| $$  $$$| $$
| $$  | $$  | $$   /$$  \ $$   | $$        /$$/\  $$| $$     | $$  | $$| $$  \ $$| $$\  $ | $$
| $$$$$$$/ /$$$$$$|  $$$$$$/   | $$       | $$  \ $$| $$     |  $$$$$$/| $$  | $$| $$ \/  | $$
|_______/ |______/ \______/    |__/       |__/  |__/|__/      \______/ |__/  |__/|__/     |__/

*/

class DistanceTransformer {

	constructor(mom) {
		this.particles = [];
		this.structures = []; 
		this.mom = mom; 

		this.dtInGraphics = mom.dtInGraphics; //createGraphics(dtW, dtH, P2D);
		this.dtOutGraphics = mom.dtOutGraphics; // createGraphics(dtW, dtH, P2D);
		// this.dtInGraphics.pixelDensity(1);
		// this.dtOutGraphics.pixelDensity(1);

		this.dtInBuffer = new Int8Array(dtW * dtH); // -128 to 127
		this.dtOutBuffer = new Int16Array(dtW * dtH); // -32768 to 32767
	}


	//----------------------------------------------------
	computeDistanceTransform(bDrawDtDebug, forWhichStructure, myP, myS) {
		this.particles = myP; 
		this.structures = myS; 

		let returnObj = this.renderStructuresForDistanceTransform(forWhichStructure);
		let occupancy = returnObj[0];
		let whiteArea = returnObj[1];

		this.initDistanceTransformOutput();
		this.propagateDistanceTransform();
		this.copyDTResultToOutputGraphics();

		// Location of the brightest point on the distance transform
		let maxValPos = this.findLocationOfMaximumValueInDistanceTransform();
		let dtMaxX = (maxValPos.x/dtW)*BASE_DIM; 
		let dtMaxY = (maxValPos.y/dtH)*BASE_DIM; 

		let closestStuff = this.mom.determineClosestStructureAndParticle(dtMaxX, dtMaxY, BASE_DIM, false);
		let closestStuffDistance = -1;
		let closestX = dtMaxX;
		let closestY = dtMaxY;  

		if (closestStuff.closestParticleGlobalId > -1){
			closestX = this.particles[closestStuff.closestParticleGlobalId].p.x; 
			closestY = this.particles[closestStuff.closestParticleGlobalId].p.y; 
			closestStuffDistance = dist(dtMaxX, dtMaxY, closestX, closestY); 
		} else if (closestStuff.closestStructureId == -1){
			closestStuffDistance = 99999; // hack fix, needs to be here. 
		}

		if (bDrawDtDebug){
			blendMode(BLEND);
			image(this.dtInGraphics,  0,   height - dtH);
			image(this.dtOutGraphics, dtW, height - dtH);
			
			noFill(); 
			stroke('red'); 
			strokeWeight(2); 
			let f = width/BASE_DIM;
			circle(f*dtMaxX, f*dtMaxY, 30);
			line(f*dtMaxX, f*dtMaxY, f*closestX, f*closestY); 
		}
		
		let outputStruct = {
			'dtx':dtMaxX, 
			'dty':dtMaxY,
			'minDist': closestStuffDistance,
			'occupancy': occupancy,
			'area': whiteArea
		};
		return outputStruct;
	}
																			
	//----------------------------------------------------
	renderStructuresForDistanceTransform(inWhichStructure){
		
		this.dtInGraphics.background(0,0,0); 
		this.dtInGraphics.push(); 
		this.dtInGraphics.scale(dtW/BASE_DIM); 

		const nBytes = 4 * dtW * dtH;
		let bCalculateOccupancy = true;
		let whitePixelCountWithHoles = 0; 
		let whitePixelCount = 0; 
		let occupancy = 0; 

		let bDoEntireDiagram = true; 
		let nStructuresMin = 0; 
		if (inWhichStructure > 0){
			bDoEntireDiagram = false;
			bCalculateOccupancy = false;
			nStructuresMin = inWhichStructure;
		}
		
		const nStructures = this.structures.length;
		if (nStructures > nStructuresMin){

			// Special case for the membrane
			if (bDoEntireDiagram){
				let aPolyline = this.mom.getMembraneInteriorContour(); 
				if (aPolyline){
					this.dtInGraphics.noStroke();
					this.dtInGraphics.fill(255);
					this.dtInGraphics.beginShape();
					for (let i=0; i<aPolyline.length; i++){
						let px = aPolyline[i].x; 
						let py = aPolyline[i].y; 
						this.dtInGraphics.vertex(px, py); 
					}
					this.dtInGraphics.endShape(CLOSE); 
				}
				if (bCalculateOccupancy){
					this.dtInGraphics.loadPixels();
					for (let i = 0; i < nBytes; i+=4) {
						whitePixelCount += ((this.dtInGraphics.pixels[i] < 127) ? 0 : 1);
					}
				}
			}

			for (let i=0; i<nStructures; i++){
				if ((this.structures[i].type == STRUCTURE_TYPE_OFFSETS)){
					continue; 
				}

				let structFillCol = 0;
				if (!bDoEntireDiagram && (i==inWhichStructure)){ structFillCol = 255;}
				this.dtInGraphics.strokeWeight(9); 
				this.dtInGraphics.strokeJoin(ROUND); 
				this.dtInGraphics.stroke(structFillCol);

				const bSimplified = true; 
				let contours = this.structures[i].getContours(bSimplified);

				for (let j=0; j<contours.length; j++){
					let aStyledPolyline = contours[j];
					let aStyledPolylineVerts = contours[j].verts;

					if (aStyledPolyline.bClosed){
						this.dtInGraphics.fill(structFillCol);
					} else {
						this.dtInGraphics.noFill();
					}
					this.dtInGraphics.beginShape();
					for (let k=0; k<aStyledPolylineVerts.length; k++){
						let px = aStyledPolylineVerts[k].x; 
						let py = aStyledPolylineVerts[k].y; 
						this.dtInGraphics.vertex(px, py); 
					}
					if (aStyledPolyline.bClosed){
						this.dtInGraphics.endShape(CLOSE); 
					} else {
						this.dtInGraphics.endShape(); 
					}
				}
			}

			if (bCalculateOccupancy){
				this.dtInGraphics.loadPixels();
				for (let i = 0; i < nBytes; i+=4) {
					whitePixelCountWithHoles += ((this.dtInGraphics.pixels[i] < 127) ? 0 : 1);
				}
				occupancy = whitePixelCountWithHoles / whitePixelCount;
			}
			
		}
		this.dtInGraphics.pop(); 
		let returnObject = [occupancy, whitePixelCountWithHoles];
		return returnObject; 
	}


	//----------------------------------------------------
	initDistanceTransformOutput() {
		// Copy from inputGraphics (C4) to inputBuffer (8uC1)
		const nPix = dtW * dtH;
		this.dtInGraphics.loadPixels();
		for (let i = 0; i < nPix; i++) {
			let value = this.dtInGraphics.pixels[i * 4]; // red byte
			this.dtInBuffer[i] = (value < 127) ? 0 : 255;
		}

		const bignum = 32767; // Initialize result
		this.dtOutBuffer.fill(bignum);
		let count = 0;
		for (let j = 0; j < dtH; j++) {
			let row = dtW * j;
			for (let i = 0; i < dtW; i++) {
				let idx = i + row;
				if (this.isBoundaryDT(i, j, idx)) {
					this.dtOutBuffer[idx] = 0;
					count++;
				} else if (this.isJustOutsideDT(i, j, idx)) {
					this.dtOutBuffer[idx] = -1;
				}
			}
		}
		return count;
	}

	//----------------------------------------------------
	idt(idx, x, y, dx, dy) {
		let xpdx = x + dx;
		let ypdy = y + dy;
		if (xpdx < 0 || ypdy < 0 || xpdx >= dtW || ypdy >= dtH) return;
		let value = this.dtOutBuffer[xpdx + dtW * ypdy];
		let distance = dx == 0 || dy == 0 ? 12 : 17; // ratio of ~1:sqrt2
		value += distance * (value < 0 ? -1 : 1);
		if (Math.abs(this.dtOutBuffer[idx]) > Math.abs(value)) {
			this.dtOutBuffer[idx] = value;
		}
	}

	//----------------------------------------------------
	propagateDistanceTransform () {
		let i, j, row, idx;
		for (j = 0; j < dtH; j++) {
			row = j * dtW;
			for (i = 0; i < dtW; i++) {
				idx = row + i;
				this.idt(idx, i, j, -1, 0);
				this.idt(idx, i, j, -1, -1);
				this.idt(idx, i, j, 0, -1);
			}
		}
		for (j = dtHm1; j >= 0; j--) {
			row = j * dtW;
			for (i = dtWm1; i >= 0; i--) {
				idx = row + i;
				this.idt(idx, i, j, 1, 0);
				this.idt(idx, i, j, 1, 1);
				this.idt(idx, i, j, 0, 1);
			}
		}
		for (i = dtWm1; i >= 0; i--) {
			for (j = dtHm1; j >= 0; j--) {
				idx = j * dtW + i;
				this.idt(idx, i, j, 1, 0);
				this.idt(idx, i, j, 1, 1);
				this.idt(idx, i, j, 0, 1);
			}
		}
		for (i = 0; i < dtW; i++) {
			for (j = 0; j < dtH; j++) {
				idx = j * dtW + i;
				this.idt(idx, i, j, -1, 0);
				this.idt(idx, i, j, -1, -1);
				this.idt(idx, i, j, 0, -1);
			}
		}
	}

	//----------------------------------------------------
	isBoundaryDT(x, y, idx) {
		if (this.dtInBuffer[idx] == 0) return false;
		if (x <= 0 || this.dtInBuffer[idx - 1] == 0) return true;
		if (x >= dtWm1 || this.dtInBuffer[idx + 1] == 0) return true;
		if (y <= 0 || this.dtInBuffer[idx - dtW] == 0) return true;
		if (y >= dtHm1 || this.dtInBuffer[idx + dtW] == 0) return true;
		if (x <= 0 || y <= 0 || this.dtInBuffer[idx - dtW - 1] == 0) return true;
		if (x <= 0 || y >= dtHm1 || this.dtInBuffer[idx + dtW - 1] == 0) return true;
		if (x >= dtWm1 || y <= 0 || this.dtInBuffer[idx - dtW + 1] == 0) return true;
		if (x >= dtWm1 || y >= dtHm1 || this.dtInBuffer[idx + dtW + 1] == 0) return true;
		return false;
	}
	isJustOutsideDT(x, y, idx) {
		if (this.dtInBuffer[idx] != 0) return false;
		if (x > 0 && this.dtInBuffer[idx - 1] != 0) return true;
		if (x < dtWm1 && this.dtInBuffer[idx + 1] != 0) return true;
		if (y > 0 && this.dtInBuffer[idx - dtW] != 0) return true;
		if (y < dtHm1 && this.dtInBuffer[idx + dtW] != 0) return true;
		if (x > 0 && y > 0 && this.dtInBuffer[idx - dtW - 1] != 0) return true;
		if (x > 0 && y < dtHm1 && this.dtInBuffer[idx + dtW - 1] != 0) return true;
		if (x < dtWm1 && y > 0 && this.dtInBuffer[idx - dtW + 1] != 0) return true;
		if (x < dtWm1 && y < dtHm1 && this.dtInBuffer[idx + dtW + 1] != 0) return true;
		return false;
	}

	//----------------------------------------------------
	findLocationOfMaximumValueInDistanceTransform() {
		// Find location of max value
		let maxDtVal = 0;
		let indexOfMaxDtVal = 0;
		const nPix = dtW * dtH;
		for (let i = 0; i < nPix; i++) {
			let dtOutVal = this.dtOutBuffer[i];
			if (dtOutVal > maxDtVal) {
				maxDtVal = dtOutVal;
				indexOfMaxDtVal = i;
			}
		}
		let iomvY = ~~(indexOfMaxDtVal / dtW);
		let iomvX = indexOfMaxDtVal % dtW;
		return createVector(iomvX, iomvY, maxDtVal);
	}

	//----------------------------------------------------
	getDistanceTransformValueAtLocation (px, py) {
		let out = 0; 
		let pxi = Math.floor((px / BASE_DIM)*dtW);
		let pyi = Math.floor((py / BASE_DIM)*dtH);
		let index = pyi*dtW + pxi; 
		const nPix = dtW * dtH;
		if ((index < nPix) && (index > 0)){
			out = this.dtOutBuffer[index];
		}
		return out; 
	}

	//----------------------------------------------------
	copyDTResultToOutputGraphics() {
		// Cute macro to find max value in array.
		const maxDtVal = this.dtOutBuffer.reduce((a, b) => Math.max(a, b), -Infinity);
		const frac = 255.0 / maxDtVal;
		const nPix = dtW * dtH;
		let dtOutIndex = 0;

		this.dtOutGraphics.loadPixels();
		for (let i = 0; i < nPix; i++) {
			let dtOutVal = ~~(frac * this.dtOutBuffer[i]);
			this.dtOutGraphics.pixels[dtOutIndex++] = dtOutVal;
			this.dtOutGraphics.pixels[dtOutIndex++] = dtOutVal;
			this.dtOutGraphics.pixels[dtOutIndex++] = dtOutVal;
			this.dtOutGraphics.pixels[dtOutIndex++] = 255;
		}
		this.dtOutGraphics.updatePixels();
	}
}
