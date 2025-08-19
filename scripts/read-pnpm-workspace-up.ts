import { findUp } from 'find-up-simple';
import fsPromises from 'fs/promises';
import path from 'path';
import * as yaml from 'yaml';

interface PnpmCatalog {
  readonly [packageName: string]: string;
}

interface PnpmNamedCatalogs {
  readonly [catalogName: string]: PnpmCatalog;
}

interface PnpmWorkspace {
  readonly catalog?: PnpmCatalog;
  readonly catalogs?: PnpmNamedCatalogs;
}

async function readPnpmWorkspace({ cwd }: { cwd: string }) {
  const workspaceFilePath = path.resolve(cwd, 'pnpm-workspace.yaml');
  const content = await fsPromises.readFile(workspaceFilePath, 'utf8');
  const data = yaml.parse(content);
  return data as PnpmWorkspace;
}

export async function readPnpmWorkspaceUp(options: { cwd?: URL | string }) {
  const filePath = await findUp('pnpm-workspace.yaml', options);
  if (!filePath) {
    return;
  }

  return {
    pnpmWorkspace: await readPnpmWorkspace({ cwd: path.dirname(filePath) }),
    path: filePath,
  };
}
