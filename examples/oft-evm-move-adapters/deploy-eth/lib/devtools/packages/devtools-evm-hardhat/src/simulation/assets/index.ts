// Even though it would be nice to just call this file Dockerfile instead of Dockerfile.conf,
// esbuild (or tsup) have issues with specifying loaders for files without extensions.
//
// And since we already have a file with .conf extension,
// we add the same extension to the Dockerfile to use the same d.ts file and the same loader
export { default as dockerfile } from './Dockerfile.conf'
export { default as nginxConf } from './nginx.conf'
