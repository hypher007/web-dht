function Arithmetic (){
  this.type= 'XOR';
}

Arithmetic.prototype.findNearest = function(peerTo, peers){
  // Remove the peerTo from the peers to avoid calculating the distance from the peer to itself.
  for(var i = peers.length - 1; i--;){
    if (peers[i] === peerTo) peers.splice(i, 1);
  }
  var sha1PeerTo = Sha1.hash(peerTo);
  var bitKeyPeerTo = new BigInteger(sha1PeerTo, 16);
  var sha1Peer, bitKeyPeer;
  var xorDistances = new Array();
  for(var i in peers){
    sha1Peer = Sha1.hash(peers[i]);
    bitKeyPeer = new BigInteger(sha1Peer, 16);
    xorDistances.push(bitKeyPeerTo.xor(bitKeyPeer));
  }
  return this._getLowestBitKey(xorDistances);
};

Arithmetic.prototype._getLowestBitKey = function(array){
  if(array.length === 0) return null;
  var min = array.pop();
  for(var i in array){
    if(min.compareTo(array[i]) < 0) min = array[i];
  }
  return min;
};

Arithmetic.prototype.lessThan = function(peerA, peerB){
  var comp = this._compare(peerA, peerB);
  return comp < 0;
};

Arithmetic.prototype.greaterThan = function(peerA, peerB){
  var comp = this._compare(peerA, peerB);
  return comp > 0;
};

Arithmetic.prototype.filterLowerThan = function(routes, peer){
  var filtered = new Array();
  for(var i in routes){
   if(this.lessThan(routes[i], peer)){
     filtered.push(routes[i]);
   }
  }
  return filtered;
};

Arithmetic.prototype.filterGreaterThan = function(routes, peer){
  var filtered = new Array();
  for(var i in routes){
   if(this.greaterThan(routes[i], peer)){
     filtered.push(routes[i]);
   }
  }
  return filtered;
};

Arithmetic.prototype.checkBetween = function(peerA, newPeer, peerB){
  var betweenUp = this.greaterThan(peerB, newPeer) && this.greaterThan(newPeer, peerA);
  var betweenDown = this.lessThan(peerB, newPeer) && this.lessThan(newPeer, peerA);
  return betweenUp || betweenDown;
};


Arithmetic.prototype._compare = function(peer0, peer1){
  /*
   * Compare peer0 to peer1
   * Return + if peer0 > than peer1
   * Return - if peer0 < than peer1
   * Return 0 if they are equal
   */
  var sha1Peer0 = Sha1.hash(peer0);
  var sha1Peer1 = Sha1.hash(peer1);
  var bitKeyPeer0 = new BigInteger(sha1Peer0, 16);
  var bitKeyPeer1 = new BigInteger(sha1Peer1, 16);
  return bitKeyPeer0.compareTo(bitKeyPeer1);
};