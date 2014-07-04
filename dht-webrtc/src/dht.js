// join the network
// instance of a peer
// configure the peer
// this module is not concerned about connections
// only events and actions
// the peer object will be passed to other modules
// for the storage it will provide
// put and get only
// peer :=: node
// connection =: an active route directly connected to the peer
// route =: any active connection from any node
// do that this DHT suffers from the problem that few nodes
// could be more loaded and there is no actual mechanism to distribute
// the load among the network
function DHT(cb){
  this.callStack = [];
  this.ready = false;
  this.router = new Router();
  this.arithmetic = new Arithmetic();
  this.reactor = new Reactor();
  this.peer = new Peer({ key: 'lwjd5qra8257b9', debug: 2 });
  var _dht = this;
  this.peer.on('open', function(peerId){
    _dht._onPeerCreated(peerId, cb);
  });
};

DHT.prototype._protocols = {
    JOIN: 'JOIN',
 CONNECT: 'CONNECT',
  ROUTES: 'ROUTES',
    PING: 'PING',
     GET: 'GET',
     PUT: 'PUT',
    PASS: 'PASS',
};

/* High-level events */

DHT.prototype._onPeerCreated = function(peerId, cb) {
  this.router.initialize(this.peer); // initialize the router with this peer
  this.peer.on('connection', this._onConnectionReceived);
  this.ready = true;
  cb();
};

DHT.prototype._onConnectionReceived = function (dataConnection){
  this._configureDataConnection(dataConnection);
  // this.replication.redistributeKeys();
  var message = this._buildMessage(dataConnection.peer, this._protocols.ROUTES);
  message.routes = this.router.myConnections();
  this._unicast(dataConnection.peer, message);
};

DHT.prototype._configureDataConnection = function(dataConnection){
  var _dht = this;
  dataConnection.on('data', function(){
    _dht._onDataReceived(data);
  });
  dataConnection.on('close', function(){
    _dht._onDisconnect(dataConnection.peer);
  });
};

DHT.prototype._onDataReceived = function(data){
  var protocol = data.protocol ? data.protocol: 'none';
  console.log('message type ' + protocol);
  switch(protocol){
    case this._protocols.JOIN:
      // a new node wants to join the network
      this._onJoin(data);
      break;
    case this._protocols.CONNECT:
      // a new node has joined
    	this._onConnect(data);
      break;
    case this._protocols.PING:
      break;
    case this._protocols.ROUTES:
      // dissemination of routes from neighbors
      this._onRoutes(message);
      break;
    case this._protocols.GET:
      // retrieve a key-value pair
      break;
    case this._protocols.PUT:
      // store a key-value pair
      break;
    case this._protocols.PASS:
      // route/pass a message across the network
      break;
  }
};

/* Wrapper for connecting to another peer */

DHT.prototype._connect = function(newPeer, connections){
  if(connections.indexOf(newPeer) > -1)
    return false;
  this._setConnectTrigger(newPeer, connections);
  var dataConnection = this.peer.connect(newPeer);
  this._configureDataConnection(dataConnection);
  return true;
};

DHT.prototype._setConnectTrigger = function(newPeer, connections){
  var _dht = this;
  this.reactor.setTrigger(newPeer, function(){
    var message = _dht._buildMessage(newPeer, _dht._protocols.ROUTES);
    message.routes = connections;
    _dht._unicast(newPeer, message);
  });
};

DHT.prototype._setJoinTrigger = function(knownPeer){
  var _dht = this;
  this.reactor.setTrigger(knownPeer, function(){
    var message = _dht._buildMessage(knownPeer, _dht._protocols.JOIN);
    message.newPeer = _dht.peer.id;
    _dht._unicast(knownPeer, message);
  });
};

/* Perhaps this function can be moved to the router. */

/* Protocol events */

DHT.prototype._onConnect = function(message){
  var newPeer = message.newPeer;
  var connections = this.router.myConnections();
  this._connect(newPeer, connections);
};

DHT.prototype._onJoin = function(message){
  if(message.trace.length > 64)
    return false;
  var newPeer = message.newPeer;
  var myConnections = this.router.filterConnections(this.router.myConnections(), message.trace);
  var nearest = this.arithmetic.findNearest(newPeer, myConnections.concat([this.peer.id]));
  if(this.peer.id === nearest){
    this._connect(newPeer, myConnections);
    this._attachEnd(newPeer, myConnections);
    return true;
  }
  message.peerTo = nearest;
  message.peerFrom = this.peer.id;
  message.trace.push(this.peer.id);
  this._unicast(nearest, message);
  return false;
};

DHT.prototype._attachEnd = function (newPeer, connections){
  // Connect to the new peer from the other side.
  var possiblePeers = new Array();
  for(var i in connections){
    if(this.arithmetic.checkBetween(this.peer.id, peerTo, connections[i]))
      possiblePeers.push(connections[i]);
  }
  if(possiblePeers.length === 0) return false;
  var nearest = this.arithmetic.findNearest(newPeer, possiblePeers);
  if(nearest){
    var message = this._buildMessage(nearest, this._protocols.CONNECT);
    message.newPeer = newPeer;
    this._unicast(nearest, message);
  }
  return true;
};

DHT.prototype._onDisconnect = function(peer){
  // here we will reconnect to the closest peer connected to the lost one
  // following the direction always, either greater or lower than this peer's id
  var routes = this.router.getRoutes(peer);
  if(this.arithmetic.lessThan(this.peer.id, peer)){
    // check only routes that have an id lower that this peer
    routes = this.arithmetic.filterLowerThan(routes, peer);
  } else {
    // check only routes that have an id greater that this peer
    routes = this.arithmetic.filterGreaterThan(routes, peer);
  }
  var connections = this.router.myConnections();
  var nearest = this.arithmetic.findNearest(routes);
  this._connect(nearest, connections);
};

DHT.prototype._onRoutes = function(message){
  this.router.updateRoutes(message.peerFrom, message.routes);
  // Call any action that was scheduled in the reactor.
  this.reactor.activate(message.peerFrom);
};

/* Protocol transmission tasks */

DHT.prototype._buildMessage = function(peerTo, protocol){
  return {
    protocol: protocol,
    peerFrom: this.peer.id,
    peerTo: peerTo,
    trace: [this.peer.id],
  };
};

DHT.prototype._unicast = function(peerTo, message){
  this.router.send(peerTo, message);
};

/* Public methods */

DHT.prototype.join = function(knownPeer){
  var connections = this.router.myConnections();
  if(connections.indexOf(knownPeer) > -1)
    return false;
  // This peer will receive the routes of the new peer.
  // The protocol is to answer back with the routes of this peer.
  this._setJoinTrigger(knownPeer);
  var dataConnection = this.peer.connect(knownPeer);
  this._configureDataConnection(dataConnection);
  return true;
};

DHT.prototype.put = function(value){
  console.log('in progress');
};

DHT.prototype.get = function(key){
  console.log('in progress');
};

DHT.prototype.close = function(){
  console.log('in progress');
};
