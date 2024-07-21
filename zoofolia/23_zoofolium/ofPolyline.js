

//===========================================
/*
  /$$$$$$ /$$$$$$$$/$$$$$$$  /$$$$$$ /$$  /$$     /$$/$$      /$$$$$$/$$   /$$/$$$$$$$$
 /$$__  $| $$_____| $$__  $$/$$__  $| $$ |  $$   /$$| $$     |_  $$_| $$$ | $| $$_____/
| $$  \ $| $$     | $$  \ $| $$  \ $| $$  \  $$ /$$/| $$       | $$ | $$$$| $| $$      
| $$  | $| $$$$$  | $$$$$$$| $$  | $| $$   \  $$$$/ | $$       | $$ | $$ $$ $| $$$$$   
| $$  | $| $$__/  | $$____/| $$  | $| $$    \  $$/  | $$       | $$ | $$  $$$| $$__/   
| $$  | $| $$     | $$     | $$  | $| $$     | $$   | $$       | $$ | $$\  $$| $$      
|  $$$$$$| $$     | $$     |  $$$$$$| $$$$$$$| $$   | $$$$$$$$/$$$$$| $$ \  $| $$$$$$$$
 \______/|__/     |__/      \______/|________|__/   |________|______|__/  \__|________/
                                                                                       
*/

class ofPolyline {
	// Adapted from openFrameworks ofPolyline: 
	// openFrameworks/blob/master/graphics/ofPolyline.cpp
  
	constructor() {
		this.bClosed = false;
		this.dirty = true;
		this.bHole = false;
		this.perimeter = 0;

		this.points = [];
		this.lengths = [];
	
		this.drawingDistThresh = 3.0;
		this.drawingDistThreshSq = 9.0; 
		this.maxAngleConsideredSharp = 100.0;
		this.clickToCloseRadius = 30.0;

		this.bDidResampling = false;
		this.bDidSmoothing  = false;
		this.bDidNormalCalc = false;
		this.resampledVersion = null;
		this.smoothedVersion  = null; 
	}

	//--------------------------------------------------
	clear() {
		this.dirty = true;
		this.bClosed = false;
		this.bHole = false;
		this.perimeter = 0;
	
		this.points = null; 
		this.lengths = null; 
		this.points = [];
		this.lengths = [];
		
		this.bDidResampling = false;
		this.bDidSmoothing  = false;
		this.bDidNormalCalc = false;
		this.resampledVersion = null;
		this.smoothedVersion  = null; 
	}

	//--------------------------------------------------
	setFromStyledPolyline(aStyledPolyline){
		let verts = aStyledPolyline.verts;
		let nVerts = verts.length;
		for (let i=0; i<nVerts; i++){
			this.add(verts[i].x, verts[i].y); 
		} 
		if (aStyledPolyline.bClosed){
			this.close();
		}
	}
  
	//--------------------------------------------------
	setPointsFromBlobContour (aBlob){
		let rawBlobPoints = aBlob.points;
		let nBlobPoints = rawBlobPoints.length;
		for (let i=0; i<nBlobPoints; i++){
			let ithVec = rawBlobPoints[i];
			this.add(ithVec.x, ithVec.y); 
		} 
		this.close();
	}

	//--------------------------------------------------
	add(x, y, movedThreshSq = this.drawingDistThreshSq) { 
	  	// Store the new point if it's further than thresh away from prev.
		if (!this.bClosed) {
			this.dirty = true;
			this.bDidResampling = false;
			this.bDidSmoothing  = false;
			this.bDidNormalCalc = false;

			const N = this.points.length;
			let v2 = createVector(x, y);
	
			if (N === 0) {
				// Push the first point
				this.points.push(v2);
				this.lengths.push(0);
	
			} else {
				// Points already exist
				let v1 = this.points[N - 1];
				let movedSq = ((v1.x-v2.x)*(v1.x-v2.x) + (v1.y-v2.y)*(v1.y-v2.y));
				if (movedSq > movedThreshSq) {
					this.points.push(v2);
					let cumulativeLen = this.lengths[this.lengths.length - 1];
					this.lengths.push(cumulativeLen + Math.sqrt(movedSq));
				}
			}
		}
	}

	//--------------------------------------------------
	clickToClose(x, y) { 
		let bClosingHappened = false;
		if (!this.bClosed) {
			const nPoints = this.points.length;
			if (nPoints >= 3) {
		
				// user has clicked within neighborhood of pt0
				const pt0x = this.points[0].x;
				const pt0y = this.points[0].y;
				let dx = pt0x - x; 
				let dy = pt0y - y;
				let distFromPt0 = Math.sqrt(dx*dx + dy*dy); 

				if (distFromPt0 < this.clickToCloseRadius){
					let ptLast = this.points[nPoints - 1];
					dx = ptLast.x - pt0x;
					dy = ptLast.y - pt0y;
					let distClosing = Math.sqrt(dx*dx + dy*dy);
			
					let len = this.lengths[this.lengths.length - 1];
					this.lengths.push(len + distClosing);
					this.bClosed = true;
					this.dirty = true;

					bClosingHappened = true; 
					this.bDidResampling = false;
					this.bDidSmoothing  = false;
					this.bDidNormalCalc = false;
				}
			}
		}
		return bClosingHappened;
	}
  
