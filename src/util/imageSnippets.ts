import type { Feature } from 'geojson';

export type BBox = [
    number, // left
    number, // top
    number, // right
    number // bottom
];

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

export function getBBoxAroundPoint(
    x: number,
    y: number,
    width: number,
    height: number
): BBox {
    x = Math.round(x);
    y = Math.round(y);
    return [x - width / 2, y + height / 2, x + width / 2, y - height / 2];
}

export function overlaps(a: BBox, b: BBox): boolean {
    // to overlap the x dimension and y dimension must both overlap
    return (
        overlaps1D(a[0], a[2], b[0], b[2]) && // left and right
        overlaps1D(a[3], a[1], b[3], b[1]) // bottom and top
    );
}

function overlaps1D(
    aMin: number,
    aMax: number,
    bMin: number,
    bMax: number
): boolean {
    return aMax >= bMin && aMin <= bMax;
}
