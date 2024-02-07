/// rounded-rectangle-layer.js
// Example to draw rounded rectangles instead of circles in ScatterplotLayer
import { ScatterplotLayer } from '@deck.gl/layers';
import customFragmentShader from './rounded-rectangle-layer-fragment.glsl.js';

export default class RoundedRectangleLayer extends ScatterplotLayer {
    draw({ uniforms }) {
        super.draw({
            uniforms: {
                ...uniforms,
                cornerRadius: this.props.cornerRadius,
            },
        });
    }

    getShaders() {
        // const shaders = super.getShaders();
        // console.log('rounded shaders', shaders);
        // use object.assign to make sure we don't overwrite existing fields like `vs`, `modules`...
        return Object.assign({}, super.getShaders(), {
            fs: customFragmentShader,
        });
    }
}

RoundedRectangleLayer.defaultProps = {
    // cornerRadius: the amount of rounding at the rectangle corners
    // 0 - rectangle. 1 - circle.
    cornerRadius: 0.1,
};
