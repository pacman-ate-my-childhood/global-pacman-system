
var _ = require('underscore'),
    Model = require('./model.js');

var User = Model.build('user');

User.prototype.password = null;

User.auth = function(username, password, callback) {
   User.get(username, function(err, user) {
      if (err) return callback(err);
      else if (user.password !== password) return callback('user and password do not match');
      else return callback(err, user);
   });
};


module.exports = User;
