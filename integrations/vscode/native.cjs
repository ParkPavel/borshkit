// Public host APIs only. Unknown capabilities stay unknown; no simulated approval buttons.
const {EventEmitter}=require('node:events');
function limited(operation,ms,onTimeout=()=>{}) {
  let timer;
  return Promise.race([Promise.resolve().then(operation),new Promise((_,reject)=>{timer=setTimeout(()=>{onTimeout();reject(Error('Среда не ответила за отведённое время'));},ms);})]).finally(()=>clearTimeout(timer));
}
class NativeSession extends EventEmitter {
  constructor(host,api,{timeoutMs=30000,vscode=null,model=null}={}) {
    super();this.host=host;this.api=api;this.timeoutMs=timeoutMs;this.vscode=vscode;this.model=model;this.state='IDLE';this.id=null;this.listeners=[];
  }
  status(){return {host:this.host,id:this.id,state:this.state,acceptance:'UNVERIFIED',cancellation:this.host==='cline'?'UNSUPPORTED':'SUPPORTED'};}
  change(state){this.state=state;this.emit('status',this.status());}
  async start(prompt){
    if(this.state!=='IDLE')throw Error('Сеанс уже был запущен; создай новый');
    this.change('STARTING');
    try {
      if(this.host==='copilot'){
        if(!this.model||!this.vscode?.CancellationTokenSource)throw Error('Нет выбранной модели Copilot или Language Model API');
        this.cancelSource=new this.vscode.CancellationTokenSource();
        this.id=this.model.id;
        this.change('RUNNING');
        const output=await limited(async()=>{
          const response=await this.model.sendRequest([this.vscode.LanguageModelChatMessage.User(prompt)],{},this.cancelSource.token);
          let text='';
          for await(const part of response.text){text+=part;if(text.length>256000)throw Error('Ответ модели больше 256000 символов');}
          return text;
        },this.timeoutMs,()=>this.cancelSource.cancel());
        if(this.state==='CANCELLED')return this.status();
        this.output=output;this.change('OUTPUT_RECEIVED_UNVERIFIED');
        return {...this.status(),output};
      }
      if(typeof this.api?.startNewTask!=='function')throw Error('Версия расширения не предоставляет startNewTask');
      if(this.host==='roo') {
        if(typeof this.api.getCurrentTaskStack!=='function'||typeof this.api.on!=='function'||typeof this.api.off!=='function'||typeof this.api.cancelCurrentTask!=='function')throw Error('Неподдерживаемая версия Roo API');
        if(this.api.getCurrentTaskStack().length)throw Error('В Roo уже есть активная работа; сначала заверши её');
        const pending=[];
        for(const [event,state]of [['taskCompleted','HARNESS_COMPLETED_UNVERIFIED'],['taskAborted','CANCELLED']]){
          const handler=id=>{if(this.id===null){if(pending.length<100)pending.push([id,state]);}else if(id===this.id){this.change(state);this.dispose();}};
          this.api.on(event,handler);this.listeners.push([event,handler]);
        }
        this.id=await limited(()=>this.api.startNewTask({text:prompt,newTab:false}),this.timeoutMs);
        if(typeof this.id!=='string'||!this.id)throw Error('Roo не вернул идентификатор работы');
        this.change('RUNNING');
        for(const [id,state]of pending)if(id===this.id){this.change(state);this.dispose();}
      }else if(this.host==='cline')await limited(()=>this.api.startNewTask(prompt),this.timeoutMs);
      else throw Error('Неизвестная нативная среда');
      if(this.host==='cline')this.change('LAUNCHED_STATUS_UNKNOWN');return this.status();
    }catch(error){if(this.state==='CANCELLED')return this.status();this.cancelSource?.cancel();this.change('FAILED_OR_UNKNOWN');this.dispose();throw error;}
  }
  async cancel(){
    if(this.host==='cline')throw Error('Публичный Cline API не предоставляет однозначной отмены. Останови задачу в Cline; приёмка остаётся UNKNOWN.');
    if(this.host==='copilot')this.cancelSource?.cancel();
    else {
      const stack=this.api.getCurrentTaskStack();
      if(!this.id||stack.at(-1)!==this.id)throw Error('Текущая работа Roo изменилась; чужая работа не отменяется');
      await limited(()=>this.api.cancelCurrentTask(),this.timeoutMs);
    }
    this.change('CANCELLED');this.dispose();return this.status();
  }
  dispose(){for(const [event,handler]of this.listeners)this.api.off(event,handler);this.listeners=[];this.cancelSource?.dispose();}
}
module.exports={NativeSession,limited};
