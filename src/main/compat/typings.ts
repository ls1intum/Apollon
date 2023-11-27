import { UMLModelCompat as UMLModelCompatV2 } from './v2';

/*
 *
 * HINT for future maintainers:
 *
 * this should always be the union of compatible model versions, i.e.
 * if the model version is moved to V4, while support for V2 is still required,
 * this should look like the following:
 *
 * ```ts
 * export type UMLModelCompat = UMLModelCompatV2 | UMLModelCompatV3;
 * ```
 */
/**
 * Represents the union of all compatible model versions.
 */
export type UMLModelCompat = UMLModelCompatV2;
