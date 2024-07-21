
//==========================================================================
// https://docs.artblocks.io/creator-docs/creator-onboarding/readme/
// https://github.com/liamegan/fxhash-helpers/blob/main/src/index.js 
/*

 /$$$$$$$   /$$$$$$  /$$   /$$ /$$$$$$$   /$$$$$$  /$$      /$$
| $$__  $$ /$$__  $$| $$$ | $$| $$__  $$ /$$__  $$| $$$    /$$$
| $$  \ $$| $$  \ $$| $$$$| $$| $$  \ $$| $$  \ $$| $$$$  /$$$$
| $$$$$$$/| $$$$$$$$| $$ $$ $$| $$  | $$| $$  | $$| $$ $$/$$ $$
| $$__  $$| $$__  $$| $$  $$$$| $$  | $$| $$  | $$| $$  $$$| $$
| $$  \ $$| $$  | $$| $$\  $$$| $$  | $$| $$  | $$| $$\  $ | $$
| $$  | $$| $$  | $$| $$ \  $$| $$$$$$$/|  $$$$$$/| $$ \/  | $$
|__/  |__/|__/  |__/|__/  \__/|_______/  \______/ |__/     |__/
                                                               
*/

//----------------------------------------------------------------------------------------
function getSkewedGaussian (minval, maxval, skew, bias) {
	let range = maxval - minval;
	let mid = minval + range / 2.0;
	let unitGaussian = myRandomGaussian(0.0, 1.0);
	let biasFactor = Math.exp(bias);
	let retval = mid + range * (biasFactor / (biasFactor + Math.exp(-unitGaussian / skew)) - 0.5);
	return retval;
}

function myRandom01() {
	let r = fxrand();
	r = ~~(r * 32768) / 32768; // truncate float precision
	return r;
}
function myRandomA(a){
	return (a * myRandom01());
}
function myRandomAB(a, b) {
	return a + ((b - a) * myRandom01());
}
function myRandomInt(a, b) { 
	// random integer between a (inclusive) and b (inclusive)
	return Math.floor(myRandomAB(a, b + 1));
}
function getPseudoRandomFxhash(){
	return "oo" + Array(49).fill(0).map(_=>alphabet[(myRandom01()*alphabet.length)|0]).join('');
}
function getRandomFxhash(){
	return "oo" + Array(49).fill(0).map(_=>alphabet[(Math.random()*alphabet.length)|0]).join('');
}
function myRandomReset(newhash) {
	// If a new hash is supplied, use that, otherwise restore to the primaryFxhash
	fxhash = newhash ? newhash : THE_PRIMARY_HASH; 
	fxhashTrunc = fxhash.slice(2);
	regex = new RegExp(".{" + ((fxhashTrunc.length / 4) | 0) + "}", "g");
	hashes = fxhashTrunc.match(regex).map((h) => b58dec(h));
	fxrand = sfc32(...hashes);
	_gaussian_previous = false;
	_y2 = 0; 
}

let _gaussian_previous = false;
let _y2 = 0; 
function myRandomGaussian (mean, sd = 1) {
	let y1, x1, x2, w;
	if (_gaussian_previous) {
		y1 = _y2;
		_gaussian_previous = false;
	} else {
		do {
			x1 = myRandomA(2) - 1;
			x2 = myRandomA(2) - 1;
			w = x1*x1 + x2*x2;
		} while (w >= 1);
		w = Math.sqrt(-2 * Math.log(w) / w);
		y1 = x1 * w;
		_y2 = x2 * w;
		_gaussian_previous = true;
	}
	const m = mean || 0;
	return y1 * sd + m;
}

const randPick = (arr) => arr[(myRandom01() * arr.length) | 0];
const getWeightedOption = function (options) {
	let choices = [];
	for (let i in options) {
		choices = choices.concat(new Array(options[i][1]).fill(options[i][0]));
	}
	return randPick(choices);
};

