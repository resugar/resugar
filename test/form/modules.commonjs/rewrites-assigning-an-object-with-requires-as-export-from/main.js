// from https://github.com/eslint/eslint/blob/7c56753c8a6c50f7f8a8dab0459191714454cfda/lib/api.js
module.exports = {
  linter: require("./eslint"),
  CLIEngine: require("./cli-engine"),
  RuleTester: require("./testers/rule-tester"),
  SourceCode: require("./util/source-code")
};
