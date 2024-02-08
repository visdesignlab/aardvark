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
#define SHADER_NAME scatterplot-layer-vertex-shader

in vec3 positions;

in vec3 instancePositions;
in int instanceModOffsets;
in vec3 instancePositions64Low;

// in float instanceRadius;
// in float instanceLineWidths;
in vec4 instanceFillColors;
// in vec4 instanceLineColors;
// in vec3 instancePickingColors;

// uniform float opacity;
// uniform float radiusScale;
// uniform float radiusMinPixels;
// uniform float radiusMaxPixels;
// uniform float lineWidthScale;
// uniform float lineWidthMinPixels;
// uniform float lineWidthMaxPixels;
// uniform float stroked;
// uniform bool filled;
// uniform bool antialiasing;
// uniform int radiusUnits;
// uniform int lineWidthUnits;

uniform vec4 destination; 
uniform vec2 dataXExtent;
uniform float baseline;
uniform float binSize;

out vec4 vFillColor;
// out vec4 vLineColor;
out vec2 unitPosition;
// out float innerUnitRadius;
// out float outerRadiusPixels;
out vec2 range;


// float mod(float x, float y) {
//   return x - y * floor(x / y);
// }

float lerp(float a, float b, float t) {
  return a + (b - a) * t;
}

float norm(float value, float minValue, float maxValue) {
  return (value - minValue) / (maxValue - minValue);
}

vec3 scale_positions(vec3 position) {
  // testing
  float placeholderThreshold = 115.0;
  float placeholderSize = 0.0;
  // testing

  vec3 scaledPosition = position;
  if (scaledPosition.x > placeholderThreshold) {
    scaledPosition.x += placeholderSize;
  }
  scaledPosition.x = lerp(
    destination[1], destination[1] + destination[2],
    norm(scaledPosition.x, dataXExtent[0], dataXExtent[1])
  );

  scaledPosition.y = lerp(
    destination[0], destination[0] - destination[3],
    norm(position.y - float(instanceModOffsets) * binSize, 0.0, binSize)
  );

  // scaledPosition.x += 100.0;
  // scaledPosition.y *= 2.5;
  return scaledPosition;
}

void main(void) {
  // FUTURE UNIFORMS
  // chart destination [bottom, left, width, height]
  // vec4 destination = vec4(0.0, 0.0, 100.0, 20.0);
  // vec2 dataXExtent = vec2(1.0, 322.0); // extent for this track
  // float baseline = 0.0;
  // float binSize = 0.035;



  vec4 colors[8] = vec4[8](
    vec4(0.5, 0.5, 0.5, 1.0),   // Gray
    vec4(1.0, 0.0, 0.0, 1.0),   // Red
    vec4(0.0, 1.0, 0.0, 1.0),   // Green
    vec4(0.0, 0.0, 1.0, 1.0),   // Blue
    vec4(1.0, 1.0, 0.0, 1.0),   // Yellow
    vec4(1.0, 0.0, 1.0, 1.0),   // Magenta
    vec4(0.0, 1.0, 1.0, 1.0),   // Cyan
    vec4(0.0, 0.0, 0.0, 1.0)    // Black
  );


  // geometry.worldPosition = instancePositions;

  // Multiply out radius and clamp to limits
  // outerRadiusPixels = clamp(
  //   project_size_to_pixel(radiusScale * instanceRadius, radiusUnits),
  //   radiusMinPixels, radiusMaxPixels
  // );
  
  // Multiply out line width and clamp to limits
  // float lineWidthPixels = clamp(
  //   project_size_to_pixel(lineWidthScale * instanceLineWidths, lineWidthUnits),
  //   lineWidthMinPixels, lineWidthMaxPixels
  // );

  // outer radius needs to offset by half stroke width
  // outerRadiusPixels += stroked * lineWidthPixels / 2.0;

  // Expand geometry to accomodate edge smoothing
  // float edgePadding = antialiasing ? (outerRadiusPixels + SMOOTH_EDGE_RADIUS) / outerRadiusPixels : 1.0;

  // position on the containing square in [-1, 1] space
  unitPosition = positions.xy;
  // innerUnitRadius = 5.0;
  // outerRadiusPixels = 2.0;
  // geometry.uv = unitPosition;
  // geometry.pickingColor = instancePickingColors;

  // innerUnitRadius = 1.0 - stroked * lineWidthPixels / outerRadiusPixels;
  

  // vFillColor = vec4(0,1.0,0,1.0);

  // Apply opacity to instance color, or return instance picking color
  // vFillColor = vec4(instanceFillColors.rgb, instanceFillColors.a * opacity);
  // vec3 offset = edgePadding * positions * project_pixel_size(outerRadiusPixels);
  // DECKGL_FILTER_SIZE(offset, geometry);
  // TODO: hack and learn
  // vec3 hackedPositions = scale_positions(positions);
  // hackedPositions.y *= 0.5;
  // hackedPositions.y = mod(hackedPositions.y, 5.0);
  gl_Position = project_position_to_clipspace(
    instancePositions, instancePositions64Low,
    scale_positions(positions)
    // positions
    // scale_positions(positions, destination, dataXExtent, binSize)
    );

// vec3 scale_position(vec3 position, vec4 destination, vec2 dataXExtent, float binSize) {


  // gl_Position = project_position_to_clipspace(instancePositions, instancePositions64Low, hackedPositions);
  // DECKGL_FILTER_GL_POSITION(gl_Position, geometry);

  
  range = vec2(
    baseline + binSize * float(instanceModOffsets),
    baseline + binSize * (float(instanceModOffsets) + 1.0)
  );

  // vFillColor = instanceFillColors;
  vFillColor = colors[instanceModOffsets];
  // range = vec2(0.0, 20.0);
  // if (instancePositions.x  > 0.0) {
  //   range = vec2(-40.0, -20.0);
  // } else {
  //   range = vec2(-20.0, 0.0);
  // }

  // DECKGL_FILTER_COLOR(vFillColor, geometry);
  // vLineColor = vec4(instanceLineColors.rgb, instanceLineColors.a * opacity);
  // DECKGL_FILTER_COLOR(vLineColor, geometry);
}
`;
