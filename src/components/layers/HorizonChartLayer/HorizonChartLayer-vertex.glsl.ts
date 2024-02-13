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
uniform vec4 positiveColors[6];
uniform vec4 negativeColors[6];

uniform float placeholderThreshold;
uniform float placeholderSize;


out vec4 vFillColor;
out float yClipPosition;
out vec2 range;


float lerp(float a, float b, float t) {
  return a + (b - a) * t;
}

float norm(float value, float minValue, float maxValue) {
  return (value - minValue) / (maxValue - minValue);
}

vec3 scale_positions(vec3 position) {
  float baselineValue = -404.123456789;

  vec3 scaledPosition = position;


  bool afterPlaceholder = scaledPosition.x > placeholderThreshold;

  scaledPosition.x = lerp(
    destination[1], destination[1] + destination[2],
    norm(scaledPosition.x, dataXExtent[0], dataXExtent[1])
  );
  if (afterPlaceholder) {
    scaledPosition.x += placeholderSize;
  }
  float top = destination[0] - destination[3];
  float scaledBaselineOffset = lerp(destination[0], top, norm(baseline, 0.0, binSize));
  
  if (instanceModOffsets == -8) {
    if (scaledPosition.y == baselineValue) {
      scaledPosition.y = top;
    } else {
      scaledPosition.y = destination[0];
    }
    return scaledPosition;
  }

  if (scaledPosition.y == baselineValue) {
    scaledPosition.y = destination[0];
    return scaledPosition;
  }


  // if (scaledPosition.y == 0.0) {
  //   if (instanceModOffsets < 0) {
  //     scaledPosition.y = scaledBaselineOffset;
  //   } else {
  //     scaledPosition.y = -scaledBaselineOffset;
  //   }
  //   return scaledPosition;
  // }

  scaledPosition.y += baseline;
  scaledPosition.y = lerp(
    destination[0], top,
    norm(position.y - float(instanceModOffsets) * binSize, 0.0, binSize)
  );
  scaledPosition.y -= scaledBaselineOffset;

  return scaledPosition;
}

void main(void) {
  vec3 origin = vec3(0.0, 0.0, 0.0);

  gl_Position = project_position_to_clipspace(
    origin, origin,
    scale_positions(positions)
    );
  
  vec4 clipBottom = project_position_to_clipspace(
    origin, origin,
    vec3(0.0, destination[0], 0.0)
  );
  
  vec4 clipTop = project_position_to_clipspace(
    origin, origin,
    vec3(0.0, destination[0] - destination[3], 0.0)
  );

  range = vec2(clipBottom.y, clipTop.y);
  yClipPosition = gl_Position.y;


  if (instanceModOffsets >= 0) {
    vFillColor = positiveColors[instanceModOffsets];
  } else if (instanceModOffsets == -1) {
    vFillColor = vec4(0.9254902, 0.9254902, 0.9254902, 1.0); // grey
  } else {
    // vFillColor = vec4(1.0, 0.0, 0.0, 1.0); // red
    vFillColor = negativeColors[-1 * instanceModOffsets - 2];
  }
}
`;
