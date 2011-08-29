
var _ = require('underscore'),
    redback = require('redback').createClient(),
    user_hash = redback.createHash('user');

function User(username, params) {
   this.username = this.id = username;
   params && this.parse(params);
}

User.prototype.id = null
User.prototype.username = null;

User.prototype.password = null;

User.prototype.parse = function(params) {
   this.password = params.password;
};


User.prototype.save = function(callback) {
   user_hash.set(this.username, JSON.stringify(this), (function(err) {
      callback(err, this);
   }).bind(this));
};

User.prototype.load = function(callback) {
   user_hash.get(this.username, (function(err, user_json) {
      if (err) return callback(err);
      else if (!user_json) return callback('no user called ' + this.username, this);

      this.parse(JSON.parse(user_json));
      callback(err, this);
   }).bind(this));
};


User.auth = function(username, password, callback) {
   User.get(username, function(err, user) {
      if (err) return callback(err);
      else if (user.password !== password) return callback('user and password do not match');
      else return callback(err, user);
   });
};

User.create = function(username, password, callback) {
   user_hash.exists(username, function(err, exists) {
      (new User(username, { password: password })).save(callback);
   });
};

User.get = function(username, callback) {
   (new User(username)).load(callback);
};


module.exports = User;
