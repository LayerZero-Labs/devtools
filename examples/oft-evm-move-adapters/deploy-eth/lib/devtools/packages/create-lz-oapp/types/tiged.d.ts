declare module 'tiged' {
    import EventEmitter from 'events'

    export type TigedMode = 'git' | 'tar'

    export interface TigedOptions {
        disableCache?: boolean
        force?: boolean
        verbose?: boolean
        mode?: TigedMode
    }

    export interface TigedEmitter extends EventEmitter {
        clone(destination: string): Promise<void>
    }

    const tiged: (repository: string, options: TigedOptions) => TigedEmitter

    export default tiged
}
