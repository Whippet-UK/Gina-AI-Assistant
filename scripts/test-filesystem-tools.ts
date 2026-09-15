import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { FilesystemToolset } from '../server/agent/FilesystemToolset';

async function main() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gina-fs-tools-'));
  const tools = new FilesystemToolset(root);
  const file = 'sample.ts';
  try {
    await tools.createDirectory('src');
    await tools.writeFile('src/sample.ts', 'const value = 1;\n');
    const read = await tools.readTextFile('src/sample.ts');
    if (!read.content.includes('const value = 1')) throw new Error('read_text_file failed');

    const dry = await tools.editFile('src/sample.ts', [{ oldText: 'const value = 1;', newText: 'const value = 2;' }], true);
    if (!dry.dryRun || dry.applied || !dry.changed || !dry.diff.includes('+const value = 2;')) throw new Error('edit_file dry-run failed');

    const edit = await tools.editFile('src/sample.ts', [{ oldText: 'const value = 1;', newText: 'const value = 2;' }], false);
    if (!edit.applied || !edit.changed) throw new Error('edit_file apply failed');

    const multiple = await tools.readMultipleFiles(['src/sample.ts', 'missing.ts']);
    if (multiple.results.length !== 2 || !multiple.results[0].ok || multiple.results[1].ok) throw new Error('read_multiple_files failed');

    const found = await tools.searchFiles('.', '*.ts');
    if (!found.results.some((p:string) => p.endsWith(path.join('src', 'sample.ts')))) throw new Error('search_files failed');

    const info = await tools.getFileInfo('src/sample.ts');
    if (info.type !== 'file') throw new Error('get_file_info failed');

    const listing = await tools.listDirectory('src', true, 'name');
    if (!listing.entries.some((e:any) => e.name === 'sample.ts')) throw new Error('list_directory_with_sizes failed');

    await tools.moveFile('src/sample.ts', 'src/sample-renamed.ts');
    const moved = await tools.readTextFile('src/sample-renamed.ts');
    if (!moved.content.includes('const value = 2')) throw new Error('move_file failed');

    const tree = await tools.directoryTree('.');
    if (!JSON.stringify(tree).includes('sample-renamed.ts')) throw new Error('directory_tree failed');

    const allowed = tools.listAllowedDirectories();
    if (!allowed.directories.includes(root)) throw new Error('list_allowed_directories failed');

    await fs.writeFile(path.join(root, file), 'outside should remain isolated');
    try { await tools.readTextFile('../gina-fs-tools-escape.txt'); throw new Error('path traversal was not blocked'); } catch (error:any) {
      if (!/outside the allowed Gina root|Path escapes configured Gina root/i.test(error?.message || '')) throw error;
    }

    console.log(JSON.stringify({ ok:true, root, tested:['read_text_file','write_file','edit_file','read_multiple_files','search_files','get_file_info','list_directory_with_sizes','move_file','directory_tree','list_allowed_directories','path_traversal_block'] }, null, 2));
  } finally {
    await fs.rm(root, { recursive:true, force:true });
  }
}

main().catch(error => { console.error(error?.stack || error); process.exit(1); });
