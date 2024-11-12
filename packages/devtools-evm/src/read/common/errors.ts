export class UnresolvableCommandError extends Error {
    constructor() {
        super(`Unresolvable command`)
    }
}

export class ContractNotFoundError extends Error {
    constructor() {
        super('Contract not found at address')
    }
}
