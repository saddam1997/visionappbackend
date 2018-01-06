/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

//External Dependencies.........
var request = require('request');
var bcrypt = require('bcrypt');
var nodemailer = require('nodemailer');
var mergeJSON = require("merge-json");
var validator = require('validator');
//BTC Wallet Details
var bitcoinBTC = require('bitcoin');
var clientBTC = new bitcoinBTC.Client({
  host: sails.config.company.clientBTChost,
  port: sails.config.company.clientBTCport,
  user: sails.config.company.clientBTCuser,
  pass: sails.config.company.clientBTCpass
});
var companyBTCAccount = sails.config.company.companyBTCAccount;
var companyBTCAccountAddress = sails.config.company.companyBTCAccountAddress;

//BCH Wallet Details
var bitcoinBCH = require('bitcoin');
var clientBCH = new bitcoinBCH.Client({
  host: sails.config.company.clientBCHhost,
  port: sails.config.company.clientBCHport,
  user: sails.config.company.clientBCHuser,
  pass: sails.config.company.clientBCHpass
});
var companyBCHAccount = sails.config.company.companyBCHAccount;
var companyBCHAccountAddress = sails.config.company.companyBCHAccountAddress;

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'wallet.bcc@gmail.com',
    pass: 'boosters@123'
  }
});

