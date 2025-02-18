import { createModuleLogger } from '@layerzerolabs/io-devtools'
import {
    beginCell,
    Cell,
    loadMessage,
    loadMessageRelaxed,
    type Message,
    storeMessage,
    storeMessageRelaxed,
    type MessageRelaxed,
} from '@ton/core'

/**
 * Serializes a Message object into a string that can be passed to OmniTransaction data
 *
 * @param {Message} message
 * @returns {string} Base64 serialized message string
 */
export const serializeMessage = (message: Message): string =>
    beginCell().store(storeMessage(message)).endCell().toBoc().toString('base64')

/**
 * Serializes a MessageRelaxed object into a string that can be passed to OmniTransaction data
 *
 * @param {MessageRelaxed} message
 * @returns {string} Base64 serialized message string
 */
export const serializeMessageRelaxed = (message: MessageRelaxed): string =>
    messageRelaxedToCell(message).toBoc().toString('base64')

/**
 * Serializes a MessageRelaxed array into a string that can be passed to OmniTransaction data
 *
 * @param {MessageRelaxed[]} messages
 * @returns {string} Base64 serialized message string
 */
export const serializeMessagesRelaxed = (messages: MessageRelaxed[]): string =>
    messages.map((msg) => messageRelaxedToCell(msg).toBoc().toString('base64')).join(',') //comma is a safe separator for base64

/**
 * Deserializes a Message object from Base64 serialized representation
 *
 * @param {string} data
 * @returns {Message}
 */
export const deserializeMessage = (data: string): Message => loadMessage(Cell.fromBase64(data).beginParse())

/**
 * Deserializes a MessageRelaxed object from Base64 serialized representation
 *
 * @param {string} data
 * @returns {MessageRelaxed}
 */
export const deserializeMessageRelaxed = (data: string): MessageRelaxed =>
    loadMessageRelaxed(Cell.fromBase64(data).beginParse())

/**
 * Deserializes a MessageRelaxed array from Base64 serialized representation
 *
 * @param {string} data
 * @returns {MessageRelaxed[]}
 */
export const deserializeMessagesRelaxed = (data: string): MessageRelaxed[] =>
    data.split(',').map((datum) => loadMessageRelaxed(Cell.fromBase64(datum).beginParse()))

/**
 * Tries to deserialize Base64 serialized data into a Message or MessageRelaxed object
 *
 * @param {string} data
 * @returns {Message | MessageRelaxed}
 */
export const deserialize = (data: string): Message | MessageRelaxed => {
    const logger = createModuleLogger(`devtools-ton/transactions/serde:deserialize`)

    try {
        return deserializeMessageRelaxed(data)
    } catch (errorMessageRelaxed) {
        logger.verbose(`Failed to deserialize data as MessageRelaxed, trying Message: ${errorMessageRelaxed}`)

        try {
            return deserializeMessage(data)
        } catch (errorMessage) {
            logger.verbose(`Failed to deserialize data as Message: ${errorMessageRelaxed}`)

            throw new Error(
                `Failed to deserialize data.\n\nDeserializing as MessageRelaxed:\n\n${errorMessageRelaxed}\n\nDeserializing as Message:\n\n${errorMessage}`
            )
        }
    }
}

/**
 * Helper function for partial serialization,
 * mostly to work around jest expectation issues with Message equality
 *
 * @param {Message} message
 * @returns {Cell}
 */
export const messageToCell = (message: Message): Cell => beginCell().store(storeMessage(message)).endCell()

/**
 * Helper function for partial serialization,
 * mostly to work around jest expectation issues with MessageRelaxed equality
 *
 * @param {MessageRelaxed} message
 * @returns {Cell}
 */
export const messageRelaxedToCell = (message: MessageRelaxed): Cell =>
    beginCell().store(storeMessageRelaxed(message)).endCell()
