import fs from "fs";

export const configExist = (fileName: string) => fs.existsSync(fileName);
export const getConfig = (fileName: string) => JSON.parse(fs.readFileSync(fileName, "utf-8"));