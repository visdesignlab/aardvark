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

import { Layer, project32, picking, UNIT } from '@deck.gl/core';
import { Geometry } from '@luma.gl/engine';
import { Model } from '@luma.gl/engine';
import GL from '@luma.gl/constants';

import vs from './scatterplot-layer-vertex.glsl';
import fs from './scatterplot-layer-fragment.glsl';

import type {
    LayerProps,
    LayerDataSource,
    UpdateParameters,
    Accessor,
    Unit,
    Position,
    Color,
    DefaultProps,
} from '@deck.gl/core/typed';

const DEFAULT_COLOR: [number, number, number, number] = [0, 0, 0, 255];

/** All props supported by the ScatterplotLayer */
export type ScatterplotLayerProps<DataT = unknown> =
    _ScatterplotLayerProps<DataT> & LayerProps;

/** Props added by the ScatterplotLayer */
type _ScatterplotLayerProps<DataT> = {
    data: LayerDataSource<DataT>;
    instanceData: number[];
    /**
     * TODO: document
     */
    getModOffset?: Accessor<DataT, number>;

    /**
     * Center position accessor.
     */
    getPosition?: Accessor<DataT, Position>;
    destination: [number, number, number, number];
    dataXExtent: [number, number];
    baseline: number;
    binSize: number;
    positiveColors: [number, number, number, number];

    /**
     * Fill color accessor.
     * @default [0, 0, 0, 255]
     */
    getFillColor?: Accessor<DataT, Color>;
};

const defaultProps: DefaultProps<ScatterplotLayerProps> = {
    getPosition: { type: 'accessor', value: (x: any) => x.position },
    getFillColor: { type: 'accessor', value: DEFAULT_COLOR },
};

/** Render circles at given coordinates. */
export default class CustomScatterplotLayer<
    DataT = any,
    ExtraPropsT extends {} = {}
> extends Layer<ExtraPropsT & Required<_ScatterplotLayerProps<DataT>>> {
    static defaultProps = defaultProps;
    static layerName: string = 'ScatterplotLayer';

    state!: {
        model?: Model;
    };

    getShaders() {
        return super.getShaders({ vs, fs, modules: [project32, picking] });
    }

    initializeState() {
        console.log('initialize custom scatterplot layer state');
        this.getAttributeManager()!.addInstanced({
            instanceModOffsets: {
                size: 1,
                type: GL.INT,
                accessor: 'getModOffset',
                defaultValue: 0,
                // transition: true,
            },
            instancePositions: {
                size: 3,
                type: GL.DOUBLE,
                fp64: this.use64bitPositions(),
                transition: true,
                accessor: 'getPosition',
            },
            instanceFillColors: {
                size: this.props.colorFormat.length,
                transition: true,
                normalized: true,
                type: GL.UNSIGNED_BYTE,
                accessor: 'getFillColor',
                defaultValue: [0, 0, 0, 255],
            },
        });
        console.log('end initialize custom scatterplot layer state');
    }

    updateState(params: UpdateParameters<this>) {
        console.log('update state custom scatterplot layer');
        super.updateState(params);

        if (params.changeFlags.extensionsChanged) {
            // TODO: check if instance geometry has changed
            this.state.model?.destroy();
            this.state.model = this._getModel();
            this.getAttributeManager()!.invalidateAll();
        }
    }

    draw({ uniforms }) {
        console.log('draw custom scatterplot layer');
        const { destination, dataXExtent, baseline, binSize, positiveColors } =
            this.props;
        const model = this.state.model!;

        model.setUniforms(uniforms);
        model.setUniforms({
            destination,
            dataXExtent,
            baseline,
            binSize,
            positiveColors,
        });
        model.draw(this.context.renderPass);
    }

    protected _getModel() {
        console.log('get model custom scatterplot layer');
        const positions = this.props.instanceData;

        const geometryPositions = new Float32Array(positions);
        const geometry = new Geometry({
            drawMode: this.context.gl.TRIANGLE_STRIP,
            attributes: {
                positions: { size: 2, value: geometryPositions },
            },
        });
        const model = new Model(this.context.gl, {
            ...this.getShaders(),
            id: this.props.id,
            // bufferLayout: this.getAttributeManager()!.getBufferLayouts(),
            geometry,
            isInstanced: true,
        });
        console.log('end get model custom scatterplot layer');
        return model;
    }
}
