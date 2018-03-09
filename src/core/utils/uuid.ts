const length = 12;

const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const lettersAndNumbers = letters + "0123456789";

function random(minInclusive: number, maxExclusive: number): number {
    return ~~(Math.random() * (maxExclusive - minInclusive)) + minInclusive;
}

function randomLetter() {
    return letters[random(0, letters.length)];
}

function randomLetterOrNumber() {
    return lettersAndNumbers[random(0, lettersAndNumbers.length)];
}

export function newId(): UUID {
    let id = randomLetter();
    for (let i = 0; i < length - 1; i++) {
        id += randomLetterOrNumber();
    }
    return id as UUID;
}

// Dummy enum
declare enum UUIDTag {}

export type UUID = string & UUIDTag;
