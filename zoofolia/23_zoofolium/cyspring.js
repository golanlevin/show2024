
//==========================================================
/*

  /$$$$$$  /$$$$$$$  /$$$$$$$  /$$$$$$ /$$   /$$  /$$$$$$ 
 /$$__  $$| $$__  $$| $$__  $$|_  $$_/| $$$ | $$ /$$__  $$
| $$  \__/| $$  \ $$| $$  \ $$  | $$  | $$$$| $$| $$  \__/
|  $$$$$$ | $$$$$$$/| $$$$$$$/  | $$  | $$ $$ $$| $$ /$$$$
 \____  $$| $$____/ | $$__  $$  | $$  | $$  $$$$| $$|_  $$
 /$$  \ $$| $$      | $$  \ $$  | $$  | $$\  $$$| $$  \ $$
|  $$$$$$/| $$      | $$  | $$ /$$$$$$| $$ \  $$|  $$$$$$/
 \______/ |__/      |__/  |__/|______/|__/  \__/ \______/ 
                                                         
*/

let Spring = function Spring (tpa) {
	let ip; // index of particle P in theParticleArray[] 
	let iq; // index of particle Q in theParticleArray[] 
	let baseLength; // the rest length
	let restLength;
	let distention;
	let springConstant;
	let theParticleArray = tpa;
	let minSpringDist = 0.05;

	this.getP = function () {
		return theParticleArray[ip];
	};
	this.getQ = function () {
		return theParticleArray[iq];
	};
	
	this.getIP = function () {
		return ip;
	};
	this.getIQ = function () {
		return iq;
	};
	this.setIP = function (iip){
		ip = iip;
	};
	this.setIQ = function (iiq){
		iq = iiq;
	};

	this.getRestLength = function () {
	 	return restLength;
	};
	this.getBaseLength = function () {
	 	return baseLength;
	};
	this.setRestLength = function(L){
		restLength = L; 
	}
	this.setBaseLength = function(L){
		baseLength = L;
	}
	this.setSpringConstant = function(k) {
	 	springConstant = k;
	}
	this.getDistention = function (){
		return distention; 
	}
	this.setMinSpringDist = function(msd){
		minSpringDist = msd;
	}
  
	//----------------------------------------------
	this.setParticleIndicesAndRestLength = function (ip1, ip2, r, k) {
		ip = ip1;
		iq = ip2;
		restLength = r;
		baseLength = restLength;
		springConstant = k;
	};
  
	//----------------------------------------------
	this.setAndComputeRestLength = function (ip1, ip2, k) {
		ip = ip1;
		iq = ip2;
		let P = theParticleArray[ip];
		let Q = theParticleArray[iq];
		restLength = P.p0.dist(Q.p0);
		baseLength = restLength;
		springConstant = k;
	};

	//----------------------------------------------
	this.updatePass1 = function(){
		const P = theParticleArray[ip];
		const Q = theParticleArray[iq];
		const dx = P.p0.x - Q.p0.x;   
		const dy = P.p0.y - Q.p0.y;
		const dh = Math.sqrt(dx*dx + dy*dy);
		if (dh > minSpringDist){ 
			distention = dh - restLength;
			const restorativeForce = springConstant * (distention/dh); 
			const fx = dx * restorativeForce;
			const fy = dy * restorativeForce;
			P.addForce(-fx, -fy, 1);
			Q.addForce( fx,  fy, 1);
		}
	}
	this.updatePass2 = function(){
		const P = theParticleArray[ip];
		const Q = theParticleArray[iq];
		const dx = P.pE.x - Q.pE.x; 
		const dy = P.pE.y - Q.pE.y;
		const dh = Math.sqrt(dx*dx + dy*dy);
		if (dh > minSpringDist){ 
			distention = dh - restLength;
			const restorativeForce = springConstant * (distention/dh); 
			const fx = dx * restorativeForce;
			const fy = dy * restorativeForce;
			P.addForce(-fx, -fy, 2);
			Q.addForce( fx,  fy, 2);
		} 
	}
	
	this.update = function (whichPass) {
		let P = theParticleArray[ip];
		let Q = theParticleArray[iq];
		let dx = 0; 
		let dy = 0; 
		let dh = 0; 
		
		if (whichPass == 1){
			dx = P.p0.x - Q.p0.x;   
			dy = P.p0.y - Q.p0.y;
			dh = Math.sqrt(dx*dx + dy*dy);
		} else {
			dx = P.pE.x - Q.pE.x; 
			dy = P.pE.y - Q.pE.y;
			dh = Math.sqrt(dx*dx + dy*dy);
		}
		if (dh > minSpringDist){ 
			distention = dh - restLength;
			const restorativeForce = springConstant * (distention/dh); 
			const fx = dx * restorativeForce;
			const fy = dy * restorativeForce;
			P.addForce(-fx, -fy, whichPass);
			Q.addForce( fx,  fy, whichPass);
		}
	};
};