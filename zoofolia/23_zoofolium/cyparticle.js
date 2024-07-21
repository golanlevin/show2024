
//==========================================================
/*

 /$$$$$$$   /$$$$$$  /$$$$$$$  /$$$$$$$$ /$$$$$$  /$$$$$$  /$$       /$$$$$$$$
| $$__  $$ /$$__  $$| $$__  $$|__  $$__/|_  $$_/ /$$__  $$| $$      | $$_____/
| $$  \ $$| $$  \ $$| $$  \ $$   | $$     | $$  | $$  \__/| $$      | $$      
| $$$$$$$/| $$$$$$$$| $$$$$$$/   | $$     | $$  | $$      | $$      | $$$$$   
| $$____/ | $$__  $$| $$__  $$   | $$     | $$  | $$      | $$      | $$__/   
| $$      | $$  | $$| $$  \ $$   | $$     | $$  | $$    $$| $$      | $$      
| $$      | $$  | $$| $$  | $$   | $$    /$$$$$$|  $$$$$$/| $$$$$$$$| $$$$$$$$
|__/      |__/  |__/|__/  |__/   |__/   |______/ \______/ |________/|________/

*/
// Pixel font generated at https://patorjk.com/software/taag/#p=display&f=Big%20Money-ne&t=RANDOM

// needs theStyleSheet, 

