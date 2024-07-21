#version 150
uniform sampler2DRect tex0;
uniform float blurSize;

out vec4 outputColor;

void main() {
    vec2 st = gl_FragCoord.st;
    vec4 sum = vec4(0.0);
    int radius = int(blurSize);

    // Simple box blur
    for (int x = -radius; x <= radius; x++) {
        for (int y = -radius; y <= radius; y++) {
            sum += texture(tex0, st + vec2(x, y));
        }
    }

    float count = float((radius * 2 + 1) * (radius * 2 + 1));
    outputColor = sum / count;
}