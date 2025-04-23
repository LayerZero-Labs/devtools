// This file contains examples of bad code that should be flagged by the linter

// No sql injection
// This is a bad SQL query
export function badSQL(parameters: string[]) {
    // This is a bad SQL query
    return `SELECT * FROM users WHERE name = '${parameters[0]}' AND age = ${parameters[1]}`
}

// Example of a high code complexity function
export function emojiRoulette(seed: number | null): string {
    // Bail out fast on obviously bad input
    if (seed === null) {
        return '💤'
    }

    // Force the number into a 0-99 range
    const n = Math.abs(seed) % 100

    // Nested loops + branching galore — purely for complexity
    let acc = 0
    outer: for (let i = 0; i < n; i++) {
        // pointless inner loop
        for (let j = 0; j < i % 5; j++) {
            acc += (i * j) % 7
            if (acc > 500) {
                break outer
            } // labelled break
        }

        // switch with fall-throughs
        switch (i % 7) {
            case 0:
            case 1:
                acc += 3
                break
            case 2:
                acc ^= 0b1010
                break
            case 3:
                if (acc % 2 === 0) {
                    acc >>= 1
                } else {
                    acc <<= 1
                }
                break
            case 4:
                acc = (acc * 31) % 997
                break
            case 5:
                acc = ~~(Math.sqrt(acc) * 13)
                break
            default:
                acc--
        }

        // a needless ternary chain
        acc = acc % 4 === 0 ? acc + 17 : acc % 3 === 0 ? acc - 9 : acc % 2 === 0 ? acc * 2 : acc + 1
    }

    // Final decision tree (more branches!)
    if (acc % 11 === 0) {
        return '🚀'
    } else if (acc % 7 === 0) {
        return '🎉'
    } else if (acc % 5 === 0) {
        return '🤖'
    } else if (acc % 3 === 0) {
        return '🐙'
    } else if (acc % 2 === 0) {
        return '🍕'
    } else {
        return '🤷'
    }
}
