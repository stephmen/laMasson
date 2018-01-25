const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail')

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
const resetURL =`http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
await mail.send({
  user,
  subject: 'Password Reset',
  resetURL,
  filename: 'password-reset'
});  
req.flash('Success', `You have been emailed a password reset link.`);
// 4. redirect to login page
res.redirect('/login'); 
};

exports.reset = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });
  if (!user) {
    req.flash('error', 'Password reset is invalid or has expired');
    return res.redirect('/login');
  }
  // if there is a user, show the rest of password form
  res.render('reset', {title: 'Reset your Password'});    
};

exports.confirmedPasswords = (req, res, next) => {
  if (req.body.password === req.body['password-confirm']){
    next(); //Keep Going! 
    return;
  }
req.flash('error', 'Password do not match!')
res.redirect('back')
};
exports.update = async (req,res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });
  if (!user) {
    req.flash('error', 'Password reset is invalid or has expired');
    return res.redirect('/login');
  }

  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  const updateUser = await user.save();
  await req.login(updateUser);
  req.flash('success', 'Nice! Your password has been reset! You are now logged in!' );
  res.redirect('/');

}; 
