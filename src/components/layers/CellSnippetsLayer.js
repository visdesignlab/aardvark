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
import { LRUCache } from 'lru-cache';

import { ColorPaletteExtension } from '@vivjs/extensions';

import { isEqual } from 'lodash-es';
import { PolygonLayer } from 'deck.gl';

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
    colormap: { type: 'string', value: '', compare: true },
    // not used directly, but need to know for update logic
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
    initializeState() {
        this.state.cache = new LRUCache({
            max: 250,
        });
        // this.state.loading = false;
    }

    finalizeState() {
        this.state.abortController?.abort();
    }

    getSnippetKey(c, t, z, source) {
        return [c, t, z, ...source].toString();
    }

    matchSelectionsToData(selections, data) {
        const newData = [];
        const unmatchedSelections = [];
        if (!data) {
            // no data yet, everything is unmatched
            return { newData, unmatchedSelections: selections };
        }
        for (const selection of selections) {
            const { c, t, z, snippets } = selection;
            const unmatchedSnippets = [];
            for (const snippet of snippets) {
                const key = this.getSnippetKey(c, t, z, snippet.source);
                if (this.state.cache.has(key)) {
                    const snippetData = this.state.cache.get(key);
                    newData.push({
                        index: { c, t, z },
                        source: snippet.source,
                        destination: snippet.destination,
                        data: snippetData,
                    });
                    continue;
                }
                // this.state.cache.set(key, raster.data);

                const match = data.find((d) => {
                    if (
                        d.index.c === c &&
                        d.index.t === t &&
                        d.index.z === z &&
                        d.source[0] === snippet.source[0] &&
                        d.source[1] === snippet.source[1] &&
                        d.source[2] === snippet.source[2] &&
                        d.source[3] === snippet.source[3]
                    ) {
                        // newData.push(d);
                        return true;
                    }
                    return false;
                });
                if (match) {
                    match.destination = snippet.destination;
                    newData.push(match);
                } else {
                    unmatchedSnippets.push(snippet);
                }
            }
            if (unmatchedSnippets.length) {
                unmatchedSelections.push({
                    c,
                    t,
                    z,
                    snippets: unmatchedSnippets,
                });
            }
        }
        return { newData, unmatchedSelections };
    }

    updateState({ props, oldProps, changeFlags }) {
        const loaderChanged = props.loader !== oldProps.loader;
        const selectionsChanged = !isEqual(
            props.selections,
            oldProps.selections
        );
        const colormapChanged = props.colormap !== oldProps.colormap;
        if (!loaderChanged && !selectionsChanged && !colormapChanged) return;
        const { loader } = this.props;
        if (!loader) return;

        // stop existing async calls since they are now outdated
        this.state.abortController?.abort();

        const { data } = this.state;
        const { newData, unmatchedSelections } = this.matchSelectionsToData(
            props.selections,
            data
        );
        const loadingDestinations = [];

        if (unmatchedSelections.length === 0) {
            this.setState({ data: newData, loadingDestinations });
            return;
        }
        // let loading = true;
        const abortController = new AbortController();
        // this.setState({ abortController, loading });
        this.setState({ abortController });
        const { signal } = abortController;

        // const dataPromises = [];

        for (const selection of unmatchedSelections) {
            for (const snippet of selection.snippets) {
                const destination = snippet.destination;
                loadingDestinations.push(destination);
            }
        }
        this.setState({ data: newData, loadingDestinations });

        for (const selection of unmatchedSelections) {
            loader
                .getRaster({ selection, signal })
                .then((raster) => {
                    const { c, t, z, snippets } = selection;
                    const loadedData = [];
                    for (let snippet of snippets) {
                        const snippetData = this.getSnippetOfByteArray(
                            raster.data,
                            raster.width,
                            raster.height,
                            snippet.source
                        );
                        const key = this.getSnippetKey(c, t, z, snippet.source);
                        this.state.cache.set(key, snippetData);

                        loadedData.push({
                            data: snippetData,
                            source: snippet.source,
                            destination: snippet.destination,
                            index: {
                                c,
                                t,
                                z,
                            },
                        });
                    }

                    this.setState({
                        data: this.state.data.concat(loadedData),
                        // loadingDestinations: [],
                    });
                })
                .catch((err) => {
                    // this.setState({ loading: false });
                    if (err !== SIGNAL_ABORTED) {
                        throw err; // re-throws error if not our signal
                    }
                });
        }
    }

    renderLayers() {
        const layers = [];
        // console.log('renderLayers');
        // if (this.state.loading) {
        layers.push(this.createLoadingUnderLayer());
        layers.push(this.createImageSnippetLayers());
        return layers;
    }

    createLoadingUnderLayer() {
        const { loadingDestinations } = this.state;
        if (!loadingDestinations) return null;
        const destinations = loadingDestinations.map((d) => {
            const [l, t, r, b] = d;
            const coords = [
                [l, b],
                [l, t],
                [r, t],
                [r, b],
            ];
            return coords;
        });

        //get current time in seconds
        const t = Date.now();
        // console.log(t);

        const { id } = this.props;
        return new PolygonLayer({
            id: `${id}-snippet-loading-layer`,
            data: destinations,
            getPolygon: (d) => d,
            // getFillColor: [120, t % 255, 250],
            getFillColor: [120, 120, 160],
            filled: true,
            pickable: false,
            stroked: false,
            extruded: false,
        });
    }

    createImageSnippetLayers() {
        const { loader, id } = this.props;
        const { data } = this.state;
        if (!data) return null;
        const { dtype } = loader;

        if (!dtype) {
            return null;
        }

        const xrLayers = [];
        for (let i = 0; i < data.length; i++) {
            const snippet = data[i];

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
        const [left, bottom, right, top] = bbox;
        const outputWidth = right - left;
        const outputHeight = bottom - top;
        // create output byte array with the same type as byteArray
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
                if (0 <= y && y < height && 0 <= x && x < width) {
                    outputByteArray[i++] = byteArray[index];
                } else {
                    outputByteArray[i++] = 0;
                }
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
