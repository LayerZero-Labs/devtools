import { useCallback, useRef, useState } from 'react'

/**
 * TaskState holds three different states of a task:
 *
 * - Pending state
 * - Success state
 * - Failure state
 */
export type TaskState<T> =
    | {
          loading: true
          success?: never
          failure?: never
          data?: never
          error?: never
      }
    | {
          loading?: false
          success: true
          failure?: false
          data: T
          error?: never
      }
    | {
          loading?: false
          success?: false
          failure: true
          data?: never
          error: unknown
      }

/**
 * Poor person's version of react-query
 *
 * Handles state management of a promise run just like useMutation() from react-query,
 * just with one less package and a bit less sophisticated reference checking mechanism
 * (especially the part where it expect the component that uses this not to unmount or change the task
 * at runtime)
 *
 * @param {() => Promise<T>} task
 * @returns
 */
export const useTask = <T>(task: () => Promise<T>) => {
    const [state, setState] = useState<TaskState<T>>()

    // We'll keep the task in a reference so that we don't force the users to pass in memoized objects
    const taskRef = useRef(task)
    taskRef.current = task

    const run = useCallback(() => {
        // Set state to loading
        setState({ loading: true })

        return taskRef.current().then(
            // Set state to success
            (data) => {
                return setState({ success: true, data }), Promise.resolve(data)
            },
            // Set state to failure
            (error) => {
                return setState({ failure: true, error }), Promise.reject(error)
            }
        )
    }, [taskRef])

    return { run, state }
}
