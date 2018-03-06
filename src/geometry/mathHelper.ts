export function isAlmostZero(value: number) {
    return Math.abs(value) < 1e-6;
}

export function areAlmostEqual(a: number, b: number) {
    return isAlmostZero(a - b);
}
