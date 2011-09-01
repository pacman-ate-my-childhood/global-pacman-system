
var _ = require('underscore'),
    redback = require('redback').createClient();

function build(type, local_copy) {

   var shared_hash = redback.createHash(type),
       local_hash = (local_copy) ? { } : null

   function Model(id, raw) {
      this.id = id;
      this.alive = true;
      raw && this.parse(raw);
   }

   require('util').inherits(Model, require('events').EventEmitter);

   Model.prototype.id = null;

   Model.prototype.type = 'model';

   Model.prototype.alive = true;

   Model.prototype.parse = function(raw) {
      _.extend(this, raw);
   };




   Model.prototype.save = function(callback) {
      if (!this.alive) callback(null, this);
      else {
         shared_hash.set(this.id, JSON.stringify(this), (function(err) {
            callback(err, this);
         }).bind(this));
      }
   };

   Model.prototype.load = function(callback) {
      var local = local_hash && local_hash[this.id];

      if (local) callback(null, local);
      else {
         shared_hash.get(this.id, (function(err, raw) {
            if (err) callback(err);
            else if (!raw) callback('no object found to match id: ' + this.id);
            else {
               this.parse(JSON.parse(raw));
               callback(null, this);
            }
         }).bind(this));
      }
   };

   Model.prototype.remove = function(callback) { this.alive = false; Model.remove(this.id, callback); };



   Model.static = { };

   Model.static.create = function(id, raw, callback) {
      shared_hash.exists(id, function(err, exists) {
         if (err) callback(err);
         else if (exists) callback('an object already exists with the id: ' + id);
         else (new Model(id, raw)).save(callback);
      }); 
   };

   Model.static.get = function(id, callback) {
      (new Model(id)).load(callback);
   };

   Model.static.list = function(callback) {
      shared_hash.values(function(err, models) {
         if (err) { callback(err); return; }

         callback(err, _.map(_.map(models, JSON.parse), function(model) {
            var obj = new Model(model.id, model);

            if (local_hash) { local_hash[model.id] = obj; }

            return obj; 
         }));
      });
   };

   Model.static.remove = function(id, callback) {
      if (local_hash) delete local_hash[id];
      shared_hash.del(id, callback);
   };


   _.extend(Model, Model.static);

   return Model;
}


module.exports.build = build;
