export function assertNever(obj: never): never {
    throw Error(`Unexpected value '${obj}'`);
}
