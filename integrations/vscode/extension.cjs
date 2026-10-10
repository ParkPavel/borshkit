const vscode=require('vscode');
const path=require('node:path');
exports.activate=context=>{
  for(const [id,command] of [['setup','setup'],['status','status'],['team','team']]) context.subscriptions.push(vscode.commands.registerCommand(`borshkit.${id}`,async()=>{
    if(!vscode.workspace.isTrusted)throw Error('Для исполнения нужен доверенный проект VS Code');
    const folders=vscode.workspace.workspaceFolders??[];
    const folder=folders.length===1?folders[0]:await vscode.window.showWorkspaceFolderPick();if(!folder)return;
    const cli=path.join(context.extensionPath,'runtime','bin','borshkit.mjs');
    const node=vscode.workspace.getConfiguration('borshkit',folder.uri).get('nodePath','node');
    const task=new vscode.Task({type:'borshkit',command},folder,`Borshkit ${command}`,'Borshkit',new vscode.ProcessExecution(node,[cli,command],{cwd:folder.uri.fsPath}));
    task.presentationOptions={reveal:vscode.TaskRevealKind.Always,panel:vscode.TaskPanelKind.Shared};
    await vscode.tasks.executeTask(task);
  }));
};
