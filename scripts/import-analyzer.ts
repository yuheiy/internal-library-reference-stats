import fsPromises from 'node:fs/promises';
import ts from 'typescript';

export type LineRange = {
  start: number;
  end: number;
};

export type ImportAnalysis = {
  defaultImport: { lineRange: LineRange } | null;
  namedImports: Record<string, { lineRange: LineRange }>;
  namespacedImport: { lineRange: LineRange } | null;
  sideEffectImport: { lineRange: LineRange } | null;
};

/**
 * Analyzes a TypeScript file and extracts import information for a specified module
 */
export async function analyzeModuleImports(filePath: string, targetModuleName: string) {
  const fileContent = await fsPromises.readFile(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, fileContent, ts.ScriptTarget.Latest, true);

  const importAnalysis: ImportAnalysis = {
    defaultImport: null,
    namedImports: {},
    namespacedImport: null,
    sideEffectImport: null,
  };

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier.getText().slice(1, -1); // Remove quotes

      if (moduleSpecifier === targetModuleName) {
        const start = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
        const lineRange: LineRange = { start, end };

        const importClause = node.importClause;

        if (importClause) {
          if (importClause.name && importAnalysis.defaultImport === null) {
            importAnalysis.defaultImport = { lineRange };
          }

          if (importClause.namedBindings) {
            if (
              ts.isNamespaceImport(importClause.namedBindings) &&
              importAnalysis.namespacedImport === null
            ) {
              importAnalysis.namespacedImport = { lineRange };
            } else if (ts.isNamedImports(importClause.namedBindings)) {
              importClause.namedBindings.elements.forEach((element) => {
                const importName = element.propertyName?.text ?? element.name.text;
                if (!(importName in importAnalysis.namedImports)) {
                  importAnalysis.namedImports[importName] = { lineRange };
                }
              });
            }
          }
        } else if (importAnalysis.sideEffectImport === null) {
          importAnalysis.sideEffectImport = { lineRange };
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return importAnalysis;
}
