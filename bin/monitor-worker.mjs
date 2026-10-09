import { openSpace } from '../core/space.mjs';
import { runMonitor } from '../core/monitor.mjs';
const [project,folder,options]=process.argv.slice(2);
await runMonitor(await openSpace(project,{folder}),JSON.parse(options));
