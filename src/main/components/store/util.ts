/**
 *
 * converts an inclusion map of strings to an array of strings.
 * inclusion maps emulate a set of strings (e.g. identifiers).
 *
 * @param {{[id: string]: boolean}} map - an inclusion map for strings
 * @returns {string[]} - an array of all included strings
 *
 */
export function inclusionMapToArray(map: Record<string, boolean>): string[] {
  return Object.entries(map)
    .filter(([, value]) => value)
    .map(([key]) => key);
}

/**
 *
 * converts an array of strings to an inclusion map of strings.
 * inclusion maps emulate a set of strings (e.g. identifiers).
 *
 * @param {string[]} array - an array of strings
 * @returns {{[id: string]: boolean}} - an inclusion map for all strings in the array
 *
 */
export function arrayToInclusionMap(array: string[]): Record<string, boolean> {
  return array.reduce<Record<string, boolean>>((acc, val) => ({ ...acc, [val]: true }), {});
}
