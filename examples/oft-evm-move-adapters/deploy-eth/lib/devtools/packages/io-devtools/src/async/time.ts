/**
 * Returns a promise that resolves after the specified number of milliseconds
 *
 * @param {number} timeout Nap time in milliseconds
 * @returns {Promise<void>}
 */
export const sleep = (timeout: number): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, timeout))
