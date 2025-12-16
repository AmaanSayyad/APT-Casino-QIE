const babelJest = require('babel-jest');
const path = require('path');

module.exports = babelJest.createTransformer({
  configFile: path.resolve(__dirname, 'babel.config.jest.js'),
});

