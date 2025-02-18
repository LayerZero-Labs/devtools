export class ContractNotFoundError extends Error {
    constructor() {
        super('Contract not found at address')
    }
}
