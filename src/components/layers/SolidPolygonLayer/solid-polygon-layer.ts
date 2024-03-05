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

import { Layer, project32 } from '@deck.gl/core';
import GL from '@luma.gl/constants';
import { Model, hasFeatures, FEATURES } from '@luma.gl/core';

// Polygon geometry generation is managed by the polygon tesselator
import PolygonTesselator from './polygon-tesselator';

import vsTop from './solid-polygon-layer-vertex-top.glsl';
import fs from './solid-polygon-layer-fragment.glsl';

import type {
    LayerProps,
    LayerDataSource,
    Color,
    Accessor,
    AccessorFunction,
    UpdateParameters,
    DefaultProps,
} from '@deck.gl/core';
import type { PolygonGeometry } from './polygon';

type _SolidPolygonLayerProps<DataT> = {
    data: LayerDataSource<DataT>;
    /** Whether to fill the polygons
     * @default true
     */

    /** Polygon geometry accessor. */
    getPolygon?: AccessorFunction<DataT, PolygonGeometry>;
    /** Extrusion height accessor.
     * @default 1000
     */
    // getElevation?: Accessor<DataT, number>;
    /** Fill color accessor.
     * @default [0, 0, 0, 255]
     */
    getFillColor?: Accessor<DataT, Color>;
    /** Stroke color accessor.
     * @default [0, 0, 0, 255]
     */
    getLineColor?: Accessor<DataT, Color>;
    /** Center of Polygon.
     * @default [0, 0]
     */
    getCenter?: Accessor<DataT, [number, number]>;
    /** Translate offset accessor.
     * @default [0, 0]
     */
    getTranslateOffset?: Accessor<DataT, [number, number]>;

    /**
     * Material settings for lighting effect. Applies if `extruded: true`
     *
     * @default true
     * @see https://deck.gl/docs/developer-guide/using-lighting
     */
    // material?: Material;
};

/** Render filled and/or extruded polygons. */
export type SolidPolygonLayerProps<DataT = any> =
    _SolidPolygonLayerProps<DataT> & LayerProps;

const DEFAULT_COLOR: [number, number, number, number] = [0, 0, 0, 255];

const defaultProps: DefaultProps<SolidPolygonLayerProps> = {
    getPolygon: { type: 'accessor', value: (f) => f.polygon },
    // getElevation: { type: 'accessor', value: 1000 },
    getFillColor: { type: 'accessor', value: DEFAULT_COLOR },
    getLineColor: { type: 'accessor', value: DEFAULT_COLOR },
    getCenter: { type: 'accessor', value: [0, 0] },
    getTranslateOffset: { type: 'accessor', value: [0, 0] },

    // material: true,
};

const ATTRIBUTE_TRANSITION = {
    enter: (value, chunk) => {
        return chunk.length
            ? chunk.subarray(chunk.length - value.length)
            : value;
    },
};

export default class SolidPolygonLayer<
    DataT = any,
    ExtraPropsT extends {} = {}
