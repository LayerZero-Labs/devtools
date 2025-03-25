import { INewOperation } from '../types/NewOperation'

class InitOperation implements INewOperation {
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
        }
    ]

    async impl(args: any): Promise<void> {
        console.log('\n Operation Help:\n')
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

const initOperation = new InitOperation()
export { initOperation }
