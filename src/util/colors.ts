// util file for easier consistent color usage
const colors: {
    [key: string]: {
        hex: string;
        rgb: [number, number, number];
        rgba: [number, number, number, number];
    };
} = {
    selected: {
        hex: '#fde309',
        rgb: [253, 227, 9],
        rgba: [253, 227, 9, 255],
    },
    selectedDarker: {
        hex: '#b6a402',
        rgb: [182, 164, 2],
        rgba: [182, 164, 2, 255],
    },
    unselectedBoundary: {
        hex: '#377eb8',
        rgb: [55, 126, 184],
        rgba: [55, 126, 184, 255],
    },
};

export default colors;
