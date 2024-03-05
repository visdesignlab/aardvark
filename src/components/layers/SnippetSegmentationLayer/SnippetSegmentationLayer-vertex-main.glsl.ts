// Modified from the SolidPolygonLayer included in deck.gl.
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

attribute vec2 vertexPositions;

uniform float zoomX; // related to the camera's zoom level
uniform float scale; // scale geometry related to the source/dest ratio

varying vec4 vColor;

struct PolygonProps {
  vec4 fillColors;
  vec4 lineColors;
  vec3 positions;
  vec3 nextPositions;
  vec3 pickingColors;
  vec3 positions64Low;
  vec3 nextPositions64Low;
  vec2 centers;
  vec2 translateOffsets;
};

out vec2 centeredPosition;

void calculatePosition(PolygonProps props) {
  vec3 pos;
  vec3 pos64Low;
  vec3 normal;

  geometry.worldPosition = props.positions;
  geometry.worldPositionAlt = props.nextPositions;
  geometry.pickingColor = props.pickingColors;


  pos = props.positions;
  
  // the cell boundary so it's center is at origin
  pos.x -= props.centers.x;
  pos.y -= props.centers.y;

  // account for the source/dest ratio
  pos.x *= scale;
  pos.y *= scale;

  // store the centered position so clipping can happen in fragment shader
  centeredPosition = pos.xy;

  // account for the camera scaling
  pos.x *= pow(2.0, -zoomX);

  // translate to the center of the snippet display position
  pos.x += props.translateOffsets.x;
  pos.y += props.translateOffsets.y;

  pos64Low = props.positions64Low;


  gl_Position = project_position_to_clipspace(pos, pos64Low, vec3(0.), geometry.position);

  DECKGL_FILTER_GL_POSITION(gl_Position, geometry);

  vColor = props.fillColors;
  DECKGL_FILTER_COLOR(vColor, geometry);
}
`;
