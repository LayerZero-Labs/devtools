import React from "react";
import InkTable from "ink-table";
import type { PrimitiveValue } from "./types";
import { Text } from "ink";

export type TableRow = Record<string | number, PrimitiveValue>;

export const Table: React.FC<{ data: TableRow[] }> = ({ data }) => (
  <InkTable
    data={data as any}
    header={({ children }) => (
      <Text bold color="magenta">
        {children}
      </Text>
    )}
  />
);
