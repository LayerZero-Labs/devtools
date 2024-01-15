import React from "react";
import { render } from "ink";
import { Logo } from "./components/logo";
import { Record, RecordList, type RecordData } from "./components/record";
import { Table, type TableRow } from "./components/table";

export const printLogo = () => render(<Logo />).unmount();

export const printRecord = (data: RecordData) =>
  render(<Record data={data} />).unmount();

export const printRecords = (data: RecordData[]) =>
  render(<RecordList data={data} />).unmount();

export const printTable = (data: TableRow[]) =>
  render(<Table data={data} />).unmount();
