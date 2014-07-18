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

Router.prototype.updateRoutesOf = function(peer, neighbors){
  for(var i in neighbors)
    this.addRouteTo(peer, neighbors[i]);
};

Router.prototype.addRouteTo = function(peer, newPeer){
  this.createRoute(peer);
  if(this.table[peer].indexOf(newPeer) > -1) // already in the array
    return false;
  if(newPeer === this.peer.id) // do not add this peer's id
    return false;
  this.table[peer].push(newPeer);
  // all good...
  return true;
};

Router.prototype.createRoute = function(peer){
  if(!this.table[peer])
    this.table[peer] = new Array();
};

Router.prototype.removeRoute = function(peer){
  if(!this.table[peer])
    return false;
  
  while(this.table[peer].length > 0)
    this.table[peer].pop();
  delete this.table[peer];
  
  while(this.peer.connections[peer].length > 0)
    this.peer.connections[peer].pop();
  delete this.peer.connections[peer];
  
  return true;
};

Router.prototype.removeRouteFromAny = function(peerToRemove){
  var routes;
  for(var index in this.table){
    routes = this.table[index];
    if(!routes.length)
      continue;
    for(var i = routes.length - 1; i >= 0; i--){
      if (routes[i] === peerToRemove)
        routes.splice(i, 1);
    }
  }
};

Router.prototype.getRoutesOf = function(peer){
  return this.table[peer];
};

Router.prototype.getLookAheadRoutes = function(){
  var a = new Array();
  for(var i in this.table){
    a = a.concat(this.table[i]);
  }
  for(var i = 0; i < a.length; ++i) {
    for(var j = i + 1; j < a.length; ++j) {
      if(a[i] === a[j])
        a.splice(j--, 1);
    }
  }
  return a;
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

Router.prototype.multicast = function(peers, message){
  var peerTo;
  for(var i = 0; i < peers.length; i ++){
    peerTo = peers[i];
    message.peerTo = peerTo;
    this.unicast(peerTo, message);
  }
};