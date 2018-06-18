var MyPeer = function () {
  self = this;
  var peer = new Peer({
    key: '669c1ccf-9652-4fa4-95f3-9adfdd9cd9de',
    debug: 3,
    logFunction: function() {
      var copy = Array.prototype.slice.call(arguments).join(' ');
      console.log('peerのlog:', copy);
    }
  });
  var connectedPeers = {};
  this.selfConn = '';
  var tagObj = {};

  //必須
  window.onunload = window.onbeforeunload = function(e) {
    if (!!peer && !peer.destroyed) {
      peer.destroy();
    }
  };


  // 初期接続
  peer.on('open', function(id){
    self.selfConn = id;
    peer.listAllPeers(function(list){
      if (!Array.isArray(list)) {
        return 0;
      }
      for (var i in list) {
        var requestedPeer = list[i];
        if (!connectedPeers[requestedPeer]) {
          var c = peer.connect(requestedPeer, {
            label: 'fps',
            serialization: 'none',
            // reliable: true,
            metadata: {message: 'new client'}
          });
          c.on('open', function() {
          });
          c.on('data', function(data) {
            self.reciveData(data);
          });
          c.on('error', function(err) {
            console.log(err);
          });

          c.on('close', function() {
            connectedPeers[this.peer] = 0;
            destroyPlayer(this.peer);
          });
          connectedPeers[requestedPeer] = 1;
        }
      }
    });
  });
  //新たに接続されたコネクションからデータを受け撮った時の処理
  peer.on('connection', function(c){
    if (c.label !== 'fps') {
      c.disconnect();
    }
    c.on('data', function(data) {
      self.reciveData(data);
    });
    c.on('error', function(err) { console.log(c); });
    c.on('close', function() {
      delete connectedPeers[c.peer];
      destroyPlayer(c.peer);
    });
    connectedPeers[c.peer] = 1;
  });

  this.reciveData = function(data){
    data = JSON.parse(data);
    switch (data.type) {
      case 'createBall':
        createBall(data);
        break;
      case 'moveOtherPlayer':
        moveOtherPlayer(data);
        break;
      default:
    }
  }
  this.sendData = function(data){
    for (var requestedPeer in connectedPeers) {
      if (requestedPeer != self.selfConn && connectedPeers[requestedPeer] != 0) {
        var conns = peer.connections[requestedPeer];
        for (var i = 0, ii = conns.length; i < ii; i += 1) {
          var c = conns[i];
          if (c.open) {
            c.send(JSON.stringify(data));
          }
        }
      }
    }
  }
}