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
  var _dht = this;
  this.peer.on('connection', function(dataConnection){
    _dht._onConnectionReceived(dataConnection);
  });
  this.ready = true;
  var hashedId = Sha1.hash(this.peer.id);
  var hexId = new BigInteger(hashedId, 16);
  console.log("The hex id is " + hexId.toString(16));
  cb(this.peer);
};

DHT.prototype._onConnectionReceived = function (dataConnection){
  this._configureDataConnection(dataConnection);
  // this.replication.redistributeKeys();
  var _dht = this;
  dataConnection.on('open', function(){
    _dht.router.createRoute(dataConnection.peer);
    _dht._notifyRoute(dataConnection.peer, true);
    var message = _dht._buildMessage(dataConnection.peer, _dht._protocols.ROUTES);
    message.routes = _dht.router.myConnections();
    dataConnection.send(message);
  });
};

DHT.prototype._configureDataConnection = function(dataConnection){
  var _dht = this;
  dataConnection.on('data', function(data){
    _dht._onDataReceived(data);
  });
  dataConnection.on('close', function(){
    _dht._onDisconnect(this.peer);
  });
};

DHT.prototype._notifyRoute = function(peer, add){
  var neighbors = this.router.myConnections();
  // do not notify the new connected peer
  for(var i = neighbors.length - 1; i >= 0; i--){
    if (neighbors[i] === peer)
      neighbors.splice(i, 1);
  }
  if(neighbors.length === 0)
    return false;
  var message = this._buildMessage("", this._protocols.ROUTES);
  message.route = peer;
  message.add = add;
  this.router.multicast(neighbors, message);
  return true;
};

DHT.prototype._onDataReceived = function(message){
  var protocol = message.protocol ? message.protocol: 'none';
  console.log('message type ' + protocol);
  switch(protocol){
    case this._protocols.JOIN:
      // a new node wants to join the network
      this._onJoin(message);
      break;
    case this._protocols.CONNECT:
      // a new node has joined
      this._connect(message.newPeer);
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

DHT.prototype._connect = function(newPeer){
  connections = this.router.myConnections();
  if(connections.indexOf(newPeer) > -1)
    return false;
  this._setConnectTrigger(newPeer);
  var dataConnection = this.peer.connect(newPeer);
  this._configureDataConnection(dataConnection);
  return true;
};

DHT.prototype._setConnectTrigger = function(newPeer){
  var _dht = this;
  this.reactor.setTrigger(newPeer, function(){
    // we are here because we send a join message to a peer
    // that peer replied with its routes
    // now we now this peer has just exchanged the handshake
    // so then we notify our neighbors of this new peer
    _dht._notifyRoute(newPeer, true);
    var message = _dht._buildMessage(newPeer, _dht._protocols.ROUTES);
    message.routes = _dht.router.myConnections();
    _dht.router.unicast(newPeer, message);
  });
};

DHT.prototype._setJoinTrigger = function(knownPeer){
  var _dht = this;
  this.reactor.setTrigger(knownPeer, function(){
    _dht._notifyRoute(knownPeer, true);
    var message = _dht._buildMessage(knownPeer, _dht._protocols.JOIN);
    message.newPeer = _dht.peer.id;
    _dht.router.unicast(knownPeer, message);
  });
};

/* Protocol events */

DHT.prototype._onJoin = function(message){
  if(message.trace.length > 64)
    return false;
  var newPeer = message.newPeer;
  // there is a problem when there is just one connection
  // the message trace contains that one that is already in the peer connections
  // thus the peer gets connected again
  // that is myConnections is an empty array.
  var myConnections = this.router.filterConnections(this.router.myConnections(), message.trace);
  var nearest = this.arithmetic.findNearest(newPeer, myConnections.concat([this.peer.id]));
  if(this.peer.id === nearest){
    this._connect(newPeer);
    // it is important to send a fresh snapshot to place the new peer
    // between the proper neighbors
    this._attachEnd(newPeer, this.router.myConnections());
    return true;
  }
  message.peerTo = nearest;
  message.peerFrom = this.peer.id;
  message.trace.push(this.peer.id);
  this.router.unicast(nearest, message);
  return false;
};

DHT.prototype._attachEnd = function (newPeer, connections){
  // Connect the new peer to a higher or lower (numerical value) peer.
  var possiblePeers = new Array();
  for(var i in connections){
    if(this.arithmetic.checkBetween(this.peer.id, newPeer, connections[i]))
      possiblePeers.push(connections[i]);
  }
  if(possiblePeers.length === 0)
    return false;
  var nearest = this.arithmetic.findNearest(newPeer, possiblePeers);
  if(!nearest)
    return false;
  var message = this._buildMessage(nearest, this._protocols.CONNECT);
  message.newPeer = newPeer;
  this.router.unicast(nearest, message);
  return true;
};


DHT.prototype._onDisconnect = function(peer){
  var neighbors = this.router.getRoutesOf(peer);
  if(!neighbors)
    return false;
  var nearest = this.arithmetic.findNearest(peer, neighbors);
  this.router.removeRoute(peer);
  this._notifyRoute(peer, false);
  if(!nearest){
    // choose another peer from the look ahead routes...
    return false;
  }
  this._connect(nearest);
  return true;
};

DHT.prototype._onRoutes = function(message){
  if(message.routes)
    this.router.updateRoutesOf(message.peerFrom, message.routes);
  else if(message.route)
    message.add ? 
      this.router.updateRoutesOf(message.peerFrom, [message.route]):
      this.router.removeRouteFromAny(message.route);
  // Call any action that was scheduled in the reactor.
  // or shall we use merely dataConnection.on('open', function(){}); 
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
