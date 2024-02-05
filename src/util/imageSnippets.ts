import type { Feature } from 'geojson';

export type BBox = [number, number, number, number];

export function getMaxHeight(segmentations: Feature[]): number {
    let maxHeight = 0;
    for (const segmentation of segmentations) {
        if (!segmentation.bbox) continue;
        const height = getHeight(segmentation.bbox as BBox);
        if (height > maxHeight) {
            maxHeight = height;
        }
    }
    return maxHeight;
}

export function getHeight(bbox: BBox): number {
    return bbox[1] - bbox[3];
}

export function getWidth(bbox: BBox): number {
    return bbox[2] - bbox[0];
}

export function addMargin(
    bbox: BBox,
    top: number,
    bottom: number,
    left: number,
    right: number
): BBox {
    // prettier-ignore
    return [
        bbox[0] - left,
        bbox[1] + top,
        bbox[2] + right,
        bbox[3] - bottom,
    ];
}

export function expandHeight(bbox: BBox, height: number): BBox {
    const currHeight = getHeight(bbox);
    let margin = height - currHeight;
    if (margin < 0) {
        margin = 0;
        console.error('expandHeight: height is smaller than current height');
    }
    return addMargin(bbox, Math.ceil(margin / 2), Math.floor(margin / 2), 0, 0);
}
