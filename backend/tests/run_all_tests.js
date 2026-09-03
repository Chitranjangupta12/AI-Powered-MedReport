/**
 * Unified Test Runner
 */

const Mocha = require('mocha');
const path = require('path');

const mocha = new Mocha({
  timeout: 20000,
  reporter: 'spec'
});

const testFiles = [
  'unit_extraction.test.js',
  'unit_analyzer.test.js',
  'unit_safety.test.js',
  'unit_voice_multilingual.test.js',
  'unit_agentic_rag.test.js',
  'unit_multimodal_angiogram.test.js',
  'unit_generic_multimodal.test.js',
  'integration_api.test.js'
];

testFiles.forEach(file => {
  mocha.addFile(path.join(__dirname, file));
});

mocha.run(failures => {
  process.exitCode = failures ? 1 : 0;
});
