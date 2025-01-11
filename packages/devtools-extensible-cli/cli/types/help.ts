import { INewOperation } from './NewOperation'

class HelpOperation implements INewOperation {
    vm = '*'
    operation = 'help'
    description = 'lists all the operations for a given vm'
    reqArgs = ['filter']
    addArgs = [
        {
            name: '--vm',
            arg: {
                help: 'vm to perform operation on',
                required: false,
            },
        },
        {
            name: '--op',
            arg: {
                help: 'operation to perform',
                required: false,
            },
        },
        {
            name: '--filter',
            arg: {
                help: 'filter flags',
                required: false,
            },
        },
        {
            name: '--lz-config',
            arg: {
                help: 'path to the layerzeroconfig file',
                required: false,
            },
        },
        {
            name: '--move-deploy-script',
            arg: {
                help: 'path to the move deploy script',
                required: false,
            },
        },
        {
            name: '--named-addresses',
            arg: {
                help: 'deployer account address based on your config',
                required: false,
            },
        },
        {
            name: '--force-build',
            arg: {
                help: 'Force aptos build even if contracts already built',
                required: false,
            },
        },
        {
            name: '--force-deploy',
            arg: {
                help: 'Force aptos deploy even if deployment already exists',
                required: false,
            },
        },
    ]

    async impl(args: any): Promise<void> {
        console.log('\n Help Operation')
        const ops = args.operations
        const op_names = Object.keys(ops)

        for (const op_name of op_names) {
            const vm_op = ops[op_name]
            const op_functions = Object.keys(vm_op)
            for (const op_function of op_functions) {
                let reqArgs = vm_op[op_function].requiredArgs.join(' --')
                if (reqArgs.length > 0) {
                    reqArgs = '--' + reqArgs
                }
                const reqArgsFormatted = reqArgs.replace(/_/g, '-')
                console.log('--op', op_function, reqArgsFormatted)
                console.log('\tDescription:', vm_op[op_function].description, '\n')
            }
        }
    }
}

const initOperation = new HelpOperation()
export { initOperation }
