// This is a quick, up-to-date version of https://www.npmjs.com/package/jest-raw-loader
//
// We need this in order to be able to statically import/embed simulation Dockerfile & nginx.conf
module.exports = {
    process: (content) => ({ code: `module.exports = ${JSON.stringify(content)}` }),
};
