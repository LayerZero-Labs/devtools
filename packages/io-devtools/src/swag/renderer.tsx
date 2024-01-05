import React from "react";
import { ProgressBar, ProgressBarProps } from "./components/progress";

/**
 * Creates a ProgressBar React node.
 *
 * This is so that the consumers don't need to use JSX and/or React.createElement
 * and so that we can pass this node to e.g. instance.rerender() if a rendered ink component
 *
 * ```typescript
 * import { createProgressBar, render } from '@layerzerolabs/io-devtools/swag'
 *
 * const instance = render(createProgressBar())
 *
 * instance.rerender(createProgressBar({ progress: 0.5 }))
 * instance.clear()
 * ```
 *
 * @param {ProgressBarProps} props
 * @returns {React.ReactElement<ProgressBarProps>}
 */
export const createProgressBar = (
  props: ProgressBarProps = {},
): React.ReactElement<ProgressBarProps> => <ProgressBar {...props} />;

/**
 * Re-export the render from ink so that we can use it without importing directly from ink
 */
export { render } from "ink";
