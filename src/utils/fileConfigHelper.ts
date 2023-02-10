import fs from "fs";

export const GNOSIS_CONFIG_FILENAME = "lz.gnosis.json";
export const UA_CONFIG_FILENAME = "lz.ua-config.json";
export const UA_DEPLOYMENT_FILENAME = "lz.ua-deployment.json";

export const configExist = (fileName: string) => fs.existsSync(fileName);

export const getConfig = (fileName: string) => JSON.parse(fs.readFileSync(fileName, "utf-8"));