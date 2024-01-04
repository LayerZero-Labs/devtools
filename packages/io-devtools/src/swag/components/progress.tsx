import { Box, Text } from "ink";
import Gradient from "ink-gradient";
import React from "react";

export interface ProgressBarProps {
  /**
   * Progress of the task, between [0-1]
   */
  progress?: number;
  /**
   * Number of characters to leave before the progressbar
   */
  before?: number;
  /**
   * Number of characters to leave after the progressbar
   */
  after?: number;
  /**
   * Number of available columns
   */
  columns?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  columns = process.stdout.columns ?? 80,
  progress = 0,
  before = 0,
  after = 0,
}) => {
  // First we calculate the available space
  const space = Math.max(0, columns - before - after);

  // Then we clamp the progress, just in case
  const clampedProgress = Math.max(0, Math.min(1, progress));

  // Then we calculate the amount of characters we need and put them together
  const numChars = Math.min(Math.floor(space * clampedProgress), space);
  const chars = CHARACTER.repeat(numChars);

  return (
    <Box marginBottom={5} marginTop={5}>
      <Text>{before}</Text>

      <Gradient name="rainbow">
        <Text>{chars}</Text>
      </Gradient>

      <Text>{after}</Text>
    </Box>
  );
};

const CHARACTER = "█";
