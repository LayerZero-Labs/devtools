import { INewOperation, Operation } from './types/NewOperation'
import { ArgumentParser } from 'argparse'

class AptosEVMCLI {
    parser: ArgumentParser
    args: any
    operations: Operation
    constructor(rootDir: string = process.cwd()) {
        this.parser = new ArgumentParser({
            description: 'A simple CLI tool built with argparse in TypeScript',
        })
        this.addArgs()

        const args = this.parser.parse_args()

        this.operations = {}
        this.args = args
        this.args.rootDir = rootDir
    }

    addArgs() {
        this.parser.add_argument('--vm', {
            type: 'str',
            help: `vm to perform operation on`,
            required: true,
        })

        this.parser.add_argument('--op', {
            type: 'str',
            help: `any ONE operation to perform - build, deploy, setDelegate, initOFTFA`,
            required: true,
        })

        this.parser.add_argument('--lz-config', {
            type: 'str',
            help: `path to the layerzeroconfig file`,
            required: true,
        })

        this.parser.add_argument('--move-deploy-script', {
            type: 'str',
            help: `path to the move deploy script`,
            required: false,
        })

        this.parser.add_argument('--named-addresses', {
            type: 'str',
            help: `deployer account address based on your config`,
            required: false,
        })

        this.parser.add_argument('--force-build', {
            type: 'str',
            help: 'Force aptos build even if contracts already built',
            default: 'false',
            choices: ['true', 'false'],
            required: false,
        })

        this.parser.add_argument('--force-deploy', {
            type: 'str',
            help: 'Force aptos deploy even if deployment already exists',
            default: 'false',
            choices: ['true', 'false'],
            required: false,
        })
    }

    validateArgs(args: string[]) {
        let isValid = true
        const missingArgs: string[] = []
        for (const arg of args) {
            if (!this.args[arg]) {
                missingArgs.push(`--${arg}=<value>`)
                isValid = false
            }
        }
        if (!isValid) {
            throw new Error(`The following args are required: ${missingArgs.join(', ')}`)
        }
        return isValid
    }

    async extendOperationFromPath(path: string) {
        // directory name that called this function
        const operation = await import(path)
        const NewOperation = operation.NewOperation
        await this.extendOperation(NewOperation)
    }

    async extendOperation(NewOperation: INewOperation) {
        if (!this.operations[NewOperation.vm]) {
            this.operations[NewOperation.vm] = {}
        }
        if (!this.operations[NewOperation.vm][NewOperation.operation]) {
            this.operations[NewOperation.vm][NewOperation.operation] = {
                func: NewOperation.impl,
                requiredArgs: NewOperation.reqArgs || [],
            }
        }
    }

    async execute(_callFromInheritance: boolean = false) {
        const vm = this.args.vm
        const op = this.args.op

        const exec_op = this.operations[vm][op]
        if (!exec_op) {
            throw new Error(`Operation ${op} is not valid for ${vm}`)
        }
        this.validateArgs(exec_op.requiredArgs)
        await exec_op.func(this.args)
    }
}

const sdk = new AptosEVMCLI()
export { AptosEVMCLI, sdk }
