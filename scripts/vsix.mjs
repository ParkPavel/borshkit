// Minimal VSIX (stored ZIP) using built-in modules. No npm installation/build hooks.
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT,sha } from '../core/io.mjs';
const pkg=JSON.parse(await fs.readFile(path.join(ROOT,'package.json')));
const entries=[];
async function tree(dir,prefix){for(const n of (await fs.readdir(dir)).sort()){const p=path.join(dir,n),s=await fs.lstat(p);if(s.isDirectory())await tree(p,`${prefix}/${n}`);else if(s.isFile())entries.push([`${prefix}/${n}`,await fs.readFile(p)]);}}
await tree(path.join(ROOT,'integrations','vscode'),'extension');
for(const dir of ['bin','core','roles','packs','skills','assets','library'])await tree(path.join(ROOT,dir),`extension/runtime/${dir}`);
entries.push(['extension/runtime/package.json',Buffer.from(JSON.stringify(pkg))]);
for(const name of ['LICENSE','NOTICE','third-party.json'])entries.push([`extension/runtime/${name}`,await fs.readFile(path.join(ROOT,name))]);
entries.push(['extension/LICENSE',await fs.readFile(path.join(ROOT,'LICENSE'))]);
entries.push(['[Content_Types].xml',Buffer.from('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="json" ContentType="application/json"/><Default Extension="vsixmanifest" ContentType="text/xml"/><Default Extension="cjs" ContentType="text/javascript"/></Types>')]);
entries.push(['extension.vsixmanifest',Buffer.from(`<?xml version="1.0"?><PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011"><Metadata><Identity Language="ru-RU" Id="borshkit-workspace" Version="${pkg.version}" Publisher="borshkit"/><DisplayName>Borshkit</DisplayName><Properties><Property Id="Microsoft.VisualStudio.Code.Engine" Value="^1.90.0"/><Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="workspace"/></Properties><Description xml:space="preserve">Команда и состояние</Description></Metadata><Installation><InstallationTarget Id="Microsoft.VisualStudio.Code"/></Installation><Dependencies/><Assets><Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/></Assets></PackageManifest>`)]);
const crc=bytes=>{let n=0xffffffff;for(const b of bytes){n^=b;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);}return(n^0xffffffff)>>>0;};
const locals=[],central=[];let offset=0;
for(const [name,data] of entries){const n=Buffer.from(name),sum=crc(data),h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(33,12);h.writeUInt32LE(sum,14);h.writeUInt32LE(data.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(n.length,26);locals.push(h,n,data);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(33,14);c.writeUInt32LE(sum,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(n.length,28);c.writeUInt32LE(offset,42);central.push(c,n);offset+=h.length+n.length+data.length;}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
const output=path.resolve(process.argv[2]??`borshkit-${pkg.version}.vsix`), bytes=Buffer.concat([...locals,directory,end]);await fs.writeFile(output,bytes);console.log(JSON.stringify({file:output,files:entries.length,sha256:sha(bytes)}));
