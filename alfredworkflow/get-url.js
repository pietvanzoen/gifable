// Fetches the URL for a given gif path

const prop = process.argv[2];
const key = process.argv[3];

const MANIFEST_PATH = `${process.env.alfred_workflow_cache}/manifest.json`;

const manifest = require(MANIFEST_PATH);

console.log(manifest[key][prop]);
