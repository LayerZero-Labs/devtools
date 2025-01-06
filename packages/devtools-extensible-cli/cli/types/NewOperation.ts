import { ArgumentOptions } from 'argparse'

type NewArg = {
    name: string
    arg: ArgumentOptions
}

export type Operation = {
    [key: string]: {
        [key: string]: {
            func: (...args: any[]) => Promise<void>
            requiredArgs: string[]
            description: string
        }
    }
}

export interface INewOperation {
    vm: string
    operation: string
    description: string
    reqArgs?: string[]
    addArgs?: NewArg[]

    impl: (args: any) => Promise<void>
}
