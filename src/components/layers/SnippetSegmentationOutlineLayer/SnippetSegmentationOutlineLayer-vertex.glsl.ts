// Modified from the PathLayer included in deck.gl.
// the following is the orginal license for the PathLayer:
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
#define SHADER_NAME SnippetSegmentationOutlineLayer-vertex-shader

attribute vec2 positions;

attribute float instanceTypes;
attribute vec3 instanceStartPositions;
attribute vec3 instanceEndPositions;
attribute vec3 instanceLeftPositions;
attribute vec3 instanceRightPositions;
attribute vec3 instanceLeftPositions64Low;
attribute vec3 instanceStartPositions64Low;
attribute vec3 instanceEndPositions64Low;
attribute vec3 instanceRightPositions64Low;
attribute float instanceStrokeWidths;
attribute vec4 instanceColors;
attribute vec3 instancePickingColors;


uniform float widthScale;
uniform float widthMinPixels;
uniform float widthMaxPixels;
uniform float jointType;
uniform float capType;
uniform float miterLimit;
uniform int widthUnits;

uniform float opacity;

varying vec4 vColor;
varying vec2 vCornerOffset;
varying float vMiterLength;
varying vec2 vPathPosition;
varying float vPathLength;
varying float vJointType;

const float EPSILON = 0.001;
const vec3 ZERO_OFFSET = vec3(0.0);


// segmentation snippet additions
attribute vec2 centers;
attribute vec2 translateOffsets;
out vec2 centeredPosition;
uniform float zoomX; // related to the camera's zoom level
uniform float scale; // scale geometry related to the source/dest ratio

vec3 adjustToSnippet(vec3 position, out vec2 centerPos) {
  vec3 outPos = position;
  outPos.x -= centers.x;
  outPos.y -= centers.y;

  outPos.x *= scale;
  outPos.y *= scale;

  centerPos = outPos.xy;

  outPos.x *= pow(2.0, -zoomX);

  outPos.x += translateOffsets.x;
  outPos.y += translateOffsets.y;

  return outPos;
}

vec3 adjustToSnippet(vec3 position) {
  vec2 dummy;
  return adjustToSnippet(position, dummy);
}

float flipIfTrue(bool flag) {
  return -(float(flag) * 2. - 1.);
}

