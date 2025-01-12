import { INewOperation, Operation } from './types/NewOperation'
import { ArgumentParser } from 'argparse'
import { initOperation } from './types/help'

class AptosEVMCLI {
    parser: ArgumentParser
    args: any
    operations: Operation
    rootDir: string
    constructor(rootDir: string = process.cwd()) {
        this.parser = new ArgumentParser({
            description: 'A simple CLI tool built with argparse in TypeScript',
        })

        this.operations = {}
        this.rootDir = rootDir
    }

    validateArgs(args: string[]) {
        let isValid = true
        const missingArgs: string[] = []
        for (const arg of args) {
            if (!this.args[arg]) {
                missingArgs.push(`--${arg.replace('_', '-')}=<value>`)
                isValid = false
            }
        }
        if (!isValid) {
            throw new Error(`The following args are required: ${missingArgs.join(', ')}\n\n`)
        }
        return isValid
    }

    async extendOperationFromPath(path: string) {
        const operation = await import(path)
        const NewOperation = operation.NewOperation
        await this.extendOperation(NewOperation)
    }

    async extendOperation(NewOperation: INewOperation) {
        if (!this.operations[NewOperation.vm]) {
            this.operations[NewOperation.vm] = {}
        }

        const a = this.operations[NewOperation.vm]
        if (!a) {
            throw new Error('a is undefined')
        }

        if (!a[NewOperation.operation]) {
            const b = this.operations[NewOperation.vm]
            if (!b) {
                throw new Error('b is undefined')
            }
            b[NewOperation.operation] = {
                func: NewOperation.impl,
                requiredArgs: NewOperation.reqArgs || [],
                description: NewOperation.description,
            }
        }

        if (NewOperation.addArgs) {
            for (const arg of NewOperation.addArgs) {
                this.parser.add_argument(arg.name, arg.arg)
            }
        }
    }

    async execute() {
        this.args = this.parser.parse_args()
        this.args.rootDir = this.rootDir
        this.args.operations = this.operations

        if (this.args.op === 'help') {
            this.args.vm = '*'
        } else if (!this.args.vm) {
            throw new Error('--vm is required')
        }

        const vm = this.args.vm
        const op = this.args.op

        const a = this.operations[vm]
        if (!a) {
            throw new Error('a is undefined')
        }

        const exec_op = a[op]
        if (!exec_op) {
            throw new Error(`Operation ${op} is not valid for ${vm}`)
        }
        if (this.validateArgs(exec_op.requiredArgs)) {
            await exec_op.func(this.args)
        }
    }
}

const sdk = new AptosEVMCLI()
sdk.extendOperation(initOperation)
export { AptosEVMCLI, sdk }