> extends Layer<ExtraPropsT & Required<_SolidPolygonLayerProps<DataT>>> {
    static defaultProps = defaultProps;
    static layerName = 'SolidPolygonLayer';

    constructor(props: SolidPolygonLayerProps<DataT>) {
        super(props);
    }

    state!: {
        topModel?: Model;
        // sideModel?: Model;
        models?: Model[];
        numInstances: number;
        polygonTesselator: PolygonTesselator;
    };

    getShaders() {
        return super.getShaders({
            vs: vsTop,
            fs,
            defines: {
                RING_WINDING_ORDER_CW: 1,
            },
            modules: [project32],
        });
    }

    get wrapLongitude(): boolean {
        return false;
    }

    initializeState() {
        const { gl } = this.context;

        this.setState({
            numInstances: 0,
            polygonTesselator: new PolygonTesselator({
                // Lnglat coordinates are usually projected non-linearly, which affects tesselation results
                // Provide a preproject function if the coordinates are in lnglat
                // preproject,
                fp64: this.use64bitPositions(),
                IndexType:
                    !gl || hasFeatures(gl, FEATURES.ELEMENT_INDEX_UINT32)
                        ? Uint32Array
                        : Uint16Array,
            }),
        });

        const attributeManager = this.getAttributeManager()!;
        const noAlloc = true;

        /* eslint-disable max-len */
        attributeManager.add({
            indices: {
                size: 1,
                isIndexed: true,
                // eslint-disable-next-line @typescript-eslint/unbound-method
                update: this.calculateIndices,
                noAlloc,
            },
            positions: {
                size: 3,
                type: GL.DOUBLE,
                fp64: this.use64bitPositions(),
                transition: ATTRIBUTE_TRANSITION,
                accessor: 'getPolygon',
                // eslint-disable-next-line @typescript-eslint/unbound-method
                update: this.calculatePositions,
                noAlloc,
                shaderAttributes: {
                    positions: {
                        vertexOffset: 0,
                        divisor: 0,
                    },
                    instancePositions: {
                        vertexOffset: 0,
                        divisor: 1,
                    },
                    nextPositions: {
                        vertexOffset: 1,
                        divisor: 1,
                    },
                },
            },
            vertexValid: {
                size: 1,
                divisor: 1,
                type: GL.UNSIGNED_BYTE,
                // eslint-disable-next-line @typescript-eslint/unbound-method
                update: this.calculateVertexValid,
                noAlloc,
            },
            fillColors: {
                size: this.props.colorFormat.length,
                type: GL.UNSIGNED_BYTE,
                normalized: true,
                transition: ATTRIBUTE_TRANSITION,
                accessor: 'getFillColor',
                defaultValue: DEFAULT_COLOR,
                shaderAttributes: {
                    fillColors: {
                        divisor: 0,
                    },
                    instanceFillColors: {
                        divisor: 1,
                    },
                },
            },
            lineColors: {
                size: this.props.colorFormat.length,
                type: GL.UNSIGNED_BYTE,
                normalized: true,
                transition: ATTRIBUTE_TRANSITION,
                accessor: 'getLineColor',
                defaultValue: DEFAULT_COLOR,
                shaderAttributes: {
                    lineColors: {
                        divisor: 0,
                    },
                    instanceLineColors: {
                        divisor: 1,
                    },
                },
            },
            centers: {
                size: 2,
                type: GL.DOUBLE,
                accessor: 'getCenter',
                defaultValue: [0, 0],
            },
            translateOffsets: {
                size: 2,
                type: GL.DOUBLE,
                accessor: 'getTranslateOffset',
                defaultValue: [0, 0],
            },
        });
        /* eslint-enable max-len */
    }

    draw({ uniforms }) {
        const { zoomX, scale, clipSize, clip } = this.props;
        const { topModel, polygonTesselator } = this.state;

        const renderUniforms = {
            ...uniforms,
            zoomX,
            scale,
            clipSize,
            clip,
        };

        if (topModel) {
            topModel.setVertexCount(polygonTesselator.vertexCount);
            topModel.setUniforms(renderUniforms).draw();
        }
    }

    updateState(updateParams: UpdateParameters<this>) {
        super.updateState(updateParams);

        this.updateGeometry(updateParams);

        const { changeFlags } = updateParams;
        const attributeManager = this.getAttributeManager();

        if (changeFlags.extensionsChanged) {
            this.state.models?.forEach((model) => model.delete());

            this.setState(this._getModels(this.context.gl));
            attributeManager!.invalidateAll();
        }
    }

    protected updateGeometry({ props, changeFlags }: UpdateParameters<this>) {
        const geometryConfigChanged =
            changeFlags.dataChanged ||
            (changeFlags.updateTriggersChanged &&
                (changeFlags.updateTriggersChanged.all ||
                    changeFlags.updateTriggersChanged.getPolygon));

        // When the geometry config  or the data is changed,
        // tessellator needs to be invoked
        if (geometryConfigChanged) {
            const { polygonTesselator } = this.state;
            const buffers = (props.data as any).attributes || {};
            polygonTesselator.updateGeometry({
                data: props.data,
                normalize: true,
                geometryBuffer: buffers.getPolygon,
                buffers,
                getGeometry: props.getPolygon,
                positionFormat: props.positionFormat,
                wrapLongitude: props.wrapLongitude,
                // TODO - move the flag out of the viewport
                resolution: this.context.viewport.resolution,
                fp64: this.use64bitPositions(),
                dataChanged: changeFlags.dataChanged,
            });

            this.setState({
                numInstances: polygonTesselator.instanceCount,
                startIndices: polygonTesselator.vertexStarts,
            });

            if (!changeFlags.dataChanged) {
                // Base `layer.updateState` only invalidates all attributes on data change
                // Cover the rest of the scenarios here
                this.getAttributeManager()!.invalidateAll();
            }
        }
    }

    protected _getModels(gl: WebGLRenderingContext): Model {
        const { id } = this.props;

        const shaders = this.getShaders();
        shaders.defines.NON_INSTANCED_MODEL = 1;

        const topModel = new Model(gl, {
            ...shaders,
            id: `${id}-top`,
            drawMode: GL.TRIANGLES,
            attributes: {
                vertexPositions: new Float32Array([0, 1]),
            },
            uniforms: {
                isWireframe: false,
                isSideVertex: false,
            },
            vertexCount: 0,
            isIndexed: true,
        });

        return {
            models: [topModel],
            topModel,
        };
    }

    protected calculateIndices(attribute) {
        const { polygonTesselator } = this.state;
        attribute.startIndices = polygonTesselator.indexStarts;
        attribute.value = polygonTesselator.get('indices');
    }

    protected calculatePositions(attribute) {
        const { polygonTesselator } = this.state;
        attribute.startIndices = polygonTesselator.vertexStarts;
        attribute.value = polygonTesselator.get('positions');
    }

    protected calculateVertexValid(attribute) {
        attribute.value = this.state.polygonTesselator.get('vertexValid');
    }
}
