export function sanitizeWhiteSpace(input: string) {
    return input.trim().replace(/\s+/g, " ");
}
