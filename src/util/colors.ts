// util file for easier consistent color usage
const colors: {
    [key: string]: {
        hex: string;
        rgb: [number, number, number];
    };
} = {
    selected: {
        hex: '#fde309',
        rgb: [253, 227, 9],
    },
    unselected: {
        hex: '#377eb8',
        rgb: [55, 126, 184],
    },
};

export default colors;
