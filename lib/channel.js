
var io = require('socket.io');



function Channel() {
   this.channels = { };
   this.server = null;
}

require('util').inherits(Channel, require('events').EventEmitter);


Channel.prototype.listen = function(app) {
   this.server = io.listen(app);
   this.server.set('log level', 1);
};



Channel.prototype.ensure = Channel.prototype.get = function(id) {
   var channel = this.channels[id];

   if (!channel) {
      channel = this.channels[id] = this.server.of('/' + id);

      this.emit('created', channel, id);
   }

   return channel;
};

Channel.prototype.destroy = function(id) {
   delete this.channels[id];
   this.emit('destroyed', id);
};



module.exports = new Channel();