module.exports = {

  createNewUser: function(req, res) {
    console.log("Enter into createNewUser :: ");
    var useremailaddress = req.body.email;
    var userpassword = req.body.password;
    var userconfirmPassword = req.body.confirmPassword;
    var userspendingpassword = req.body.spendingpassword;
    if (!validator.isEmail(useremailaddress)) {
      return res.json({
        "message": "Please Enter valid email id",
        statusCode: 400
      });
    }
    if (!useremailaddress || !userpassword || !userconfirmPassword || !userspendingpassword) {
      console.log("User Entered invalid parameter ");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    if (userpassword !== userconfirmPassword) {
      console.log("Password and confirmPassword doesn\'t match!");
      return res.json({
        "message": 'Password and confirmPassword doesn\'t match!',
        statusCode: 400
      });
    }
    User.findOne({
      email: useremailaddress
    }, function(err, user) {
      if (err) {
        console.log("Error to find user from database");
        return res.json({
          "message": "Error to find User",
          statusCode: 400
        });
      }
      if (user) {
        console.log("Use email exit and return ");
        return res.json({
          "message": 'email already exit',
          statusCode: 400
        });
      }
      if (!user) {
        clientBTC.cmd('getnewaddress', useremailaddress, function(err, newBTCAddressForUser, resHeaders) {
          if (err) {
            console.log("Error from sendFromBCHAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "BTC Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in BTC server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in BTC Server",
              statusCode: 400
            });
          }
          console.log('New address created from newBTCAddressForUser :: ', newBTCAddressForUser);
          clientBCH.cmd('getnewaddress', useremailaddress, function(err, newBCHAddressForUser, resHeaders) {
            if (err) {
              console.log("Error from sendFromBCHAccount:: ");
              if (err.code && err.code == "ECONNREFUSED") {
                return res.json({
                  "message": "BCH Server Refuse to connect App",
                  statusCode: 400
                });
              }
              if (err.code && err.code < 0) {
                return res.json({
                  "message": "Problem in BCH server",
                  statusCode: 400
                });
              }
              return res.json({
                "message": "Error in BCH Server",
                statusCode: 400
              });
            }
            console.log('New address created from BCHServer :: ', newBCHAddressForUser);
            bcrypt.hash(userspendingpassword, 10, function(err, hashspendingpassword) {
              if (err) {
                console.log("Error To bcrypt spendingpassword");
                return res.json({
                  "message": err,
                  statusCode: 500
                });
              }
              var userObj = {
                email: useremailaddress,
                password: userpassword,
                encryptedSpendingpassword: hashspendingpassword,
                userBTCAddress: newBTCAddressForUser,
                userBCHAddress: newBCHAddressForUser
              }
              User.create(userObj).exec(function(err, userAddDetails) {
                if (err) {
                  console.log("Error to Create New user !!!");
                  console.log(err);
                  return res.json({
                    "message": "Error to create New User",
                    statusCode: 400
                  });
                }
                return res.json(200, {
                  "message": "User created Succesfully",
                  statusCode: 200
                });
              });
            });
          });
        });
      }
    });
  },
  sendEmail: function(req, res, next) {
    console.log("Enter into sendEmailTest::: " + JSON.stringify(req.body));
    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'wallet.bcc@gmail.com',
        pass: 'boosters@123'
      }
    });
    var mailOptions = {
      from: 'wallet.bcc@gmail.com',
      to: 'bccwalletsuport@gmail.com',
      subject: 'Sending Email using Node.js',
      text: 'That was easy!'
    };
    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
        res.json(200, "Message Send Succesfully");
      }
    });
  },
  sentOtpToEmailForgotPassword: function(req, res, next) {

    console.log("Enter into sentOtpToEmail");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).exec(function(err, user) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'wallet.bcc@gmail.com',
          pass: 'boosters@123'
        }
      });
      var newCreatedPassword = Math.floor(100000 + Math.random() * 900000);
      console.log("newCreatedPassword :: " + newCreatedPassword);
      var mailOptions = {
        from: 'wallet.bcc@gmail.com',
        to: userMailId,
        subject: 'Please reset your password',
        text: 'We heard that you lost your BccPay password. Sorry about that! ' +
          '\n But don’t worry! You can use this otp reset your password ' + newCreatedPassword
      };
      transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log(newCreatedPassword + 'Email sent: ' + info.response);
          //res.json(200,"Message Send Succesfully");
          console.log("createing encryptedPassword ....");
          bcrypt.hash(newCreatedPassword.toString(), 10, function(err, hash) {
            if (err) return next(err);
            var newEncryptedPass = hash;
            User.update({
                email: userMailId
              }, {
                encryptedForgotPasswordOTP: newEncryptedPass
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.serverError(err);
                }
                console.log("OTP forgot update succesfully!!!");
                return res.json({
                  "message": "Otp sent on user mail id",
                  "userMailId": userMailId,
                  statusCode: 200
                });
              });
          });
        }
      });
    });
  },
  verifyOtpToEmailForgotPassord: function(req, res, next) {

    console.log("Enter into sentOtpToEmail");
    var userMailId = req.body.userMailId;
    var otp = req.body.otp;
    if (!userMailId || !otp) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).exec(function(err, user) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      User.compareForgotpasswordOTP(otp, user, function(err, valid) {
        if (err) {
          console.log("Error to compare otp");
          return res.json({
            "message": "Error to compare otp",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct otp",
            statusCode: 401
          });
        } else {
          console.log("OTP is varified succesfully");
          res.json(200, {
            "message": "OTP is varified succesfully",
            "userMailId": userMailId,
            statusCode: 200
          });
        }
      });
    });
  },
  updateForgotPassordAfterVerify: function(req, res, next) {
    console.log("Enter into sentOtpToEmail");
    var userMailId = req.body.userMailId;
    var newPassword = req.body.newPassword;
    var confirmNewPassword = req.body.confirmNewPassword;
    if (!userMailId || !newPassword || !confirmNewPassword) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 401
      });
    }
    if (newPassword != confirmNewPassword) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "New Password and Confirm New Password not match",
        statusCode: 401
      });
    }
    User.findOne({
      email: userMailId
    }).exec(function(err, user) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      bcrypt.hash(confirmNewPassword, 10, function(err, hash) {
        if (err) res.json({
          "message": "Errot to bcrypt passoword",
          statusCode: 401
        });
        var newEncryptedPass = hash;
        User.update({
            email: userMailId
          }, {
            encryptedPassword: newEncryptedPass
          })
          .exec(function(err, updatedUser) {
            if (err) {
              return res.json({
                "message": "Error to update passoword!",
                statusCode: 401
              });
            }
            console.log("Update passoword succesfully!!!");
            return res.json({
              "message": "Your passoword updated succesfully",
              statusCode: 200
            });
          });
      });
    });
  },
  updateCurrentPassword: function(req, res, next) {
    console.log("Enter into updateCurrentPassword");
    var userMailId = req.body.userMailId;
    var currentPassword = req.body.currentPassword;
    var newPassword = req.body.newPassword;
    var confirmNewPassword = req.body.confirmNewPassword;
    if (!userMailId || !currentPassword || !newPassword || !confirmNewPassword) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 401
      });
    }
    if (currentPassword == newPassword) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Current password is not same as newPassword",
        statusCode: 401
      });
    }
    if (newPassword != confirmNewPassword) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "New Password and Confirm New Password not match",
        statusCode: 401
      });
    }
    User.findOne({
      email: userMailId
    }).exec(function(err, user) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      User.comparePassword(currentPassword, user, function(err, valid) {
        if (err) {
          console.log("Error to compare password");
          return res.json({
            "message": "Error to compare password",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct currentPassword",
            statusCode: 401
          });
        } else {
          bcrypt.hash(confirmNewPassword, 10, function(err, hash) {
            if (err) res.json({
              "message": "Errot to bcrypt passoword",
              statusCode: 401
            });
            var newEncryptedPass = hash;
            User.update({
                email: userMailId
              }, {
                encryptedPassword: newEncryptedPass
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.json({
                    "message": "Error to update passoword!",
                    statusCode: 401
                  });
                }
                console.log("Update current passoword succesfully!!!");
                return res.json({
                  "message": "Your passoword updated succesfully",
                  statusCode: 200
                });
              });
          });
        }
      });

    });
  },
  sentOtpToUpdateSpendingPassword: function(req, res, next) {
    console.log("Enter into sentOtpToEmail");
    var userMailId = req.body.userMailId;
    var currentPassword = req.body.currentPassword;
    if (!userMailId || !currentPassword) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).exec(function(err, user) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      User.comparePassword(currentPassword, user, function(err, valid) {
        if (err) {
          console.log("Error to compare password");
          return res.json({
            "message": "Error to compare password",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct Password",
            statusCode: 401
          });
        } else {
          var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: 'wallet.bcc@gmail.com',
              pass: 'boosters@123'
            }
          });
          var newCreatedPassword = Math.floor(100000 + Math.random() * 900000);
          console.log("newCreatedPassword :: " + newCreatedPassword);
          var mailOptions = {
            from: 'wallet.bcc@gmail.com',
            to: userMailId,
            subject: 'Please reset your spending password',
            text: 'We heard that you lost your BccPay spending password. Sorry about that! ' +
              '\n But don’t worry! You can use this otp reset your password ' + newCreatedPassword
          };
          transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
              console.log(error);
            } else {
              console.log(newCreatedPassword + 'Email sent: ' + info.response);
              //res.json(200,"Message Send Succesfully");
              console.log("createing encryptedPassword ....");
              bcrypt.hash(newCreatedPassword.toString(), 10, function(err, hash) {
                if (err) return next(err);
                var newEncryptedPass = hash;
                User.update({
                    email: userMailId
                  }, {
                    encryptedForgotSpendingPasswordOTP: newEncryptedPass
                  })
                  .exec(function(err, updatedUser) {
                    if (err) {
                      return res.serverError(err);
                    }
                    console.log("OTP forgot update succesfully!!!");
                    return res.json({
                      "message": "Otp sent on user mail id",
                      "userMailId": userMailId,
                      statusCode: 200
                    });
                  });
              });
            }
          });
        }
      });

    });
  },
  verifyOtpToEmailForgotSpendingPassord: function(req, res, next) {

    console.log("Enter into sentOtpToEmail");
    var userMailId = req.body.userMailId;
    var otp = req.body.otp;
    if (!userMailId || !otp) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).exec(function(err, user) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      User.compareEmailVerificationOTPForSpendingPassword(otp, user, function(err, valid) {
        if (err) {
          console.log("Error to compare otp");
          return res.json({
            "message": "Error to compare otp",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct otp",
            statusCode: 401
          });
        } else {
          console.log("OTP is varified succesfully");
          res.json(200, {
            "message": "OTP for spending passoword is varified succesfully",
            "userMailId": userMailId,
            statusCode: 200
          });
        }
      });
    });
  },
  updateForgotSpendingPassordAfterVerify: function(req, res, next) {
    console.log("Enter into updateForgotSpendingPassordAfterVerif");
    var userMailId = req.body.userMailId;
    var newSpendingPassword = req.body.newSpendingPassword;
    var confirmSpendingPassword = req.body.confirmSpendingPassword;
    if (!userMailId || !newSpendingPassword || !confirmSpendingPassword) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 401
      });
    }
    if (newSpendingPassword != confirmSpendingPassword) {
      console.log("New Password and Confirm New Password not match");
      return res.json({
        "message": "New Spending Password and Confirm Spending Password not match",
        statusCode: 401
      });
    }
    User.findOne({
      email: userMailId
    }).exec(function(err, user) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      bcrypt.hash(newSpendingPassword, 10, function(err, hash) {
        if (err) res.json({
          "message": "Errot to bcrypt passoword",
          statusCode: 401
        });
        var newEncryptedPass = hash;
        User.update({
            email: userMailId
          }, {
            encryptedSpendingpassword: newEncryptedPass
          })
          .exec(function(err, updatedUser) {
            if (err) {
              return res.json({
                "message": "Error to update passoword!",
                statusCode: 401
              });
            }
            console.log("Update passoword succesfully!!!");
            return res.json({
              "message": "Your spending passoword updated succesfully",
              statusCode: 200
            });
          });
      });
    });
  },
  sentOtpToEmailVerificatation: function(req, res, next) {

    console.log("Enter into sentOtpToEmailVerificatation");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).exec(function(err, user) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      var createNewOTP = Math.floor(100000 + Math.random() * 900000);
      console.log("createNewOTP :: " + createNewOTP);
      var mailOptions = {
        from: 'wallet.bcc@gmail.com',
        to: user.email,
        subject: 'Please verify your email',
        text: 'Your otp to varify email ' + createNewOTP
      };
      transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log(createNewOTP + 'Email sent: ' + info.response);
          console.log("createing encryptedPassword ....");
          bcrypt.hash(createNewOTP.toString(), 10, function(err, hash) {
            if (err) return next(err);
            var newEncryptedPass = hash;
            User.update({
                email: userMailId
              }, {
                encryptedEmailVerificationOTP: newEncryptedPass
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.serverError(err);
                }
                console.log("OTP  update encryptedEmailVerificationOTP succesfully!!!");
                return res.json({
                  "message": "Otp sent on mail id",
                  statusCode: 200
                });
              });
          });
        }
      });
    });
  },
  updateUserVerifyEmail: function(req, res, next) {

    console.log("Enter into updateUserVerifyEmail");
    var userMailId = req.body.userMailId;
    var otp = req.body.otp;
    if (!userMailId || !otp) {
      console.log("Invalid Parameter by user.....");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).exec(function(err, user) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      User.compareEmailVerificationOTP(otp, user, function(err, valid) {
        if (err) {
          console.log("Error to compare otp");
          return res.json({
            "message": "Error to compare otp",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct otp",
            statusCode: 401
          });
        } else {
          console.log("OTP is varified succesfully");
          User.update({
              email: userMailId
            }, {
              verifyEmail: true
            })
            .exec(function(err, updatedUser) {
              if (err) {
                return res.json({
                  "message": "Error to update passoword!",
                  statusCode: 401
                });
              }
              console.log("Update current SpendingPassword succesfully!!!");

              User.findOne({
                email: userMailId
              }).exec(function(err, userDetailsReturn) {
                if (err) {
                  return res.json({
                    "message": "Error to find user",
                    statusCode: 401
                  });
                }
                if (!userDetailsReturn) {
                  return res.json({
                    "message": "Invalid email!",
                    statusCode: 401
                  });
                }
                return res.json(200, {
                  user: userDetailsReturn,
                  statusCode: 200
                });
              });
            });
        }
      });
    });
  }
};