	//--------------------------------------------------
	close(){
		if (!this.bClosed) {
			const nPoints = this.points.length;
			if (nPoints >= 3) {
				let pt0 = this.points[0];
				let ptLast = this.points[nPoints - 1];
				let distClosing = p5.Vector.dist(pt0, ptLast);

				let len = this.lengths[this.lengths.length - 1];
				this.lengths.push(len + distClosing);
				this.bClosed = true;
				this.dirty = true;

				this.bDidResampling = false;
				this.bDidSmoothing  = false;
				this.bDidNormalCalc = false;
			}
		}
	}

	//--------------------------------------------------
	// Render the polyline as a vertex-shaded triangle strip
	displayShaderTriangleStrip (offbuf, offset) {
		
		const N = this.points.length;
		if (N > 1){
		
			if (this.bDidNormalCalc){
				let i, pi, pix, piy, normal;
				offbuf.beginShape(TRIANGLE_STRIP); 
				for (i = 0; i < N; i++) {
					pi = this.points[i];
					pix = pi.x; 
					piy = pi.y;
					normal = pi.z;
					offbuf.vertex(pix, piy, normal-PI);
					offbuf.vertex(pix, piy, normal   );
				}
				offbuf.endShape();
				
			} else {
				let normal, k;
				let pix, piy;
				let ndx, ndy; 

				let sI = 0; // start
				let eI = (this.bClosed) ? N+1 : N-1; // end
				let i = sI;
				let h = (this.bClosed) ? (i-1+N)%N : ((i == 0) ? 0 : i-1);
				let j = (this.bClosed) ? (i+1)%N : i+1;
				let ph = this.points[h];
				let pi = this.points[i];
				let pj = this.points[j];
				let dx = offset[0];
				let dy = offset[1];
				offbuf.beginShape(TRIANGLE_STRIP); 

				if (this.bClosed){
					for (k = sI; k < eI; k++) {
						j = (i+1)%N; // see below
						pj = this.points[j];

						ndx = pj.x - ph.x;
						ndy = pj.y - ph.y;
						normal = Math.atan2(ndy,ndx) + HALF_PI;

						pix = pi.x + dx; 
						piy = pi.y + dy;
						offbuf.vertex(pix, piy, normal-Math.PI);
						offbuf.vertex(pix, piy, normal   );
						this.points[i].z = normal;
						h = i; i = j; 
						ph = pi; pi = pj;
					}

				} else {
					for (k = sI; k < eI; k++) {
						j = i+1; // see above
						pj = this.points[j];

						// compute orientation of line's normal
						ndx = pj.x - ph.x;
						ndy = pj.y - ph.y;
						normal = Math.atan2(ndy,ndx) + HALF_PI;

						// encode orientation of line's normal in the z.
						pix = pi.x + dx; 
						piy = pi.y + dy;
						offbuf.vertex(pix, piy, normal-Math.PI);
						offbuf.vertex(pix, piy, normal   );
						this.points[i].z = normal;
						h = i; i = j; 
						ph = pi; pi = pj;
					}
					offbuf.vertex(pj.x + dx, pj.y + dy, normal-Math.PI);
					offbuf.vertex(pj.x + dx, pj.y + dy, normal   );
					this.points[j].z = normal;
				}
				offbuf.endShape();
				this.bDidNormalCalc = true;
			}
		}
	}
	
