import { CompositeLayer, COORDINATE_SYSTEM } from '@deck.gl/core';
import GL from '@luma.gl/constants';

import {
    loadOmeTiff,
    getChannelStats,
    ImageLayer,
    XRLayer,
    AdditiveColormapExtension,
    SIGNAL_ABORTED,
} from '@hms-dbmi/viv';

import { ColorPaletteExtension } from '@vivjs/extensions';

const defaultProps = {
    pickable: { type: 'boolean', value: true, compare: true },
    coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
    contrastLimits: { type: 'array', value: [], compare: true },
    channelsVisible: { type: 'array', value: [], compare: true },
    selections: { type: 'array', value: [], compare: true },
    loader: {
        type: 'object',
        value: {
            getRaster: async () => ({ data: [], height: 0, width: 0 }),
            dtype: 'Uint16',
            shape: [],
        },
        compare: true,
    },
    onClick: { type: 'function', value: null, compare: true },
    interpolation: {
        type: 'number',
        value: GL.NEAREST,
        compare: true,
    },
    extensions: {
        type: 'array',
        value: [new ColorPaletteExtension()],
        compare: true,
    },
};

/**
 * @typedef LayerProps
 * @type {Object}
 * @property {Array.<Array.<number>>} contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @property {Array.<boolean>} channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @property {Object} loader PixelSource. Represents an N-dimensional image.
 * @property {Array} selections Selection to be used for fetching data.
 * @property {function=} onHover Hook function from deck.gl to handle hover objects.
 * @property {function=} onClick Hook function from deck.gl to handle clicked-on objects.
 * @property {String=} id Unique identifier for this layer.
 * @property {Array=} extensions [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers.
 */

class CellSnippetsLayer extends CompositeLayer {
    finalizeState() {
        this.state.abortController.abort();
    }

    updateState({ props, oldProps, changeFlags }) {
        // console.log({ changeFlags }); // TODO:
        const loaderChanged = props.loader !== oldProps.loader;
        const selectionsChanged = props.selections !== oldProps.selections;
        if (!loaderChanged && !selectionsChanged) return;
        const { loader } = this.props;
        if (!loader) return;
        console.log('updateState');
        const abortController = new AbortController();
        this.setState({ abortController });
        const { signal } = abortController;

        const dataPromises = [];

        for (let i = 0; i < props.selections.length; i++) {
            dataPromises.push(
                loader.getRaster({
                    selection: props.selections[i],
                    signal,
                })
            );
        }
        // const getRaster = loader.getRaster({
        //     selection: props.selections[0],
        //     signal,
        // });
        // TODO: get all data required for the different snippets
        // dataPromises.push(getRaster);
        Promise.all(dataPromises)
            .then((rasters) => {
                const data = [];
                for (let i = 0; i < rasters.length; i++) {
                    const raster = rasters[i];
                    const snippets = props.selections[i].snippets;
                    for (let snippet of snippets) {
                        const snippetData = this.getSnippetOfByteArray(
                            raster.data,
                            raster.width,
                            raster.height,
                            snippet.source
                        );

                        data.push({
                            data: snippetData,
                            source: snippet.source,
                            destination: snippet.destination,
                        });
                    }
                }

                this.setState({
                    data,
                    // width: rasters[0]?.width,
                    // height: rasters[0]?.height,
                });
            })
            .catch((err) => {
                if (err !== SIGNAL_ABORTED) {
                    throw err; // re-throws error if not our signal
                }
            });
    }

    renderLayers() {
        console.log('renderLayers');
        return this.createTestImageSnippetLayer();
    }

    createTestImageSnippetLayer() {
        const { loader, id } = this.props;
        const { width, height, data } = this.state;
        if (!data) return null;
        const { dtype } = loader;
        // console.log('create snippet layer');
        // const dtype = pixelSource.value?.dtype;
        if (!dtype) {
            return null;
        }
        // console.log(testRaster.value?.data);
        // console.log(imageViewerStore.selections);
        // console.log(contrastLimit.value);
        // console.log('colormap:', imageViewerStore.colormap);
        // console.log(dtype);
        // const testData = this.getSnippetOfByteArray(
        //     data[0], // TODO:
        //     767,
        //     767,
        //     [100, 766, 152, 712]
        // );
        // console.log({ testData });
        const xrLayers = [];
        for (let i = 0; i < data.length; i++) {
            const snippet = data[i];
            // const snippetLocations = this.props.selections[i].snippets;
            // for (let j = 0; j < snippetLocations.length; j++) {
            // const snippet = this.props.selections[i].snippets[j];
            xrLayers.push(
                new XRLayer({
                    // loader: pixelSource.value,
                    id: `${id}-snippet-${i}`,
                    contrastLimits: this.props.contrastLimits,
                    // selections: imageViewerStore.selections,
                    channelsVisible: [true],
                    extensions: this.props.extensions,
                    colormap: this.props.colormap,
                    // onClick: () => console.log('click in base image layer'),
                    // onViewportLoad: () => console.log('image viewport load'),
                    dtype,
                    bounds: snippet.destination,
                    // bounds: [0, 767, 767, 0],
                    channelData: {
                        data: [snippet.data],
                        width: snippet.source[2] - snippet.source[0],
                        height: snippet.source[1] - snippet.source[3],
                    },
                    // pickable: false,
                    // autoHighlight: true,
                    // highlightColor: [80, 80, 80, 50],
                })
            );
            // }
        }

        return xrLayers;
    }

    getSnippetOfByteArray(
        byteArray,
        width,
        height,
        bbox // left, bottom, right, top
    ) {
        // create output byte array with the same type as byteArray
        const [left, bottom, right, top] = bbox;
        const outputWidth = right - left;
        const outputHeight = bottom - top;
        const outputByteArray = this.createSameTypeArray(
            byteArray,
            outputWidth * outputHeight
        );
        // byteArray is a flattened 1D array of pixel data, the snippet should
        // extract the values from the bbox and return them in a 1D flattened pixel array
        let i = 0;
        for (let y = top; y < bottom; y++) {
            for (let x = left; x < right; x++) {
                const index = y * width + x;
                // @ts-ignore: ignore because we know the type of the array should match
                outputByteArray[i++] = byteArray[index];
            }
        }

        return outputByteArray;
    }

    createSameTypeArray(input, length) {
        // Mapping of typed array constructors
        const typedArrayConstructors = {
            Int8Array: Int8Array,
            Uint8Array: Uint8Array,
            Uint8ClampedArray: Uint8ClampedArray,
            Int16Array: Int16Array,
            Uint16Array: Uint16Array,
            Int32Array: Int32Array,
            Uint32Array: Uint32Array,
            Float32Array: Float32Array,
            Float64Array: Float64Array,
        };

        // Determine the type of the input array
        for (const key in typedArrayConstructors) {
            if (input instanceof typedArrayConstructors[key]) {
                // Create a new instance of the same type
                return new typedArrayConstructors[key](length);
            }
        }

        throw new Error('Unsupported typed array type');
    }
}
CellSnippetsLayer.layerName = 'CellSnippetsLayer';
CellSnippetsLayer.defaultProps = defaultProps;

export default CellSnippetsLayer;
