import { Box, Text } from "ink";
import Gradient from "ink-gradient";
import React from "react";

export interface ProgressBarProps {
  /**
   * Progress of the task, between [0-1]
   */
  progress?: number;
  /**
   * Text to appear before the progressbar
   */
  before?: string;
  /**
   * Text to appear after the progressbar
   */
  after?: string;
  /**
   * Number of available columns
   */
  columns?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  columns = process.stdout.columns ?? 80,
  progress = 0,
  before = "",
  after = "",
}) => {
  // First we calculate the available space
  const padding = before.length + after.length;
  const space = Math.max(0, columns - padding);

  // Then we clamp the progress, just in case
  const clampedProgress = Math.max(0, Math.min(1, progress));

  // Then we calculate the amount of characters we need and put them together
  const numChars = Math.min(Math.floor(space * clampedProgress), space);
  const chars = CHARACTER.repeat(numChars);

  // Then we calculate the amount of "empty" characters we need and put them together
  const numEmptyChars = space - numChars;
  const emptyChars = EMPTY_CHARACTER.repeat(numEmptyChars);

  return (
    <Box>
      <Text>{before}</Text>

      <Box alignItems="center">
        <Gradient name="rainbow">
          <Text>{chars}</Text>
        </Gradient>

        <Text>{emptyChars}</Text>
      </Box>

      <Text>{after}</Text>
    </Box>
  );
};

const CHARACTER = "█";
const EMPTY_CHARACTER = "░";