// calculate line join positions
vec3 getLineJoinOffset(
  vec3 prevPoint, vec3 currPoint, vec3 nextPoint,
  vec2 width
) {
  bool isEnd = positions.x > 0.0;
  // side of the segment - -1: left, 0: center, 1: right
  float sideOfPath = positions.y;
  float isJoint = float(sideOfPath == 0.0);

  vec3 deltaA3 = (currPoint - prevPoint);
  vec3 deltaB3 = (nextPoint - currPoint);

  vec2 deltaA = deltaA3.xy / width;
  vec2 deltaB = deltaB3.xy / width;

  float lenA = length(deltaA);
  float lenB = length(deltaB);

  vec2 dirA = lenA > 0. ? normalize(deltaA) : vec2(0.0, 0.0);
  vec2 dirB = lenB > 0. ? normalize(deltaB) : vec2(0.0, 0.0);

  vec2 perpA = vec2(-dirA.y, dirA.x);
  vec2 perpB = vec2(-dirB.y, dirB.x);

  // tangent of the corner
  vec2 tangent = dirA + dirB;
  tangent = length(tangent) > 0. ? normalize(tangent) : perpA;
  // direction of the corner
  vec2 miterVec = vec2(-tangent.y, tangent.x);
  // direction of the segment
  vec2 dir = isEnd ? dirA : dirB;
  // direction of the extrusion
  vec2 perp = isEnd ? perpA : perpB;
  // length of the segment
  float L = isEnd ? lenA : lenB;

  // A = angle of the corner
  float sinHalfA = abs(dot(miterVec, perp));
  float cosHalfA = abs(dot(dirA, miterVec));

  // -1: right, 1: left
  float turnDirection = flipIfTrue(dirA.x * dirB.y >= dirA.y * dirB.x);

  // relative position to the corner:
  // -1: inside (smaller side of the angle)
  // 0: center
  // 1: outside (bigger side of the angle)
  float cornerPosition = sideOfPath * turnDirection;

  float miterSize = 1.0 / max(sinHalfA, EPSILON);
  // trim if inside corner extends further than the line segment
  miterSize = mix(
    min(miterSize, max(lenA, lenB) / max(cosHalfA, EPSILON)),
    miterSize,
    step(0.0, cornerPosition)
  );

  vec2 offsetVec = mix(miterVec * miterSize, perp, step(0.5, cornerPosition))
    * (sideOfPath + isJoint * turnDirection);

  // special treatment for start cap and end cap
  bool isStartCap = lenA == 0.0 || (!isEnd && (instanceTypes == 1.0 || instanceTypes == 3.0));
  bool isEndCap = lenB == 0.0 || (isEnd && (instanceTypes == 2.0 || instanceTypes == 3.0));
  bool isCap = isStartCap || isEndCap;

  // extend out a triangle to envelope the round cap
  if (isCap) {
    offsetVec = mix(perp * sideOfPath, dir * capType * 4.0 * flipIfTrue(isStartCap), isJoint);
    vJointType = capType;
  } else {
    vJointType = jointType;
  }

  // Generate variables for fragment shader
  vPathLength = L;
  vCornerOffset = offsetVec;
  vMiterLength = dot(vCornerOffset, miterVec * turnDirection);
  vMiterLength = isCap ? isJoint : vMiterLength;

  vec2 offsetFromStartOfPath = vCornerOffset + deltaA * float(isEnd);
  vPathPosition = vec2(
    dot(offsetFromStartOfPath, perp),
    dot(offsetFromStartOfPath, dir)
  );
  geometry.uv = vPathPosition;

  float isValid = step(instanceTypes, 3.5);
  vec3 offset = vec3(offsetVec * width * isValid, 0.0);

  return offset;
}

// In clipspace extrusion, if a line extends behind the camera, clip it to avoid visual artifacts
void clipLine(inout vec4 position, vec4 refPosition) {
  if (position.w < EPSILON) {
    float r = (EPSILON - refPosition.w) / (position.w - refPosition.w);
    position = refPosition + (position - refPosition) * r;
  }
}

void main() {
  geometry.pickingColor = instancePickingColors;

  vColor = vec4(instanceColors.rgb, instanceColors.a * opacity);

  float isEnd = positions.x;

  vec3 prevPosition = adjustToSnippet(mix(instanceLeftPositions, instanceStartPositions, isEnd));
  vec3 prevPosition64Low = mix(instanceLeftPositions64Low, instanceStartPositions64Low, isEnd);

  vec2 centerPos;
  vec3 currPosition = adjustToSnippet(mix(instanceStartPositions, instanceEndPositions, isEnd), centerPos);
  centeredPosition = centerPos;
  vec3 currPosition64Low = mix(instanceStartPositions64Low, instanceEndPositions64Low, isEnd);

  vec3 nextPosition = adjustToSnippet(mix(instanceEndPositions, instanceRightPositions, isEnd));
  vec3 nextPosition64Low = mix(instanceEndPositions64Low, instanceRightPositions64Low, isEnd);

  geometry.worldPosition = currPosition;
  vec2 widthPixels = vec2(clamp(
    project_size_to_pixel(instanceStrokeWidths * widthScale, widthUnits),
    widthMinPixels, widthMaxPixels) / 2.0);
  vec3 width;

  prevPosition = project_position(prevPosition, prevPosition64Low);
  currPosition = project_position(currPosition, currPosition64Low);
  nextPosition = project_position(nextPosition, nextPosition64Low);

  width = vec3(project_pixel_size(widthPixels), 0.0);
  DECKGL_FILTER_SIZE(width, geometry);

  vec3 offset = getLineJoinOffset(prevPosition, currPosition, nextPosition, width.xy);
  geometry.position = vec4(currPosition + offset, 1.0);
  gl_Position = project_common_position_to_clipspace(geometry.position);

  DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
  DECKGL_FILTER_COLOR(vColor, geometry);
}
`;
