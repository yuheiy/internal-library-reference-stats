import * as prettier from 'prettier';

export async function format(
  source: string | Buffer,
  options: prettier.ResolveConfigOptions & prettier.Options = {},
) {
  const file = options.filepath;
  const config = file ? await prettier.resolveConfig(file, options) : undefined;
  return prettier.format(String(source), {
    ...config,
    ...options,
    filepath: file!,
  });
}
