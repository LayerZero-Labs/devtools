import { Either } from 'fp-ts/lib/Either'

export interface OutputFile {
    path: string
    content: string
}

export type CodeGenerator = (deploymentFilePaths: string[]) => Either<Error, OutputFile[]>
