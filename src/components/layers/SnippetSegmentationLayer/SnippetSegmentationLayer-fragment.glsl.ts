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
#define SHADER_NAME SnippetSegmentationLayer-fragment-shader

precision highp float;

uniform float clipSize;
uniform bool clip;
uniform bool filled;

varying vec4 vColor;
in vec2 centeredPosition;


void main(void) {
  // float clipSize = 10.0;
  float border = 2.0;
  float padding = 1.0;
  // set color to green if the point is within the square of size clipSize
  if (abs(centeredPosition.x) < clipSize / 2.0 && abs(centeredPosition.y) < clipSize / 2.0) {
    if (filled) {
      // color inside the square
      gl_FragColor = vColor;
    } else {
      // discard the inside of the square, only have outline
      discard;
    }
  } else if (!clip) {
    // if outside the square and clip is not enabled, fill the area
    gl_FragColor = vColor;
  } else if (
    abs(centeredPosition.x) < clipSize / 2.0 + padding
 && abs(centeredPosition.y) < clipSize / 2.0 + padding) {
    // discard the padding space
    discard;
  } else if (
    abs(centeredPosition.x) < clipSize / 2.0 + border + padding
 && abs(centeredPosition.y) < clipSize / 2.0 + border + padding
 ) {
    // color a small line around the square when it is outside the square
    gl_FragColor = vec4(1.0, 0.0, 0.0, 0.75);
  } else {
    // discard past this border
    discard;
  }

  DECKGL_FILTER_COLOR(gl_FragColor, geometry);
}
`;
