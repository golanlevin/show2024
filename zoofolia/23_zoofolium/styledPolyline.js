

class StyledPolyline {

	constructor(verts, bClosed, bSmooth, bTapered, bIsDot, sStyle, fStyle, thickness, maxDashGap, maxDashLen, bVShade = false) {
		this.verts = verts; // an array of PVectors
		this.bClosed = bClosed; // is this a closed loop
		this.bSmooth = bSmooth; // render with beziers or not
		this.bTapered = bTapered; // if this is an unclosed line, does it taper
		this.bVertexShade = bVShade;
		this.bIsDot = bIsDot; // is this a single point (small ellipse)

		this.strokeStyle = sStyle;
		this.fillStyle = fStyle;

		this.thickness = thickness; // line weight
		this.dashGap = maxDashGap; // length of dash gaps (number of points to skip); 0 = no dashing
		this.dashLen = maxDashLen; // length of dashes (number of points per dash polyline)
	}
}
