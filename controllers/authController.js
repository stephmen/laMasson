const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');

exports.login = passport.authenticate('local', {
  failureredirect: '/login',
  failureFlash: 'Failed Login!',
  successRedirect: '/',
  successFlash: 'You are now logged in !'
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', "You are now logged out !!!");
  res.redirect('/'); 
};

exports.isLoggedIn = (req, res, next ) => {
  // first check if the user is authenticated
  if(req.isAuthenticated()) {
    next(); // carry on! They are logged in!
    return;
  }
  req.flash('error', 'Oops you must be logged in to do that!');
  res.redirect('/login');
};

exports.forgot = async (req, res) => {
// 1. see if that email exist
const user = await User.findOne( { email: req.body.email });
if(!user) {
  req.flash('error', 'No Account with that email exist');
  return res.redirect('/login');
}
// 2. set reset token and expiry on their account
user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
user.resetPasswordExpires = Date.now() + 3600000; // one hour from now
await user.save();
// 3. send an email with token
const resetURL =`http://${req.headers.host}.account/reset/${user.resetPasswordToken});`
req.flash('Success', `You have been emailed a password reset link. ${resetURL}`)
// 4. redirect to login page
res.redirect('/login'); 
};