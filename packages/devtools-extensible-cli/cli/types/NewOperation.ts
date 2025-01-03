import { ArgumentOptions } from 'argparse'

type NewArg = {
    name: string
    arg: ArgumentOptions
}

export interface INewOperation {
    vm: string
    operation: string
    reqArgs?: string[]
    addArgs?: NewArg[]

    impl: (args: any) => Promise<void>
}

export type Operation = {
    [key: string]: {
        [key: string]: {
            func: (...args: any[]) => Promise<void>
            requiredArgs: string[]
        }
    }
}
