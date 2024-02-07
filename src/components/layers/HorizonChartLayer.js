import { SolidPolygonLayer } from '@deck.gl/layers';

export default class HorizonChartLayer extends SolidPolygonLayer {
    // draw({ uniforms }) {
    //     console.log('draw called with uniforms');
    //     super.draw({ uniforms });
    // }
    getShaders(id) {
        const shaders = super.getShaders(id);
        //     // console.log('getting shaders!!!~!!!!!');
        //     const shaders = super.getShaders();
        //     // console.log({ shaders });
        //     // return shaders;
        //     // return Object.assign({}, super.getShaders(), {
        //     //     fs: customFragmentShader,
        //     // });
        shaders.inject = {
            // 'vs:DECKGL_FILTER_GL_POSITION': `
            //     if (geometry.worldPosition[0] > 0.5) {
            //         position[0] = position[0] + 0.5;
            //     }
            // `,
            // 'fs:DECKGL_FILTER_COLOR': `
            //         color[2] = 255.0;
            //     `,
        };
        return shaders;
    }
}

// import { Layer } from '@deck.gl/core';
// import { Model, Geometry } from '@luma.gl/core';

// const vs = `
//     attribute vec3 positions;
//     uniform mat4 modelMatrix;
//     uniform mat4 projectionMatrix;
//     uniform mat4 modelViewMatrix;

//     void main() {
//         gl_Position = projectionMatrix * modelViewMatrix * vec4(positions, 1.0);
//     }
// `;

// const fs = `
//     void main() {
//         gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
//     }
// `;

// export default class HorizonChartLayer extends Layer {
//     initializeState() {
//         const { gl } = this.context;
//         const x = 100;
//         const model = new Model(gl, {
//             id: this.props.id,
//             vs,
//             fs,
//             geometry: new Geometry({
//                 drawMode: gl.TRIANGLES,
//                 attributes: {
//                     // prettier-ignore
//                     positions: new Float32Array([
//                         -x, -x, 0,
//                          x, -x, 0,
//                          0,  x, 0,
//                     ]),
//                 },
//             }),
//         });

//         this.setState({ model });
//     }

//     draw({ uniforms }) {
//         console.log('draw');
//         const { model } = this.state;
//         model.setUniforms(uniforms).draw();
//     }
// }
