import React from "react";
import { render } from "ink";
import { Record, RecordList, type RecordData } from "./components/record";
import { Table, type TableRow } from "./components/table";

export const printLogo = () => {
  const logo = `
    ╭─────────────────────────────────────────╮
    │       ▓▓▓ LayerZero DevTools ▓▓▓        │
    │  ═══════════════════════════════════    │
    │          /*\\                            │
    │         /* *\\     BUILD ANYTHING        │
    │         ('v')                           │
    │        //-=-\\\\    ▶ OMNICHAIN           │
    │        (\\_=_/)                          │
    │         ^^ ^^                           │
    │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
    ╰─────────────────────────────────────────╯
`;

  console.log(logo);
};

/**
 * Renders a horizontal table with rows labeled by object properties:
 *
 * ```
 * printRecord({
 *   Color: 'blue',
 *   Shape: 'weird'
 * })
 * ```
 *
 * |                 |         |
 * | -------------------- | ----------  |
 * | Color                | blue        |
 * | Shape                | weird       |
 *
 * @param {RecordData} data
 * @returns {void}
 */
export const printRecord = (data: RecordData): void =>
  render(<Record data={data} />).unmount();

/**
 * Renders a series of individual boxes, each containing
 * an output of `printRecord`
 *
 * @see {@link printRecord}
 *
 * @param {TableRow} data Array of rows
 * @returns {void}
 */
export const printRecords = (data: RecordData[]): void =>
  render(<RecordList data={data} />).unmount();

/**
 * Renders a standard, vertical table without any row labels:
 *
 * ```
 * printVerticalTable([{
 *  Color: 'blue',
 *  Shape: 'weird'
 * }, {
 *  Color: 'red',
 *  Shape: 'green'
 * }, {
 *  Color: 'green',
 *  Shape: 'circle'
 * }])
 * ```
 *
 * | Color                | Shape       |
 * | -------------------- | ----------  |
 * | blue                 | small       |
 * | red                  | weird       |
 * | green                | circle      |
 *
 * @param {TableRow} data Array of rows
 * @returns {void}
 */
export const printVerticalTable = (data: TableRow[]): void =>
  render(<Table data={data} />).unmount();
