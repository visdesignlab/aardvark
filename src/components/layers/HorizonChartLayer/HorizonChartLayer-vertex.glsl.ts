// Modified (significantly) from the ScatterPlotLayer included in deck.gl.
// the following is the orginal license for the ScatterPlotLayer:
//
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
#define SHADER_NAME HorizonChartLayer-vertex-shader

// the instance geometry (the repeated area plot vertices)
in vec3 positions;
// the mod offset for the individual instance
in int instanceModOffsets;

uniform vec4 destination; 
uniform vec2 dataXExtent;
uniform float baseline;
uniform float binSize;
uniform vec4 positiveColors[8];

uniform float placeholderThreshold;
uniform float placeholderSize;


out vec4 vFillColor;
out vec2 dataPositions;
out vec2 range;


float lerp(float a, float b, float t) {
  return a + (b - a) * t;
}

float norm(float value, float minValue, float maxValue) {
  return (value - minValue) / (maxValue - minValue);
}

vec3 scale_positions(vec3 position) {
  vec3 scaledPosition = position;


  bool afterPlaceholder = scaledPosition.x > placeholderThreshold;

  scaledPosition.x = lerp(
    destination[1], destination[1] + destination[2],
    norm(scaledPosition.x, dataXExtent[0], dataXExtent[1])
  );
  if (afterPlaceholder) {
    scaledPosition.x += placeholderSize;
  }

  scaledPosition.y += baseline;
  float height = destination[0] - destination[3];
  scaledPosition.y = lerp(
    destination[0], height,
    norm(position.y - float(instanceModOffsets) * binSize, 0.0, binSize)
  );
  float scaledBaselineOffset = lerp(destination[0], height, norm(baseline, 0.0, binSize));
  scaledPosition.y -= scaledBaselineOffset;

  return scaledPosition;
}

void main(void) {
  vec3 origin = vec3(0.0, 0.0, 0.0);
  
  dataPositions = positions.xy;

  gl_Position = project_position_to_clipspace(
    origin, origin,
    scale_positions(positions)
    );
  
  range = vec2(
    baseline + binSize * float(instanceModOffsets),
    baseline + binSize * (float(instanceModOffsets) + 1.0)
  );

  vFillColor = positiveColors[instanceModOffsets];
}
`;
