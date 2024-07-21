
//---------------------
// outside of cyto class
function polygonPerimeter (pvectorArray){
	let perimeter = 0;  
	const numPoints = pvectorArray.length;
	let j = numPoints-1;
	for (let i=0; i<numPoints; i++){ 
		const ip = pvectorArray[i];
		const jp = pvectorArray[j];
		perimeter += dist(ip.x, ip.y, jp.x, jp.y);
		j = i;
	}   
	return perimeter;
}


//-------------------------------------
// outside of cyto class
function getCentroidOfConvexPolygonAreaFast(verts) {
	// Calculation of centroid of AREA
	// Assumes verts is an array of 2D arrays

	const nTriangles = verts.length - 2;
	const v0x = verts[0][0];
	const v0y = verts[0][1];
	let cx = 0;
	let cy = 0;
	let parea = 0;
	
	for (let t = 0; t < nTriangles; t++) {
		const va = verts[t + 1];
		const vb = verts[t + 2];

		const ux = va[0] - v0x;
		const uy = va[1] - v0y;
		const vx = vb[0] - v0x;
		const vy = vb[1] - v0y;
		const tarea = (ux * vy - uy * vx);
		parea += tarea;
		
		cx += tarea * (v0x + va[0] + vb[0]);
		cy += tarea * (v0y + va[1] + vb[1]);
	}
	parea *= 3;
	cx /= parea;
	cy /= parea;
	return [cx, cy];
}

//---------------------
// outside of cyto class
function pointInPolygon(x, y, vs, nVerts) {
	// Vector-based point-in-polygon test.
	// vs is an array of Particle objects
	let inside = false;
	for (let i = 0, j = nVerts - 1; i < nVerts; j = i++) {
		let xi = vs[i].p.x;
		let yi = vs[i].p.y;
		let xj = vs[j].p.x;
		let yj = vs[j].p.y;
		let intersect =
			yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
		if (intersect) {
			inside = !inside;
		}
	}
	return inside;
}

