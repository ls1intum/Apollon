export function flatten<T>(arrays: T[][]): T[] {
    return ([] as T[]).concat(...arrays);
}

export function toggle<T>(value: T, array: T[]): T[] {
    return array.includes(value) ? array.filter(element => element !== value) : [...array, value];
}

export function distinct<T>(elements: T[]): T[] {
    const seen = new Set<T>();
    const distinctElements: T[] = [];

    for (const element of elements) {
        if (!seen.has(element)) {
            seen.add(element);
            distinctElements.push(element);
        }
    }

    return distinctElements;
}
