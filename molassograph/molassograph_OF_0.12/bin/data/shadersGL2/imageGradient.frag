OF_GLSL_SHADER_HEADER

uniform sampler2D tex0;

uniform float blurAmnt;
uniform float texwidth;

varying vec2 texCoordVarying;



void main()
{
	vec4 color = vec4(0.0, 0.0, 0.0, 0.0);

    /*
	color += 0.000229 * texture2D(tex0, texCoordVarying + vec2(blurAmnt * -4.0/texwidth, 0.0));
	color += 0.005977 * texture2D(tex0, texCoordVarying + vec2(blurAmnt * -3.0/texwidth, 0.0));
	color += 0.060598 * texture2D(tex0, texCoordVarying + vec2(blurAmnt * -2.0/texwidth, 0.0));
	color += 0.241732 * texture2D(tex0, texCoordVarying + vec2(blurAmnt * -1.0/texwidth, 0.0));

	color += 0.382928 * texture2D(tex0, texCoordVarying + vec2(0.0, 0));

	color += 0.241732 * texture2D(tex0, texCoordVarying + vec2(blurAmnt * 1.0/texwidth, 0.0));
	color += 0.060598 * texture2D(tex0, texCoordVarying + vec2(blurAmnt * 2.0/texwidth, 0.0));
	color += 0.005977 * texture2D(tex0, texCoordVarying + vec2(blurAmnt * 3.0/texwidth, 0.0));
	color += 0.000229 * texture2D(tex0, texCoordVarying + vec2(blurAmnt * 4.0/texwidth, 0.0));
    */
    
    
    /*
    // Works -- 3x3 sobel
    float dx = blurAmnt * 1.0/texwidth;
    float dy = dx;
    
    float p00 = (texture2D(tex0, texCoordVarying + vec2( -dx, -dy))).r;
    float p01 = (texture2D(tex0, texCoordVarying + vec2( 0.0, -dy))).r;
    float p02 = (texture2D(tex0, texCoordVarying + vec2(  dx, -dy))).r;
    
    float p10 = (texture2D(tex0, texCoordVarying + vec2( -dx, 0.0))).r;
    float p11 = (texture2D(tex0, texCoordVarying + vec2( 0.0, 0.0))).r;
    float p12 = (texture2D(tex0, texCoordVarying + vec2(  dx, 0.0))).r;
    
    float p20 = (texture2D(tex0, texCoordVarying + vec2( -dx,  dy))).r;
    float p21 = (texture2D(tex0, texCoordVarying + vec2( 0.0,  dy))).r;
    float p22 = (texture2D(tex0, texCoordVarying + vec2(  dx,  dy))).r;
    
    color.r = 0.5 + ((p02-p00) + 2.0*(p12-p10) + (p22-p20));
    color.g = 0.5 - ((p00-p20) + 2.0*(p01-p21) + (p02-p22));
    color.b = 0.0; //p11;
    color.a = 1.0;
    */
    
    
    
    float dx1 = blurAmnt * 1.0/texwidth;
    float dy1 = dx1;
    float dx2 = blurAmnt * 2.0/texwidth;
    float dy2 = dx2;
    
    float p00 = (texture2D(tex0, texCoordVarying + vec2( -dx2, -dy2))).r;
    float p01 = (texture2D(tex0, texCoordVarying + vec2( -dx1, -dy2))).r;
    float p02 = (texture2D(tex0, texCoordVarying + vec2(  0.0, -dy2))).r;
    float p03 = (texture2D(tex0, texCoordVarying + vec2(  dx1, -dy2))).r;
    float p04 = (texture2D(tex0, texCoordVarying + vec2(  dx2, -dy2))).r;
    
    float p10 = (texture2D(tex0, texCoordVarying + vec2( -dx2, -dy1))).r;
    float p11 = (texture2D(tex0, texCoordVarying + vec2( -dx1, -dy1))).r;
    float p12 = (texture2D(tex0, texCoordVarying + vec2(  0.0, -dy1))).r;
    float p13 = (texture2D(tex0, texCoordVarying + vec2(  dx1, -dy1))).r;
    float p14 = (texture2D(tex0, texCoordVarying + vec2(  dx2, -dy1))).r;
    
    float p20 = (texture2D(tex0, texCoordVarying + vec2( -dx2,  0.0))).r;
    float p21 = (texture2D(tex0, texCoordVarying + vec2( -dx1,  0.0))).r;
    float p22 = (texture2D(tex0, texCoordVarying + vec2(  0.0,  0.0))).r;
    float p23 = (texture2D(tex0, texCoordVarying + vec2(  dx1,  0.0))).r;
    float p24 = (texture2D(tex0, texCoordVarying + vec2(  dx2,  0.0))).r;
    
    float p30 = (texture2D(tex0, texCoordVarying + vec2( -dx2,  dy1))).r;
    float p31 = (texture2D(tex0, texCoordVarying + vec2( -dx1,  dy1))).r;
    float p32 = (texture2D(tex0, texCoordVarying + vec2(  0.0,  dy1))).r;
    float p33 = (texture2D(tex0, texCoordVarying + vec2(  dx1,  dy1))).r;
    float p34 = (texture2D(tex0, texCoordVarying + vec2(  dx2,  dy1))).r;
    
    float p40 = (texture2D(tex0, texCoordVarying + vec2( -dx2,  dy2))).r;
    float p41 = (texture2D(tex0, texCoordVarying + vec2( -dx1,  dy2))).r;
    float p42 = (texture2D(tex0, texCoordVarying + vec2(  0.0,  dy2))).r;
    float p43 = (texture2D(tex0, texCoordVarying + vec2(  dx1,  dy2))).r;
    float p44 = (texture2D(tex0, texCoordVarying + vec2(  dx2,  dy2))).r;
    
    float gx =        (p00-p04) + 2.0*(p01-p03)
                + 4.0*(p10-p14) + 8.0*(p11-p13)
                + 6.0*(p20-p24) +12.0*(p21-p23)
                + 4.0*(p30-p34) + 8.0*(p31-p33)
                +     (p40-p44) + 2.0*(p41-p43);
    
    float gy =        (p00-p40) + 2.0*(p10-p30)
                + 4.0*(p01-p41) + 8.0*(p11-p31)
                + 6.0*(p02-p42) +12.0*(p12-p32)
                + 4.0*(p03-p43) + 8.0*(p13-p33)
                +     (p04-p44) + 2.0*(p14-p34);
    
    float gm =    1.0*p00 + 4.0*p10 + 6.0*p20 + 4.0*p30 + 1.0*p40
                + 4.0*p01 +16.0*p11 +24.0*p21 +16.0*p31 + 4.0*p41
                + 6.0*p02 +24.0*p12 +36.0*p22 +24.0*p32 + 6.0*p42
                + 4.0*p03 +16.0*p13 +24.0*p23 +16.0*p33 + 4.0*p43
                + 1.0*p04 + 4.0*p14 + 6.0*p24 + 4.0*p34 + 1.0*p44;
    gm /= 256.0;
    gx = 0.5 - gx/16.0;
    gy = 0.5 - gy/16.0;

    color.r = gx;
    color.g = gy;
    color.b = gm;
    color.a = 1.0;
    
    
    gl_FragColor = color;
}


