import { printJson } from '@layerzerolabs/io-devtools'

export abstract class ContractError<TReason = unknown> extends Error {
    public abstract readonly reason: TReason
}

export class UnknownError extends ContractError<undefined> {
    public readonly reason = undefined

    constructor(message = 'Unknown contract error') {
        super(message)
        this.name = 'UnknownError'
    }
}

export class PanicError extends ContractError<bigint> {
    constructor(
        public readonly reason: bigint,
        message: string = `Contract panicked (assert() has been called)`
    ) {
        super(message)
        this.name = 'PanicError'
    }

    override toString(): string {
        return `${super.toString()}. Error code ${this.reason}`
    }
}

export class RevertError extends ContractError<string> {
    constructor(
        public readonly reason: string,
        message: string = `Contract reverted`
    ) {
        super(message)
        this.name = 'RevertError'
    }

    override toString(): string {
        return `${super.toString()}. Error reason '${this.reason}'`
    }
}

export class CustomError extends ContractError<string> {
    constructor(
        public readonly reason: string,
        public readonly args: unknown[],
        message: string = `Contract reverted with custom error`
    ) {
        super(message)
        this.name = 'CustomError'
    }

    override toString(): string {
        const formattedArgs = this.args.map((arg) => printJson(arg, false))

        return `${super.toString()}. Error ${this.reason}(${formattedArgs})`
    }
}