	//--------------------------------------------------
	getSmoothed (halfKernel){ 
		const N = this.points.length;
		if (N <= 1){
		  	return this;
		} else {
			if (this.bDidSmoothing){
				return (this.smoothedVersion); 
			} else {
				this.smoothedVersion = null; 
				this.smoothedVersion = new ofPolyline();
				
				halfKernel = Math.max(1,halfKernel); 
				const kernel = halfKernel * 2;
		
				let xavg, yavg;
				let i, j, k, j0, j1, p;
				let count, hk;
		
				if (this.bClosed == false) {
					this.smoothedVersion.add(this.points[0].x, this.points[0].y, 0.0001);
					const Nmhk = Math.max(halfKernel, N - halfKernel);
			
					for (i = 0; i < halfKernel; i++) {
						hk = Math.min(Math.max(i, 1), halfKernel)
						xavg = yavg = 0; 
						j1 = Math.min(N, i+hk);
						for (j=0; j<j1; j++){
							p = this.points[j];
							xavg += p.x; yavg += p.y;
						}
						xavg /= j1; yavg /= j1;
						this.smoothedVersion.add(xavg, yavg, 0.0001);
					}
		
					for (i = halfKernel; i < Nmhk; i++) {
						xavg = yavg = 0; 
						j0 = i-halfKernel; 
						j1 = i+halfKernel;  
						for (j=j0; j<j1; j++){
							p = this.points[j];
							xavg += p.x; yavg += p.y;
						}
						xavg /= kernel; yavg /= kernel;
						this.smoothedVersion.add(xavg, yavg, 0.0001);
					}
			
					if (Nmhk >= halfKernel){
						for (i = Nmhk; i < N; i++) {
							hk = Math.min(Math.max(N-i, 1), halfKernel)
							xavg = yavg = 0; 
							j0 = i-hk; 
							j1 = N;
							count = (j1-j0); 
							for (j=j0; j<j1; j++){
								p = this.points[j];
								xavg += p.x; yavg += p.y;
							}
							xavg /= count; yavg /= count;
							this.smoothedVersion.add(xavg, yavg, 0.0001);
						}
					}
					this.bDidSmoothing = true;
					return this.smoothedVersion;
		
				} else { // if this.bClosed == true
					for (i = 0; i < N; i++) {
						xavg = yavg = 0; 
						for (k=0; k<kernel; k++){
							p = this.points[(i+k)%N];
							xavg += p.x; 
							yavg += p.y;
						}
						xavg /= kernel;
						yavg /= kernel;
						this.smoothedVersion.add(xavg, yavg, 0.0001);
					}
			
					let sp0 = this.smoothedVersion.points[0];
					this.smoothedVersion.clickToClose(sp0.x, sp0.y);
					this.bDidSmoothing = true;
					return this.smoothedVersion;
				}
		  	}
		}
	}

  
	//--------------------------------------------------
	getPerimeter() {
		if (this.dirty) {
			const N = this.points.length;
			let out = 0;
			if (N >= 2) {
				let v1, v2;
				let dx, dy;
				v1 = this.points[0];
				for (let i = 1; i < N; i++) {
					v2 = this.points[i];
					dx = v1.x - v2.x;
					dy = v1.y - v2.y;
					out += Math.sqrt(dx*dx + dy*dy);
					v1 = v2;
				}
				if (this.bClosed) {
					v1 = this.points[N - 1];
					v2 = this.points[0];
					dx = v1.x - v2.x;
					dy = v1.y - v2.y;
					out += Math.sqrt(dx*dx + dy*dy);
				}
			} else {
				out = 0; 
			}
			this.perimeter = out;
			this.dirty = false;
			return this.perimeter;
		}
		return this.perimeter;
	}
  
	//----------------------------------------------------------
	getResampledBySpacingFast (spacing) {
		if (this.bDidResampling == true){
		  	return (this.resampledVersion);
		} else {
			this.resampledVersion = null; 
			this.resampledVersion = new ofPolyline();
		
			const nPoints = this.points.length;
			const nPointsm1 = nPoints - 1; 
			if ((nPoints <= 1) || (spacing <= 0.001)) {
				return this;
			}
		
			const eps = (spacing*0.1);
			let perim = this.getPerimeter();
			let totalLength = perim - eps;
		
			let f, i, i1, i2; 
			let t, tt, v1, v2;
			let lengthLo, lengthHi;
			let indexAtLengthF, lastLength;
		
			let indexLo = 0; 
			let indexHi = 1;
			let lerpx, lerpy; 
			for (f = 0; f < totalLength; f += spacing) {
				indexAtLengthF = 0; 
				lastLength = this.lengths.length - 1;
				for (i = indexLo; i < lastLength; i++) {
					indexHi = indexLo + 1;
					lengthLo = this.lengths[indexLo];
					lengthHi = this.lengths[indexHi];
					if ((f >= lengthLo) && (f < lengthHi)) {
						t = (f - lengthLo)/(lengthHi - lengthLo); 
						indexAtLengthF = indexLo + t; 
						break;
					} else {
						indexLo = indexHi;
					}
				}
		
				i1 = ~~(indexAtLengthF);
				i2 = (this.bClosed) ? ~~((i1+1)%nPoints) : Math.min(i1+1, nPointsm1);
				v1 = this.points[i1];
				v2 = this.points[i2];
				tt = indexAtLengthF - i1;
				lerpx = v2.x*tt + v1.x*(1-tt);
				lerpy = v2.y*tt + v1.y*(1-tt);
				this.resampledVersion.add(lerpx, lerpy);
			}
	
			// Correction to handle numeric precision error on last point:
			if (!this.bClosed){
				const lastIndex = (this.bClosed) ? 0 : nPointsm1;
				const lastP = this.points[lastIndex];
				const lastQ = this.resampledVersion.points[this.resampledVersion.points.length - 1];
				const pqDist = lastQ.dist(lastP);
				if (pqDist > eps) { this.resampledVersion.add(lastP.x, lastP.y);}
			} else if (this.bClosed){
				let rp0 = this.resampledVersion.points[0];
				this.resampledVersion.clickToClose(rp0.x, rp0.y);
			}
			this.bDidResampling = true;
			return (this.resampledVersion);
		}
	}

  
	//----------------------------------------------------------
	getResampledByCount(count) {
		let perim = this.getPerimeter();
		count = Math.max(count, 2);
		let spacing = perim / (count);
		return this.getResampledBySpacingFast(spacing);
	}
}
  

