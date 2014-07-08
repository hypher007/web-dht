function Router (){
  this.peer = null;
  this.table = {};
}

Router.prototype.initialize = function(peer){
  this.peer = peer;
};

Router.prototype._getConnection = function(peerId){
  if(this.peer.connections[peerId] && this.peer.connections[peerId].length > 0){
    for(var con in this.peer.connections[peerId]){
      if(this.peer.connections[peerId][con].open){
        return this.peer.connections[peerId][con];
      }
      // return this.peer.connections[peerId][con];
    }
  }
  return null;
};

Router.prototype.myConnections = function(){
  var activeConnections = [];
  for(var peerId in this.peer.connections){
    for(var connection in this.peer.connections[peerId]){
      if(this.peer.connections[peerId][connection].open){
        activeConnections.push(peerId);
        break;
      }
    }
  }
  return activeConnections;
};

Router.prototype.updateRoutes = function(source, routes){
  for(var i in routes)
    this.addRoute(source, routes[i]);
};

Router.prototype.addRoute = function(peer, newPeer){
  var add = true;
  if(!this.table[peer])
    this.table[peer] = new Array();
  if(this.table[peer].indexOf(newPeer) !== -1)
    add = false;
  if(add)
    this.table[peer].push(newPeer);
};

Router.prototype.getRoutes = function(peer){
  return this.table[peer];
};

Router.prototype.filterConnections = function(connections, remove){
  return connections.filter(function(i){
    return remove.indexOf(i) < 0;
  });
};

/* Low-level transmission/communication tasks */

Router.prototype.unicast = function(peer, message){
  var conn = this._getConnection(peer);
  if(!conn)
    return false;
  conn.send(message);
  return true;
};