//------------------------------
// outside of cyto class
function getVertexPointArr(verts, index, side, tightness) {
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

//---------------------
// outside of cyto class
function pointInsideVerts (x, y, verts, nVerts) {
	// Vector-based point-in-polygon test.
	let inside = false;
	for (let i = 0, j = nVerts - 1; i < nVerts; j = i++) {
		const xi = verts[i].x;
		const yi = verts[i].y;
		const xj = verts[j].x;
		const yj = verts[j].y;
		const intersect = yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
		if (intersect) { inside = !inside; }
	}
	return inside;
}

//---------------------
// outside of cyto class
function polygonArea (pvectorArray){ 
	let area = 0;  
	const numPoints = pvectorArray.length;
	let j = numPoints-1;
	for (let i=0; i<numPoints; i++){ 
		let ip = pvectorArray[i];
		let jp = pvectorArray[j];
		area += (jp.x+ip.x) * (jp.y-ip.y); 
		j = i;
	}   
	return area/2.0; 
}

function polygonMaximumDiameter (pvectorArray){
	let maxDist = 0; 
	const numPoints = pvectorArray.length;
	for (let i=0; i<numPoints; i++){ 
		for (let j=0; j<i; j++){
			let ip = pvectorArray[i];
			let jp = pvectorArray[j];
			let dh = dist(ip.x,ip.y, jp.x,jp.y); 
			if (dh > maxDist) {
				maxDist = dh; 
			}
		}
	}   
	return maxDist; 
}

function polygonCentroid (pvectorArray){ 
	let cx = 0; 
	let cy = 0; 
	const numPoints = pvectorArray.length;
	if (numPoints > 0){
		for (let i=0; i<numPoints; i++){ 
			let ip = pvectorArray[i];
			cx += ip.x;
			cy += ip.y;
		}
		cx /= numPoints; 
		cy /= numPoints; 
	}
	return [cx,cy];
}

function getElongation (pvectorArray){
	// Elongation
	let centroid = polygonCentroid (pvectorArray); 
	let COM = createVector(centroid[0],centroid[1]); 
	let eigens = getOrientation(pvectorArray, COM); 
	let orientation = eigens[0]; 
	let elongation = getEllipticity (pvectorArray, COM, orientation);
	return elongation; 
}


//---------------------------------
// https://github.com/golanlevin/measurerOfSoles/
function getOrientation (pts, COM) {
	let orientation  = 0.0; 
	let orientedness = 0.0;
	let nPoints = pts.length;
	if (nPoints > 2) {
		let XXsum = 0; 
		let YYsum = 0; 
		let XYsum = 0; 

		for (let j=0; j<nPoints; j++) {
			let pt = pts[j];
			let dX = pt.x - COM.x;
			let dY = pt.y - COM.y;
			XXsum += dX * dX;
			YYsum += dY * dY;
			XYsum += dX * dY;
		}

		// here's the tensor matrix. 
		let matrix2x2_00 =  YYsum;
		let matrix2x2_01 = -XYsum;
		let matrix2x2_10 = -XYsum;
		let matrix2x2_11 =  XXsum;
		let response = calcEigenvector ( matrix2x2_00, matrix2x2_01, matrix2x2_10, matrix2x2_11);
		orientation  = response[0];
		orientedness = response[1];
	}
	return [orientation, orientedness];
}

//---------------------------------
function calcEigenvector (  matrix2x2_00, matrix2x2_01, matrix2x2_10, matrix2x2_11 ) {
	let A = matrix2x2_00; 
	let B = matrix2x2_01;
	let C = matrix2x2_10;
	let D = matrix2x2_11;
	let multiPartData = [0,0]; 
  
	let root1 = 0; 
	let root2 = 0; 
	let a = 1.0;
	let b = (0.0 - A) - D;
	let c = (A * D) - (B * C);
	let Q = (b * b) - (4.0 * a * c);
	if (Q >= 0) {
		root1 = ((0.0 - b) + Math.sqrt(Q)) / (2.0 * a);
		root2 = ((0.0 - b) - Math.sqrt(Q)) / (2.0 * a);
		let factor2 = ( Math.min (root1, root2) - A) / B;
		let magnitude2 = Math.sqrt (1.0 + factor2*factor2);
		if ((magnitude2 == 0) || (isNaN(magnitude2))) {
			multiPartData[0] = 0;
			multiPartData[1] = 0;
		} else {
			let orientedBoxOrientation = Math.atan2 ( (1.0 / magnitude2), (factor2 / magnitude2));
			let orientedBoxEigenvalue  = Math.log (1.0+root2); // orientedness
			multiPartData[0] = orientedBoxOrientation;
			multiPartData[1] = orientedBoxEigenvalue;
		}
	} 
	return multiPartData;
}

//---------------------------------
function getEllipticity (pts, COM, ori) {
	let nPoints = pts.length;
	let minx = 99999;
	let maxx = -99999;
	let miny = 99999;
	let maxy = -99999;
	for (let i=0; i<nPoints; i++) {
		let pt = pts[i];
		let ptx = pt.x - COM.x;
		let pty = pt.y - COM.y;
		let newX = (ptx * Math.cos(ori)) - (pty * Math.sin(ori));
		let newY = (ptx * Math.sin(ori)) + (pty * Math.cos(ori));
		ptx = newX + COM.x;
		pty = newY + COM.y;
		if (ptx < minx){ minx = ptx;}
		if (ptx > maxx){ maxx = ptx;}
		if (pty < miny){ miny = pty;}
		if (pty > maxy){ maxy = pty;}
	}
	let sw = maxx-minx;
	let sh = maxy-miny;
	let ellipticity = sh/sw;
	if (ellipticity < 1.0){
		ellipticity = sw/sh;
	}
	return ellipticity;
}

//---------------------
function getClosestPointOnPolygonNaive(px, py, poly, nPolyPoints) {
	// Returns the closest point on the closest segment connected to the poly vertex closest to (px,py).
	// This is not actually the "correct" method, but most of the time it's good enough. Otherwise, see:
	// https://codesandbox.io/s/elated-liskov-3v65c?file=/src/getClosestPointInsidePolygon.ts
	// const nPolyPoints = poly.length;

	let closestVertexId = -1;
	let closestVertexDistSquared = Number.POSITIVE_INFINITY;
	let cx = 0;
	let cy = 0;
	for (let j = 0; j < nPolyPoints; j++) {
		const jx = poly[j].p.x;
		const jy = poly[j].p.y;
		cx += jx;
		cy += jy;
		const djxpx = jx-px;
		const djypy = jy-py;
		const jh2 = (djxpx*djxpx + djypy*djypy);
		if (jh2 < closestVertexDistSquared) {
			closestVertexDistSquared = jh2;
			closestVertexId = j;
		}
	}

	cx /= nPolyPoints;
	cy /= nPolyPoints;
	let j = closestVertexId;
	if (poly[j] == undefined){
		return null; 
	}
	let jx = poly[j].p.x;
	let jy = poly[j].p.y;
	if (closestVertexDistSquared < Number.EPSILON) {
		jx = jx + (cx - jx) * this.rand20K[nPolyPoints  ]; // map(nPolyPoints % 13, 0,12, 0.1,0.9); // not using rand  
		jy = jy + (cy - jy) * this.rand20K[nPolyPoints+j]; // map(nPolyPoints % 11, 0,10, 0.1,0.9); // if we can help it
		return createVector(jx, jy, closestVertexId);
	}

	// http://paulbourke.net/geometry/pointlineplane/
	const i = (closestVertexId + nPolyPoints - 1) % nPolyPoints;
	const k = (closestVertexId + nPolyPoints + 1) % nPolyPoints;
	const ix = poly[i].p.x;
	const iy = poly[i].p.y;
	const kx = poly[k].p.x;
	const ky = poly[k].p.y;

	const dijx = ix - jx;
	const dijy = iy - jy;
	const dkjx = kx - jx;
	const dkjy = ky - jy;
	const dikx = ix - kx; 
	const diky = iy - ky; 
	
	const ui = ((px - jx) * dijx + (py - jy) * dijy) / (dijx * dijx + dijy * dijy);
	const uk = ((px - jx) * dkjx + (py - jy) * dkjy) / (dkjx * dkjx + dkjy * dkjy);
	const inij = (ui > 0 && ui < 1);
	const inkj = (uk > 0 && uk < 1);
	
	if (inij && inkj){
		let xi = jx + ui * (ix - jx);
		let yi = jy + ui * (iy - jy);
		let dxipx = xi-px; 
		let dyipy = yi-py; 
		let hi = /*Math.sqrt*/(dxipx*dxipx + dyipy*dyipy);
		
		let xk = jx + uk * (kx - jx);
		let yk = jy + uk * (ky - jy);
		let dxkpx = xk-px; 
		let dykpy = yk-py;
		let hk = /*Math.sqrt*/(dxkpx*dxkpx + dykpy*dykpy);
		
		if (hi < hk){
			return createVector(xi, yi, closestVertexId);
		} else {
			return createVector(xk, yk, closestVertexId);
		}
	
	} else if (inij){
		let dikh = Math.sqrt(dikx * dikx + diky * diky); 
		let xi = jx + ui * (ix - jx);
		let yi = jy + ui * (iy - jy);
		xi += (diky/dikh)/1024; // move towards perp; a hack
		yi -= (dikx/dikh)/1024;
		return createVector(xi, yi, closestVertexId);
	
	} else if (inkj){
		let dikh = Math.sqrt(dikx * dikx + diky * diky); 
		let xk = jx + uk * (kx - jx);
		let yk = jy + uk * (ky - jy);
		xk += (diky/dikh)/1024; // move towards perp; a hack
		yk -= (dikx/dikh)/1024;
		return createVector(xk, yk, closestVertexId);
	
	} else {
		jx = jx + (cx - jx) * 0.09375;
		jy = jy + (cy - jy) * 0.09375;
		return createVector(jx, jy, closestVertexId);
	}
}