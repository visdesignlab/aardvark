// Copyright (c) 2015 - 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

export default `\
#version 300 es
#define SHADER_NAME scatterplot-layer-fragment-shader

precision highp float;

uniform bool filled;
uniform float stroked;
uniform bool antialiasing;

in vec4 vFillColor;
in vec4 vLineColor;
in vec2 unitPosition;
in vec2 range;
in float innerUnitRadius;
in float outerRadiusPixels;

out vec4 fragColor;

vec4 lerp(vec4 a, vec4 b, float t) {
  return a * (1.0 - t) + b * t;
}

float findT(float low, float high, float val) {
  return (val - low) / (high - low);
}

void main(void) {
  fragColor = vec4(0.0, 0.0, 1.0, 1.0);
  if (unitPosition.y < range[0] || unitPosition.y > range[1]) {
    discard;
    // fragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
  // set all colors to magenta
  // fragColor = vFillColor;

  float t = clamp(findT(-40.0, 0.0, unitPosition.y), 0.0, 1.0);
  // fragColor = vec4(t,t,0,1.0);
  fragColor = lerp(vec4(0.1, 0.2, 0.9, 0.1), vec4(0.8, 0.2, 0.2, 0.1), t);

  // geometry.uv = unitPosition;

  // float distToCenter = length(unitPosition) * outerRadiusPixels;
  // float inCircle = antialiasing ? 
  //   smoothedge(distToCenter, outerRadiusPixels) : 
  //   step(distToCenter, outerRadiusPixels);

  // if (inCircle == 0.0) {
  //   discard;
  // }

  // if (stroked > 0.5) {
  //   float isLine = antialiasing ? 
  //     smoothedge(innerUnitRadius * outerRadiusPixels, distToCenter) :
  //     step(innerUnitRadius * outerRadiusPixels, distToCenter);

  //   if (filled) {
  //     fragColor = mix(vFillColor, vLineColor, isLine);
  //   } else {
  //     if (isLine == 0.0) {
  //       discard;
  //     }
  //     fragColor = vec4(vLineColor.rgb, vLineColor.a * isLine);
  //   }
  // } else if (!filled) {
  //   discard;
  // } else {
  //   fragColor = vFillColor;
  // }

  // fragColor.a *= inCircle;
  // DECKGL_FILTER_COLOR(fragColor, geometry);
}
`;
