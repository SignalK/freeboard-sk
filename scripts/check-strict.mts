// Type-checks the folders listed in tsconfig.strict.json with
// strictNullChecks and strictPropertyInitialization, and fails on any error
// in them.
//
// TypeScript has no per-file strict switch, and `tsc -p tsconfig.strict.json`
// would also report every error in the non-strict files the listed ones
// import. So this checks the whole program under the strict options but only
// reports diagnostics for the files the tsconfig's `include` matches.
//
// Used by `npm run typecheck:strict`, part of `build:all`.

import { dirname, resolve } from 'node:path';
import ts from 'typescript';

const CONFIG = resolve('tsconfig.strict.json');

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => ts.sys.newLine
};

const report = (diagnostics: readonly ts.Diagnostic[]): number => {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost)
  );
  console.error(
    `[check-strict] ${diagnostics.length} error(s) in strict folders.`
  );
  return 1;
};

const check = (): number => {
  const { config, error } = ts.readConfigFile(CONFIG, ts.sys.readFile);
  if (error) return report([error]);

  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, dirname(CONFIG));
  if (parsed.errors.length > 0) return report(parsed.errors);

  // A mistyped entry would match no files and pass without checking anything.
  const entries: string[] = config.include;
  const empty = entries.filter(
    (entry) =>
      ts.parseJsonConfigFileContent(
        { ...config, include: [entry] },
        ts.sys,
        dirname(CONFIG)
      ).fileNames.length === 0
  );
  if (empty.length > 0) {
    console.error(`[check-strict] No TypeScript files in: ${empty.join(', ')}`);
    return 1;
  }

  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const diagnostics = [
    ...program.getOptionsDiagnostics(),
    ...program.getGlobalDiagnostics(),
    ...parsed.fileNames.flatMap((fileName) => {
      const sourceFile = program.getSourceFile(fileName);
      return sourceFile
        ? [
            ...program.getSyntacticDiagnostics(sourceFile),
            ...program.getSemanticDiagnostics(sourceFile)
          ]
        : [];
    })
  ];
  if (diagnostics.length > 0) return report(diagnostics);

  console.log(
    `[check-strict] ${parsed.fileNames.length} file(s) in strict folders pass.`
  );
  return 0;
};

// Not process.exit(): it can cut off a long error list still being written
// to a pipe, as in CI.
process.exitCode = check();
