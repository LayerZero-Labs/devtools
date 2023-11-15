import React from "react"
import { Box, Text } from "ink"
import Spinner from "ink-spinner"
import { UseMutationResult } from "@tanstack/react-query"

type ErrorComponent = React.ComponentType<{ error: unknown }>

interface Props {
    error: ErrorComponent
    message: string
    mutation: Pick<UseMutationResult, "isPending" | "isSuccess" | "error">
}

export const Progress: React.FC<Props> = ({ mutation, message, error: Error }) => {
    const { isPending, isSuccess, error } = mutation

    return (
        <Box flexDirection="column">
            <Box>
                {isPending ? (
                    <Spinner />
                ) : isSuccess ? (
                    <Text color="green">✔</Text>
                ) : error ? (
                    <Text color="red">𐄂</Text>
                ) : (
                    <Text color="yellow">○</Text>
                )}
                <Text> {message}</Text>
            </Box>

            {error == null ? null : (
                <Box marginLeft={2}>
                    <Error error={error} />
                </Box>
            )}
        </Box>
    )
}
