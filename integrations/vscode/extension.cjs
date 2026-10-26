const vscode=require('vscode');
const path=require('node:path');
exports.activate=context=>{
  for(const [id,command] of [['setup','workspace'],['status','workspace'],['team','team'],['workspace','workspace']]) context.subscriptions.push(vscode.commands.registerCommand(`borshkit.${id}`,async()=>{
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

const fs=require('node:fs/promises');
const {pathToFileURL}=require('node:url');
const {NativeSession}=require('./native.cjs');
const activateBase=exports.activate;
exports.activate=context=>{
  activateBase(context);
  let session=null,requestFile=null,currentRequest=null;
  const output=vscode.window.createOutputChannel('Borshkit — нативные работы');context.subscriptions.push(output);
  context.subscriptions.push({dispose(){session?.dispose();}});
  context.subscriptions.push(vscode.commands.registerCommand('borshkit.nativeStart',async()=>{
    if(!vscode.workspace.isTrusted)throw Error('Для запуска нужен доверенный проект');
    if(session&&!['CANCELLED','OUTPUT_RECEIVED_UNVERIFIED','HARNESS_COMPLETED_UNVERIFIED','FAILED_OR_UNKNOWN'].includes(session.state)){
      const marker=await fs.readFile(path.resolve(path.dirname(requestFile),'../../tasks',currentRequest.taskId,'native-active.json'),'utf8').then(JSON.parse,e=>{if(e.code==='ENOENT')return null;throw e;});
      if(marker?.digest===currentRequest.digest)throw Error('Нативная работа уже запущена; останови её в среде и выполни интеграция finish');
      session.dispose();session=null;
    }
    const files=await vscode.window.showOpenDialog({canSelectMany:false,filters:{'Запрос Borshkit':['json']},title:'Запрос из borshkit интеграция prepare'});if(!files?.length)return;
    const selectedFile=files[0].fsPath;requestFile=selectedFile;
    const native=await import(pathToFileURL(path.join(context.extensionPath,'runtime','core','native.mjs')).href);
    const request=await native.validateNativeRequest(selectedFile);
    const folders=vscode.workspace.workspaceFolders??[];
    if(folders.length!==1||await fs.realpath(folders[0].uri.fsPath)!==await fs.realpath(request.cwd))throw Error(`Открой отдельную копию задачи как единственную папку VS Code: ${request.cwd}`);
    const consent=await vscode.window.showWarningMessage(`Запустить ${request.host} для ${request.taskId}? Возможен расход подписки. Roo/Cline используют свои настройки инструментов. Cline может переключить текущую работу — сначала проверь его окно. Ответ не является приёмкой.`,{modal:true},'Запустить');if(consent!=='Запустить')return;
    let api=null,model=null;
    if(request.host==='copilot'){
      if(!vscode.lm?.selectChatModels)throw Error('Эта версия VS Code не предоставляет Language Model API');
      const models=await vscode.lm.selectChatModels({vendor:'copilot'});
      const choice=await vscode.window.showQuickPick(models.map(m=>({label:m.name,description:m.id,model:m})),{title:'Выбери точную модель Copilot'});if(!choice)return;model=choice.model;
    }else{
      const id=request.host==='roo'?'RooVeterinaryInc.roo-cline':'saoudrizwan.claude-dev';
      const extension=vscode.extensions.getExtension(id);if(!extension)throw Error(`Не установлено расширение ${id}`);
      api=await extension.activate();
      output.appendLine(`Среда ${id}, версия ${extension.packageJSON.version}`);
    }
    await native.claimNativeRequest(selectedFile);currentRequest=request;
    session?.dispose();session=new NativeSession(request.host,api,{vscode,model,timeoutMs:1800000});
    const record=status=>{output.appendLine(JSON.stringify(status));void fs.writeFile(selectedFile+'.status.json',JSON.stringify({...status,requestDigest:request.digest,at:new Date().toISOString()},null,2),{mode:0o600}).catch(e=>output.appendLine(e.message));};
    session.on('status',record);output.show();
    const result=await session.start(request.prompt);record(result);
    if(result.output)await fs.writeFile(selectedFile+'.answer.txt',result.output,{mode:0o600});
    vscode.window.showInformationMessage('Запрос передан среде. Для приёмки запусти проверки Borshkit на результате.');
  }));
  context.subscriptions.push(vscode.commands.registerCommand('borshkit.nativeCancel',async()=>{if(!session)throw Error('Нет нативной работы в этом окне');await session.cancel();}));
  context.subscriptions.push(vscode.commands.registerCommand('borshkit.nativeStatus',()=>{output.appendLine(JSON.stringify(session?.status()??{state:'NONE'}));output.show();}));
};
