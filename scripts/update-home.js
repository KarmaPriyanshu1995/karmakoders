// Run the TS file bypassing PowerShell JSON parsing errors
require('ts-node').register({
  compilerOptions: {
    module: 'CommonJS'
  }
});
require('./update-home-sections.ts');