let Particle = function Particle() {
	this.mass = 1.0; //myRandomAB (0.75, 1.50);
	this.temperatureOverMass = 1.0 / this.mass;
	this.damping = DAMPING;
	this.MAX_SPEED = 3;
	this.MAX_SPEED2 = 9; 

	this.bIsABoundarySite = false; // Particle is on outer edge
	this.bConstrainToMask = true; 
	this.isPartOfStructure = -1; // Particle comprises part of a given structure
	this.isInsideStructure = -1; // Particle happens to be inside a given structure
	this.isFree = true; 
	this.bFixed = false;
	this.bDrawSiteBlob = false;
	this.nSpringsAttachedTo = 0; 
	this.bContributesToImplicitBlob = false;
	this.bNeverDisplayAsBlob =  (myRandomA(1.0) < 0.02); // theStyleSheet.blobDropoutPercent);
	this.bNeverDisplayAsVoronoiNucleus = (myRandomA(1.0) < 0.02); //theStyleSheet.nucleusDropoutPercent);

	this.p = createVector(0,0); // public: particle location
	this.v = createVector(0,0); // public: particle velocity
	this.c = createVector(0,0); // public: centroid of my voronoi site
	this.p0 = createVector();  // private: the original point  
	this.v0 = createVector();  // private: the original velocity
	this.pE = createVector();  // private: the Euler point: p0 + v0
	this.v1 = createVector();  // private: the velocity computed due to forces at pE
	this.pC = createVector();  // private: the Corrector point: p0 + v1
	this.pH = createVector();  // private: the Heun point: (pE + pC)/2

	//----------------------------------------------
	// Initializer for the Particle
	this.set = function (x, y, m=1.0) {
		this.p.set(x,y); 
		this.v.set(0,0); 
		this.p0.set(x, y); 
		this.pE.set(x, y); 
		this.pC.set(x, y);
		this.pH.set(x, y);
		this.v0.set(0, 0);
		this.v1.set(0, 0); 
		if (m){
			this.mass = m;
			this.temperatureOverMass = 1.0 / this.mass;
		}
	};

	//----------------------------------------------
	this.setDropoutLikelihood = function(blobDropoutPercent, nucleusDropoutPercent){
		this.bNeverDisplayAsBlob = (myRandomA(1.0) < blobDropoutPercent);
		this.bNeverDisplayAsVoronoiNucleus = (myRandomA(1.0) < nucleusDropoutPercent);
	}

	this.setTemperatureOverMass = function(temp){
		this.temperatureOverMass = temp / this.mass;
	}

	this.setIsPartOfStructure = function (bt){
		this.isPartOfStructure = bt;
	}

	this.setBConstrainToMask = function(b){
		this.bConstrainToMask = b;
	}

	this.clearForcesAndVelocities = function(){
		this.v.set(0,0);
		this.v0.set(0, 0);
		this.v1.set(0, 0); 
	}

	//----------------------------------------------
	// Accumulate accelerations into velocity
	this.addForce = function (fx, fy, whichPass) {
		const ax = fx * this.temperatureOverMass; 
		const ay = fy * this.temperatureOverMass; 

		if (whichPass == 1){
			// Accumulate accelerations experienced at p0 into v0
			this.v0.x += ax; 
			this.v0.y += ay; 
		} else { // if (whichPass == 2) {
			// Accumulate accelerations experienced at pE to v1. 
			this.v1.x += ax; 
			this.v1.y += ay; 
		}
	};
	
	//----------------------------------------------
	// Accumulate velocities into position. 
	this.update = function (whichPass) {
		if ((!this.bFixed) && (!this.bIsABoundarySite)) {
			
			if (whichPass == 1){
				// It's the end of pass 1, 
				// and we have accumulated accelerations into v0.
				// Copy v0 into v1 for pass 2:
				this.pE.x = this.p0.x + this.v0.x;
				this.pE.y = this.p0.y + this.v0.y;
				this.v1.x = this.v0.x;
				this.v1.y = this.v0.y;
			
			} else if (whichPass == 2) {
				// It's the end of pass 2,
				// and we have accumulated accelerations into v1.
				this.pC.x = this.p0.x + this.v1.x;
				this.pC.y = this.p0.y + this.v1.y;
				this.pH.x = (this.pE.x + this.pC.x)/2;
				this.pH.y = (this.pE.y + this.pC.y)/2;
				this.p.x = this.p0.x = this.pH.x; 
				this.p.y = this.p0.y = this.pH.y; 

				this.v.x = this.damping * (this.v0.x + this.v1.x)/2;
				this.v.y = this.damping * (this.v0.y + this.v1.y)/2;
				const vh2 = this.v.x*this.v.x + this.v.y*this.v.y;
				if (vh2 > this.MAX_SPEED2){ //this.v.limit(MAX_SPEED); 
					const vh = Math.sqrt(vh2);
					this.v.x = this.MAX_SPEED * this.v.x/vh;
					this.v.y = this.MAX_SPEED * this.v.y/vh;
				}
				this.v0.x = this.v.x;
				this.v0.y = this.v.y;
			}

		} else {
			// If bFixed or bIsABoundarySite
			this.p0.x = this.p.x; this.p0.y = this.p.y; 
			this.pE.x = this.p.x; this.pE.y = this.p.y; 
			this.pC.x = this.p.x; this.pC.y = this.p.y; 
			this.pH.x = this.p.x; this.pH.y = this.p.y; 
			this.v.x = this.v.y = 0; 
			this.v0.x = this.v0.y = 0; 
			this.v1.x = this.v1.y = 0; 
		}
	};



	this.updateAndConstrainToMask = function (whichPass, myPs, nMaskPts) {

		let particleWasOutsideMask = false;
		if ((!this.bFixed) && (!this.bIsABoundarySite)) {
			
			if (whichPass == 1){
				// It's the end of pass 1, 
				// and we have accumulated accelerations into v0.
				// Copy v0 into v1 for pass 2:
				this.pE.x = this.p0.x + this.v0.x;
				this.pE.y = this.p0.y + this.v0.y;
				this.v1.x = this.v0.x;
				this.v1.y = this.v0.y;
				
			} else {
				// It's the end of pass 2,
				// and we have accumulated accelerations into v1.
				this.pC.x = this.p0.x + this.v1.x;
				this.pC.y = this.p0.y + this.v1.y;
				this.pH.x = (this.pE.x + this.pC.x)/2;
				this.pH.y = (this.pE.y + this.pC.y)/2;
				this.p.x = this.p0.x = this.pH.x; 
				this.p.y = this.p0.y = this.pH.y; 

				particleWasOutsideMask = this.constrainToMask(myPs, nMaskPts);

				this.v.x = this.damping * (this.v0.x + this.v1.x)/2;
				this.v.y = this.damping * (this.v0.y + this.v1.y)/2;
				const vh2 = this.v.x*this.v.x + this.v.y*this.v.y;
				if (vh2 > this.MAX_SPEED2){ //this.v.limit(MAX_SPEED); 
					const vh = Math.sqrt(vh2);
					this.v.x = this.MAX_SPEED * this.v.x/vh;
					this.v.y = this.MAX_SPEED * this.v.y/vh;
				}
				this.v0.x = this.v.x;
				this.v0.y = this.v.y;
			}

		} else {
			// If bFixed or bIsABoundarySite
			this.p0.x = this.p.x; this.p0.y = this.p.y; 
			this.pE.x = this.p.x; this.pE.y = this.p.y; 
			this.pC.x = this.p.x; this.pC.y = this.p.y; 
			this.pH.x = this.p.x; this.pH.y = this.p.y; 
			this.v.x = this.v.y = 0; 
			this.v0.x = this.v0.y = 0; 
			this.v1.x = this.v1.y = 0; 
		}
		return particleWasOutsideMask; 
	};


	//----------------------------------------------
	this.constrainToMask = function(myPs, nMaskPts) {
		let particleWasOutside = false;
		// if (!this.bIsABoundarySite){
		if (!pointInPolygon(this.p.x, this.p.y, myPs, nMaskPts)){
			let cpop = getClosestPointOnPolygonNaive(this.p.x, this.p.y, myPs, nMaskPts);
			if (cpop != null){ 
				this.set(cpop.x, cpop.y); 
				particleWasOutside = true;
			}
		}
		// }
		return particleWasOutside; 
	}
};