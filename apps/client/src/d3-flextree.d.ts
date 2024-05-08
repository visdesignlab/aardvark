declare module 'd3-flextree' {
    export interface LayoutNode<T> {
        [x: string]: any;
        depth: number;
        height: number;
        x: number;
        y: number;
        data: T;
        parent?: LayoutNode;
        children?: LayoutNode[];
        spacing: (any) => void;
        descendants: () => LayoutNode<T>[];
    }
    export function flextree<T>(options: any): (tree: any) => LayoutNode<T>;
}
