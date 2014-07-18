function Arithmetic (){
  this.type= 'XOR';
}

Arithmetic.prototype.findNearest = function(peerTo, peers){
  if(!peers || !peers.length)
    return null;
  // Remove the peerTo from the peers to avoid calculating the distance from the peer to itself.
  for(var i = peers.length - 1; i >= 0; i--){
    if (peers[i] === peerTo)
      peers.splice(i, 1);
  }
  var hashOfPeerTo = Sha1.hash(peerTo);
  var bitObjPeerTo = new BigInteger(hashOfPeerTo, 16);
  var hashTmp, bitObjTmp;
  var distances = new Array();
  for(var i in peers){
    hashTmp = Sha1.hash(peers[i]);
    bitObjTmp = new BigInteger(hashTmp, 16);
    distances.push({
      peer: peers[i],
      distance: bitObjPeerTo.xor(bitObjTmp),
    });
  }
  return this._getLowestBitKey(distances);
};

Arithmetic.prototype._getLowestBitKey = function(distances){
  if(distances.length === 0)
    return null;
  var pair = distances.pop();
  var min = pair.distance;
  var nearest = pair.peer;
  var pairTmp, distanceTmp, peerTmp;
  for(var i in distances){
    pairTmp = distances[i];
    distanceTmp = pairTmp.distance;
    peerTmp = pairTmp.peer;
    if(distanceTmp.compareTo(min) < 0){
      min = distanceTmp;
      nearest = peerTmp;
    }
    
  }
  return nearest;
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