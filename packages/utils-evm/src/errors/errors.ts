export abstract class ContractError<TReason = unknown> extends Error {
    public abstract readonly reason: TReason
}

export class UnknownError extends ContractError<undefined> {
    public readonly reason = undefined

    constructor(message = 'Unknown contract error') {
        super(message)
    }
}

export class PanicError extends ContractError<bigint> {
    constructor(
        public readonly reason: bigint,
        message: string = `Contract panicked with code ${reason}`
    ) {
        super(message)
    }
}

export class RevertError extends ContractError<string> {
    constructor(
        public readonly reason: string,
        message: string = `Contract reverted with reason '${reason}'`
    ) {
        super(message)
    }
}

export class CustomError extends ContractError<string> {
    constructor(
        public readonly reason: string,
        public readonly args: unknown[],
        message: string = `Contract reverted with custom error '${reason}'`
    ) {
        super(message)
    }
}
