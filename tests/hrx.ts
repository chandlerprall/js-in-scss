import { readFileSync } from 'fs';
import MemoryFileSystem from 'memory-fs';
import { join } from 'path';

export function buildFs(specName: string) {
    const specPath = join(__dirname, 'scss-spec', specName);
    const hrx = readFileSync(specPath).toString();
    const files = hrx.split(/<===> /g).filter(src => src.length);

    const fs = new MemoryFileSystem();

    for (let i = 0; i < files.length; i++) {
        const [filename, ...contents] = files[i].split(/[\r\n]+/);
        fs.writeFileSync('/' + filename, contents.join('\n'));
    }

    return fs;
}