import { isAlmostZero } from "./mathHelper";

export interface Size {
    width: number;
    height: number;
}

export function sizesAreEqual(size1: Size, size2: Size) {
    const deltaWidth = Math.abs(size1.width - size2.width);
    const deltaHeight = Math.abs(size1.height - size2.height);

    return isAlmostZero(deltaWidth) && isAlmostZero(deltaHeight);
}
