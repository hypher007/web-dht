function Reactor(){
  this._triggers = {};
}

function Trigger(task){
  this.task = task;
}

Reactor.prototype.activate = function(peer){
  if(!this._triggers.hasOwnProperty(peer))
    return false;
  var trigger = this._triggers[peer];

  trigger.task(peer);
  delete this._triggers[peer]; // It is important to remove this to avoid cycling.
  
  return true;
};

Reactor.prototype.setTrigger = function(peer, task){
  var trigger = new Trigger(task);
  this._triggers[peer] = trigger;
};