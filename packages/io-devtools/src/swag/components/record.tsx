import { Box, Text } from "ink";
import React from "react";
import type { PrimitiveValue } from "./types";

export type RecordData = Record<string, PrimitiveValue>;

export const RecordList: React.FC<{ data: RecordData[]; columns?: number }> = ({
  data = [],
  columns,
}) => {
  return (
    <>
      {data.map((row, index) => (
        <Record data={row} columns={columns} key={index} />
      ))}
    </>
  );
};

export const Record: React.FC<{ data: RecordData; columns?: number }> = ({
  data = {},
  columns = process.stdout.columns ?? 80,
}) => {
  const padding = 1;
  const labels = Object.keys(data);
  const labelLengths = labels.map(({ length }) => length);
  const maxLabelLength = Math.max(1, ...labelLengths);
  const labelColumnWidth = maxLabelLength + 2 * padding;
  const valueColumnWidth = Math.max(10, columns - labelColumnWidth);

  return (
    <Box
      flexDirection="column"
      borderColor="grey"
      borderStyle="single"
      paddingX={1}
    >
      {Object.entries(data).map(([key, value]) => {
        return (
          <Box key={key}>
            <Box width={labelColumnWidth}>
              <Text bold wrap="truncate" color="magenta">
                {key}
              </Text>
            </Box>

            <Box width={valueColumnWidth}>
              {value == null ? (
                <Text wrap="wrap" color="gray">
                  -
                </Text>
              ) : (
                <Text wrap="wrap">{String(value)}</Text>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
