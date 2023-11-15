import { Config } from "@/types.js"
import { rm } from "fs/promises"
import tiged from "tiged"

export const cloneExample = async ({ example, destination }: Config) => {
    const qualifier = example.directory ? `${example.repository}/${example.directory}` : example.repository
    const emitter = tiged(qualifier, {
        disableCache: true,
        mode: "git",
        verbose: true,
    })

    try {
        return await emitter.clone(destination)
    } catch (error: unknown) {
        try {
            // Let's make sure to clean up after us
            await rm(destination, { recursive: true, force: true })
        } catch {
            // If the cleanup fails let's just do nothing for now
        }

        if (error instanceof Error && "code" in error) {
            switch (error.code) {
                case "DEST_NOT_EMPTY":
                    throw new DestinationNotEmptyError()

                case "ENOENT":
                case "MISSING_REF":
                    throw new MissingGitRefError()

                case "COULD_NOT_DOWNLOAD":
                    throw new DownloadError()
            }
        }

        throw new CloningError()
    }
}

export class CloningError extends Error {
    constructor(message: string = "Unknown error during example cloning") {
        super(message)
    }
}

export class DestinationNotEmptyError extends CloningError {
    constructor(message: string = "Project destination directory is not empty") {
        super(message)
    }
}

export class MissingGitRefError extends CloningError {
    constructor(message: string = "Could not find the example repository or branch") {
        super(message)
    }
}

export class DownloadError extends CloningError {
    constructor(message: string = "Could not download the example from repository") {
        super(message)
    }
}
