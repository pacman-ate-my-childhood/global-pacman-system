var everyauth = require('everyauth'),
    User = require('./user.js');

everyauth.everymodule.findUserById(function(id, callback) {
   User.get(id, callback);
});

everyauth.password
  .loginWith('login')
  .getLoginPath('/login') // Uri path to the login page
  .postLoginPath('/login') // Uri path that your login form POSTs to
  .loginView('login.ejs')
  .authenticate( function (login, password) {
    var promise = this.Promise()
    User.auth(login, password, function (err, user) {
      if (err) return promise.fulfill([err]);
      promise.fulfill(user);
    });

    return promise;
  })
  .loginSuccessRedirect('/') // Where to redirect to after a login

  .getRegisterPath('/register') // Uri path to the registration page
  .postRegisterPath('/register') // The Uri path that your registration form POSTs to
  .registerView('register.ejs')
  .validateRegistration( function (newUserAttributes) {
     return [];
  })
  .registerUser( function (newUserAttributes) {
    var promise = this.Promise();
    User.create(newUserAttributes.login, { password: newUserAttributes.password }, function (err, user) {
      if (err) return promise.fulfill([err]);
      promise.fulfill(user);
    });
    return promise;
  })
  .registerSuccessRedirect('/'); // Where to redirect to after a successful registration


module.exports = everyauth;

