/**
 * UsertransactionController
 *
 * @description :: Server-side logic for managing usertransactions
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
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
var transactionFeeBCH = sails.config.company.txFeeBCH;
var transactionFeeBTC = sails.config.company.txFeeBTC;

module.exports = {
  sendBTC: function(req, res, next) {
    console.log("Enter into sendBTC");
    var userEmailAddress = req.body.userMailId;
    var userBTCAmountToSend = parseFloat(req.body.amount).toFixed(8);
    var userReceiverBTCAddress = req.body.recieverBTCCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var userCommentForReceiver = req.body.commentForReciever;
    var userCommentForSender = req.body.commentForSender;
    var miniBTCAmountSentByUser = 0.001;
    miniBTCAmountSentByUser = parseFloat(miniBTCAmountSentByUser).toFixed(8);
    if (!userEmailAddress || !userBTCAmountToSend || !userReceiverBTCAddress ||
      !userSpendingPassword || !userCommentForReceiver || !userCommentForSender) {
      console.log("Invalid Parameter by user ");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    if (userBTCAmountToSend < miniBTCAmountSentByUser) {
      console.log("Sending amount is not less then " + miniBTCAmountSentByUser);
      return res.json({
        "message": "Sending amount BTC is not less then " + miniBTCAmountSentByUser,
        statusCode: 400
      });
    }
    User.findOne({
      email: userEmailAddress
    }).exec(function(err, userDetails) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!userDetails) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      } else {
        console.log(JSON.stringify(userDetails));
        var userBTCBalanceInDb = parseFloat(userDetails.BTCbalance).toFixed(8);
        console.log("User BTC balance in database ::: " + userBTCBalanceInDb);
        console.log("User want send BTC to send ::: " + userBTCAmountToSend);
        User.compareSpendingpassword(userSpendingPassword, userDetails,
          function(err, valid) {
            if (err) {
              console.log("Eror To compare password !!!");
              return res.json({
                "message": err,
                statusCode: 401
              });
            }
            if (!valid) {
              console.log("Invalid spendingpassword !!!");
              return res.json({
                "message": 'Enter valid spending password',
                statusCode: 401
              });
            } else {
              console.log("Valid spending password !!!");
              var userBTCAddressInDb = userDetails.userBTCAddress;
              var userBTCBalanceInDb = userDetails.BTCbalance;
              if (userBTCAmountToSend > userBTCBalanceInDb) {
                console.log("User BTC balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient BTC balance",
                  statusCode: 401
                });
              }
              if (userReceiverBTCAddress == userBTCAddressInDb) {
                console.log("User address and userReceiverBTCAddress Same !!!");
                return res.json({
                  "message": "userReceiverBTCAddress and Your BTC Address Same",
                  statusCode: 401
                });
              }
              console.log("Spending password is valid!!!");
              var minimumNumberOfConfirmation = 1;
              var netamountToSend = parseFloat(userBTCAmountToSend).toFixed(8) - parseFloat(transactionFeeBTC).toFixed(8);
              console.log("clientBTC netamountToSend :: " + netamountToSend);
              clientBTC.cmd('sendfrom', userEmailAddress, userReceiverBTCAddress, parseFloat(netamountToSend).toFixed(8),
                minimumNumberOfConfirmation, userReceiverBTCAddress, userReceiverBTCAddress,
                function(err, TransactionDetails, resHeaders) {
                  if (err) {
                    console.log("Error from sendFromBTCAccount:: ");
                    if (err.code && err.code == "ECONNREFUSED") {
                      return res.json({
                        "message": "BTC Server Refuse to connect App",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -5) {
                      return res.json({
                        "message": "Invalid BTC Address",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -6) {
                      return res.json({
                        "message": "Account has Insufficient funds",
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
                  console.log('TransactionDetails :', TransactionDetails);
                  console.log("userBTCAddressInDb :: " + userBTCAddressInDb);
                  console.log("userBTCAmountToSend  :: " + userBTCAmountToSend);
                  var updatedBTCbalance = (parseFloat(userBTCBalanceInDb).toFixed(8) - parseFloat(userBTCAmountToSend).toFixed(8));
                  console.log("Update new Balance of user in DB ::" + parseFloat(updatedBTCbalance).toFixed(8));
                  User.update({
                      email: userEmailAddress
                    }, {
                      BTCbalance: parseFloat(updatedBTCbalance).toFixed(8)
                    })
                    .exec(function(err, updatedUser) {
                      if (err) {
                        return res.json({
                          "message": "Error to update User",
                          statusCode: 400
                        });
                      }
                      User.findOne({
                          email: userEmailAddress
                        }).populateAll()
                        .exec(function(err, user) {
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
                          console.log("Return user details after sending amount!!");
                          res.json({
                            user: user,
                            statusCode: 200
                          });
                        });
                    });
                });
            }
          });
      }
    });
  },
  sendBCH: function(req, res, next) {
    console.log("Enter into sendBCH with ::: " + JSON.stringify(req.body));
    var userEmailAddress = req.body.userMailId;
    var userBCHAmountToSend = parseFloat(req.body.amount).toFixed(8);
    var userReceiverBCHAddress = req.body.recieverBCHCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var userCommentForReceiver = req.body.commentForReciever;
    var userCommentForSender = req.body.commentForSender;
    var minimumAmountBCHSentByUser = 0.008;
    miniBCHAmountSentByUser = parseFloat(minimumAmountBCHSentByUser).toFixed(8);

    if (!userEmailAddress || !userBCHAmountToSend || !userReceiverBCHAddress ||
      !userSpendingPassword || !userCommentForReceiver || !userCommentForSender) {
      console.log("Invalid Parameter by user!!!");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    if (userBCHAmountToSend < minimumAmountBCHSentByUser) {
      console.log("amount in not less 0.08 !!!");
      return res.json({
        "message": "BCH Amount not less than " + minimumAmountBCHSentByUser,
        statusCode: 400
      });
    }
    User.findOne({
      email: userEmailAddress
    }).exec(function(err, userDetails) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!userDetails) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      var userBCHBalanceInDb = parseFloat(userDetails.BCHbalance).toFixed(8);
      var userBCHAddressInDb = userDetails.userBCHAddress;
      console.log("UserAMount in database ::: " + userDetails.BCHbalance);
      console.log("BCH Amount send by user ::: " + userBCHAmountToSend);
      if (userBCHAmountToSend > userBCHBalanceInDb) {
        console.log("BCH Amount amount Exceed !!!");
        return res.json({
          "message": "You have Insufficient BCH balance",
          statusCode: 401
        });
      }
      if (userReceiverBCHAddress == userBCHAddressInDb) {
        console.log("User address and recieverBCHCoinAddress Same !!!");
        return res.json({
          "message": "recieverBCHCoinAddress and Your BCH Address Same",
          statusCode: 401
        });
      }
      User.compareSpendingpassword(userSpendingPassword, userDetails, function(err, valid) {
        if (err) {
          console.log("Error to compare password");
          return res.json({
            "message": err,
            statusCode: 400
          });
        }
        if (!valid) {
          console.log("Spending password is invalid !!!");
          return res.json({
            "message": "Please enter correct spending password",
            statusCode: 400
          });
        } else {
          console.log("Spending password is valid!!!");
          var minimumNumberOfConfirmation = 1;
          var netAmountToSend = parseFloat(userBCHAmountToSend).toFixed(8) - parseFloat(transactionFeeBCH).toFixed(8);
          console.log(userEmailAddress + " netAmountToSend ::: " + netAmountToSend);
          console.log(userEmailAddress + " transactionFeeBCH ::: " + transactionFeeBCH);

          clientBCH.cmd('sendfrom', userEmailAddress, userReceiverBCHAddress, parseFloat(netAmountToSend).toFixed(8),
            minimumNumberOfConfirmation, userReceiverBCHAddress, userReceiverBCHAddress,
            function(err, TransactionDetails, resHeaders) {
              if (err) {
                console.log("Error from sendFromBCHAccount:: " + err);
                if (err.code && err.code == "ECONNREFUSED") {
                  return res.json({
                    "message": "BCH Server Refuse to connect App",
                    statusCode: 400
                  });
                }
                if (err.code && err.code == -5) {
                  return res.json({
                    "message": "Invalid BCH Address",
                    statusCode: 400
                  });
                }
                if (err.code && err.code == -6) {
                  return res.json({
                    "message": "Account has Insufficient funds",
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
              console.log('TransactionDetails :', TransactionDetails);
              console.log("User balance in db:: " + userBCHBalanceInDb);
              console.log("UserBCHAmountToSend  :: " + userBCHAmountToSend);

              var updatedBCHbalance = parseFloat(userBCHBalanceInDb).toFixed(8) - parseFloat(userBCHAmountToSend).toFixed(8);
              console.log("Update new Balance of user in DB ::" + updatedBCHbalance);
              User.update({
                  email: userEmailAddress
                }, {
                  BCHbalance: updatedBCHbalance
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    return res.json({
                      "message": "Error to update User",
                      statusCode: 400
                    });
                  }
                  User.findOne({
                      email: userEmailAddress
                    }).populateAll()
                    .exec(function(err, user) {
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
                      console.log("Update User details of BCH " +
                        JSON.stringify(user));
                      res.json({
                        user: user,
                        statusCode: 200
                      });
                    });
                });
            });
        }
      });
    });
  },
  sellBCH: function(req, res, next) {
    console.log("Enter into sellBCHCoinByUserWithFeeBlockIO with ::: " + JSON.stringify(req.body));
    var userEmailId = req.body.userMailId;
    var usersellAmountBTC = parseFloat(req.body.sellAmountBTC).toFixed(8);
    var usersellAmountBCH = parseFloat(req.body.sellAmountBCH).toFixed(8);
    var userSpendingPassword = req.body.spendingPassword;
    var userCommentForReciever = req.body.commentForReciever;
    var userCommentForSender = req.body.commentForSender;
    var minimumAmountBCHToSell = 0.008;

    if (!userEmailId || !usersellAmountBTC || !usersellAmountBCH ||
      !userSpendingPassword || !userCommentForReciever || !userCommentForSender) {
      console.log("Invalid Parameter by user!!!");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    if (usersellAmountBCH <= minimumAmountBCHToSell) {
      console.log("amount in not less the " + minimumAmountBCHToSell);
      return res.json({
        "message": "BCH amount for sell is not less " + minimumAmountBCHToSell,
        statusCode: 400
      });
    }
    User.findOne({
        email: userEmailId
      })
      .exec(function(err, userDetails) {
        if (err) {
          console.log("Error to get userDetails!!!");
          return res.json({
            "message": "Error to get user details",
            statusCode: 400
          });
        }
        if (!userDetails) {
          return res.json({
            "message": "Invalid email!",
            statusCode: 401
          });
        }
        var userBTCBalanceInDb = parseFloat(userDetails.BTCbalance).toFixed(8);
        var userBCHBalanceInDb = parseFloat(userDetails.BCHbalance).toFixed(8);

        var userBTCAddressInDb = userDetails.userBTCAddress;
        var userBCHAddressInDb = userDetails.userBCHAddress;
        var userAccount = userDetails.email;
        console.log("userBCHBalanceInDb :: " + userBCHBalanceInDb);
        console.log("usersellAmountBCH :: " + usersellAmountBCH);
        if (usersellAmountBCH > userBCHBalanceInDb) {
          console.log(" User have Insufficient fund!!! ");
          return res.json({
            "message": "Amount exceed for this transaction",
            statusCode: 400
          });
        }
        User.compareSpendingpassword(userSpendingPassword, userDetails, function(err, valid) {
          if (err) {
            console.log("Error to Compare Spedning password");
            return res.json({
              "message": err,
              statusCode: 400
            });
          }
          if (!valid) {
            console.log("Invalid Spending password!!!");
            return res.json({
              "message": "Invalid spendingpassword",
              statusCode: 400
            });
          } else {

            console.log("User spendingpassword is valid::");
            //Move from user account to companyBCHAccount Useing On BCH Server
            clientBCH.cmd('move',
              userAccount,
              companyBCHAccount,
              parseFloat(usersellAmountBCH).toFixed(8),
              function(err, transactionBCH, resHeaders) {
                if (err) {
                  console.log("Error from sendFromBCHAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    console.log("BCH Server Refuse to connect App");
                    return res.json({
                      "message": "BCH Server Refuse to connect App",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code == -5) {
                    console.log("Invalid BCH Address");
                    return res.json({
                      "message": "Invalid BCH Address",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code == -6) {
                    console.log("Account has Insufficient funds");
                    return res.json({
                      "message": "Account has Insufficient funds",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    console.log("Problem in BCH server");
                    return res.json({
                      "message": "Problem in BCH server",
                      statusCode: 400
                    });
                  }
                  console.log("Error in BCH Server");
                  return res.json({
                    "message": "Error in BCH Server",
                    statusCode: 400
                  });
                } else {
                  //Not error in BCH Transaction
                  console.log("transactionBCH ::: " + transactionBCH);
                  if (transactionBCH == true) {

                    console.log("Transaction successfully for move user To Company BCHacc::: " + transactionBCH);
                    clientBTC.cmd('move',
                      companyBTCAccount,
                      userAccount,
                      usersellAmountBTC,
                      function(err, transactionBTC, resHeaders) {
                        if (err) {
                          console.log("Error from sendFromBCHAccount:: ");
                          if (err.code && err.code == "ECONNREFUSED") {
                            console.log("BCH Server Refuse to connect App");
                            return res.json({
                              "message": "BCH Server Refuse to connect App",
                              statusCode: 400
                            });
                          }
                          if (err.code && err.code == -5) {
                            console.log("Invalid BCH Address");
                            return res.json({
                              "message": "Invalid BCH Address",
                              statusCode: 400
                            });
                          }
                          if (err.code && err.code == -6) {
                            console.log("Account has Insufficient funds");
                            return res.json({
                              "message": "Account has Insufficient funds",
                              statusCode: 400
                            });
                          }
                          if (err.code && err.code < 0) {
                            console.log("Problem in BCH server");
                            return res.json({
                              "message": "Problem in BCH server",
                              statusCode: 400
                            });
                          }
                          console.log("Error in BCH Server");
                          return res.json({
                            "message": "Error in BCH Server",
                            statusCode: 400
                          });
                        } else {
                          //Not error in Send BCT
                          console.log("transactionBTC ::: " + transactionBTC);
                          if (transactionBTC == true) {
                            console.log("Transaction successfully for move user To Company acc::: " + transactionBTC);
                            var updatedBCHbalance = (parseFloat(userBCHBalanceInDb).toFixed(8) - parseFloat(usersellAmountBCH).toFixed(8));
                            var updatedBTCbalance =
                              (parseFloat(userBTCBalanceInDb) +
                                parseFloat(usersellAmountBTC)).toFixed(8);
                            User.update({
                                email: userEmailId
                              }, {
                                BTCbalance: parseFloat(updatedBTCbalance).toFixed(8),
                                BCHbalance: parseFloat(updatedBCHbalance).toFixed(8)
                              })
                              .exec(function(err, updatedUser) {
                                if (err) {
                                  console.log("Error to udpate .....");
                                  return res.json({
                                    "message": "Error to update User Details",
                                    statusCode: 400
                                  });
                                }
                                User.findOne({
                                  email: userEmailId
                                }).populateAll().exec(function(err, user) {
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
                                  return res.json({
                                    user: user,
                                    statusCode: 200
                                  });
                                });
                              });

                          } else {
                            return res.json({
                              "message": "Transaction Failed BTC",
                              statusCode: 400
                            });
                          }
                        }

                      });

                  } else {
                    //Error to send BCH From user account to companyBCH account
                    console.log("Error to send BCH From user account to companyBCH account ");
                    return res.json({
                      "message": "Transaction Failed BCH",
                      statusCode: 400
                    });
                  }
                }

              });

          }
        });
      });
  },
  buyBCH: function(req, res, next) {

    console.log("Enter into buyBCH with ::: ");
    var userEmailId = req.body.userMailId;
    var userbuyAmountBTC = parseFloat(req.body.buyAmountBTC).toFixed(8);
    var userbuyAmountBCH = parseFloat(req.body.buyAmountBCH).toFixed(8);
    var userSpendingPassword = req.body.spendingPassword;
    var userCommentForReceiver = req.body.commentForReciever;
    var userCommentForSender = req.body.commentForSender;
    var minimumAmountBCHToBuy = 0.008;
    minimumAmountBCHToBuy = parseFloat(minimumAmountBCHToBuy).toFixed(8);

    if (!userEmailId || !userbuyAmountBTC || !userbuyAmountBCH || !userSpendingPassword ||
      !userCommentForReceiver || !userCommentForSender) {
      console.log("Invalid Parameter by user!!!");
      res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    console.log("userbuyAmountBCH :" + userbuyAmountBCH);
    console.log("minimumAmountBCHToBuy :" + minimumAmountBCHToBuy);
    if (userbuyAmountBCH < minimumAmountBCHToBuy) {
      console.log("BCH buy amount in not less " + minimumAmountBCHToBuy);
      return res.json({
        "message": "BCH Amount to buy not less then " + minimumAmountBCHToBuy,
        statusCode: 400
      });
    }
    User.findOne({
        email: userEmailId
      })
      .exec(function(err, userDetails) {
        if (err) {
          console.log("Error to get User Details");
          return res.json({
            "message": "Error to get user details",
            statusCode: 400
          });
        }
        if (!userDetails) {
          return res.json({
            "message": "Invalid email Id",
            statusCode: 400
          });
        }
        var userBTCBalanceInDb = parseFloat(userDetails.BTCbalance).toFixed(8);
        var userBCHBalanceInDb = parseFloat(userDetails.BCHbalance).toFixed(8);
        var userBTCAddressInDb = userDetails.userBTCAddress;
        var userBCHAddressInDb = userDetails.userBCHAddress;
        var userAccount = userDetails.email;
        console.log("User BTC balance in database ::: " + userBTCBalanceInDb);
        console.log("User BTC amount send ::: " + userBTCBalanceInDb);

        if (userBTCBalanceInDb < userbuyAmountBTC) {
          console.log(" User have Insufficient fund in BTC Server !!!");
          return res.json({
            "message": "You have Insufficient",
            statusCode: 400
          });
        }
        var minimumAmountBCHToBCH = 0.008;
        if (userbuyAmountBCH < minimumAmountBCHToBCH) {
          return res.json({
            "message": "Miimum buy BCH amount " + minimumAmountBCHToBCH,
            statusCode: 401
          });
        }
        User.compareSpendingpassword(userSpendingPassword, userDetails, function(err, valid) {
          if (err) {
            console.log("Error to Compare SpendingPassword!!!");
            return res.json({
              "message": "Error to compare password",
              statusCode: 400
            });
          }
          if (!valid) {
            console.log("Invalid SpendingPassword!!!");
            return res.json({
              "message": "Pleae enter valid Spending Password",
              statusCode: 400
            });
          } else {
            console.log("User spendingpassword is valid ::");
            //Move from user account to companyBCHAccount Useing On BCH Server
            clientBTC.cmd('move',
              userAccount,
              companyBTCAccount,
              userbuyAmountBTC,
              function(err, transactionBuBCH, resHeaders) {
                if (err) {
                  console.log("Error from sendFromBCHAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    console.log("BCH Server Refuse to connect App");
                    return res.json({
                      "message": "BCH Server Refuse to connect App",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code == -6) {
                    console.log("Account has Insufficient funds");
                    return res.json({
                      "message": "Account has Insufficient funds",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    console.log("Problem in BCH server");
                    return res.json({
                      "message": "Problem in BCH server",
                      statusCode: 400
                    });
                  }
                  console.log("Error in BCH Server");
                  return res.json({
                    "message": "Error in BCH Server",
                    statusCode: 400
                  });
                } else {
                  //Not error in BCH Transaction
                  console.log("transactionBuBCH ::: " + transactionBuBCH);
                  if (transactionBuBCH == true) {

                    console.log("Transaction successfully for move user To Company BCHacc::: " + transactionBuBCH);
                    clientBCH.cmd('move',
                      companyBCHAccount,
                      userAccount,
                      userbuyAmountBCH,
                      function(err, transactionBuyBTC, resHeaders) {
                        if (err) {
                          console.log("Error from sendFromBCHAccount:: ");
                          if (err.code && err.code == "ECONNREFUSED") {
                            console.log("BCH Server Refuse to connect App");
                            return res.json({
                              "message": "BCH Server Refuse to connect App",
                              statusCode: 400
                            });
                          }

                          if (err.code && err.code == -6) {
                            console.log("Account has Insufficient funds");
                            return res.json({
                              "message": "Account has Insufficient funds",
                              statusCode: 400
                            });
                          }
                          if (err.code && err.code < 0) {
                            console.log("Problem in BCH server");
                            return res.json({
                              "message": "Problem in BCH server",
                              statusCode: 400
                            });
                          }
                          console.log("Error in BCH Server");
                          return res.json({
                            "message": "Error in BCH Server",
                            statusCode: 400
                          });
                        } else {
                          //Not error in Send BCT
                          console.log("transactionBuyBTC ::: " + transactionBuyBTC);
                          if (transactionBuyBTC == true) {
                            console.log("Transaction successfully for move user To Company acc::: " + transactionBuyBTC);
                            var updatedBTCbalance = (parseFloat(userBTCBalanceInDb).toFixed(8) - parseFloat(userbuyAmountBTC).toFixed(8));
                            var updatedBCHbalance = (parseFloat(userBCHBalanceInDb) +
                              parseFloat(userbuyAmountBCH)).toFixed(8);

                            User.update({
                                email: userEmailId
                              }, {
                                BTCbalance: parseFloat(updatedBTCbalance).toFixed(8),
                                BCHbalance: parseFloat(updatedBCHbalance).toFixed(8)
                              })
                              .exec(function(err, updatedUser) {
                                if (err) {
                                  console.log("Error to udpate .....");
                                  return res.json({
                                    "message": "Error to update User Details",
                                    statusCode: 400
                                  });
                                }
                                User.findOne({
                                  email: userEmailId
                                }).populateAll().exec(function(err, user) {
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
                                  return res.json({
                                    user: user,
                                    statusCode: 200
                                  });
                                });
                              });

                          } else {
                            return res.json({
                              "message": "Transaction Failed BTC",
                              statusCode: 400
                            });
                          }
                        }

                      });

                  } else {
                    //Error to send BCH From user account to companyBCH account
                    console.log("Error to send BCH From user account to companyBCH account ");
                    return res.json({
                      "message": "Transaction Failed BCH",
                      statusCode: 400
                    });
                  }
                }

              });


            //
            // var amountWithdrawnFromUserBTCAccount=withdrawTransactioDetails.data.amount_withdrawn;
            // console.log("WithdrawTransactioDetails Amount: "+amountWithdrawnFromUserBTCAccount);
            // var updatedBTCbalance = (parseFloat(userDetails.BTCbalance).toFixed(8) -
            //                          parseFloat(amountWithdrawnFromUserBTCAccount).toFixed(8));
            // var minimumNumberOfConfirmation=3;
            // clientBCH.cmd('sendfrom',
            //   companyBCHAccount,
            //   userBCHAddressInDb,
            //   userbuyAmountBCH,
            //   minimumNumberOfConfirmation,
            //   companyBCHAccountAddress,
            //   companyBCHAccountAddress,
            //   function(err, TransactionDetails, resHeaders) {
            //     if (err){
            //           console.log("Error from sendFromBCHAccount:: ");
            //           if(err.code && err.code== "ECONNREFUSED"){
            //               return res.json({"message":"BCH Server Refuse to connect App" ,statusCode: 400});
            //           }
            //           if(err.code && err.code== -5){
            //               return res.json({"message":"Invalid BCH Address" ,statusCode: 400});
            //           }
            //           if(err.code && err.code== -6){
            //               return res.json({"message":"Account has Insufficient funds" ,statusCode: 400});
            //           }
            //           if(err.code && err.code < 0){
            //               return res.json({"message":"Problem in BCH server" ,statusCode: 400});
            //           }
            //           return res.json({"message":"Error in BCH Server",statusCode: 400});
            //     }
            //     console.log('Company BCH Sent Succesfully in UserBCHAddress txid: ', TransactionDetails);
            //     clientBCH.cmd('gettransaction', TransactionDetails,
            //       function(err, compleateTransactionDetails, resHeaders) {
            //         if (err){
            //
            //               console.log("Error from gettransaction:: ");
            //               if(err.code && err.code== "ECONNREFUSED"){
            //                   return res.json({"message":"BCH Server Refuse to connect App" ,statusCode: 400});
            //               }
            //               if(err.code && err.code < 0){
            //                   return res.json({"message":"Problem in getTransaction BCH server" ,statusCode: 400});
            //               }
            //               return res.json({"message":"Error in BCH Server",statusCode: 400});
            //         }
            //         var networkFeeByBCHServerForThisTransaction = parseFloat(Math.abs(compleateTransactionDetails.fee)).toFixed(8);
            //         var updatedBCHbalance = (parseFloat(userBCHBalanceInDb) + parseFloat(userbuyAmountBCH)).toFixed(8);
            //         updatedBCHbalance = parseFloat(updatedBCHbalance).toFixed(8) -  parseFloat(networkFeeByBCHServerForThisTransaction).toFixed(8);
            //         console.log("User BCH balance In DB ::: "+userBCHBalanceInDb);
            //         console.log("User BTC balance In DB ::: "+userBTCBalanceInDb);
            //         console.log("Amount Withdrawn From User BTC Account ::: "+amountWithdrawnFromUserBTCAccount);
            //         console.log("User BCH userbuyAmountBCH  ::: "+userbuyAmountBCH);
            //         console.log("Fee :: " +networkFeeByBCHServerForThisTransaction);
            //         console.log("UpdateUser BCH balance ::: "+updatedBCHbalance);
            //         console.log("UpdateUser BTC balance ::: "+updatedBTCbalance);
            //         User.update({
            //             email: userEmailId
            //           }, {
            //             BTCbalance: parseFloat(updatedBTCbalance).toFixed(8),
            //             BCHbalance: parseFloat(updatedBCHbalance).toFixed(8)
            //           })
            //           .exec(function(err, updatedUser) {
            //             if (err) {
            //               res.json({
            //                 "message": "Error to update User",
            //                 statusCode: 400
            //               });
            //             }
            //             User.findOne({
            //               email: userEmailId
            //             }).populateAll().exec(function (err, user){
            //               if (err) {
            //                 return res.json( {"message": "Error to find user",statusCode: 401});
            //               }
            //               if (!user) {
            //                 return res.json( {"message": "Invalid email!",statusCode: 401});
            //               }
            //               console.log("Returned updated User!!! ");
            //                 return  res.json({user: user,statusCode: 200});
            //             });
            //           });
            //       });
            //   });
            //


          }
        });
      });
  },
  getTxsListBCH: function(req, res, next) {
    console.log("Enter into getTransactionListBCH::: ");
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
        console.log("Error to find user !!!");
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        console.log("Invalid Email !!!");
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      clientBCH.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
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
          console.log("Return transactionList List !! ");
          // for(var i = 0; i < transactionList.length; i++) {
          //   console.log("transactionList.account ::"+transactionList[i].address);
          //   if(transactionList[i].comment == companyBCHAccountAddress){
          //     console.log("companyBCHAccountAddress found !!!");
          //       delete transactionList[i];
          //   }
          // }
          return res.json({
            "tx": transactionList,
            statusCode: 200
          });
        });
    });
  },
  getTxsListBTC: function(req, res, next) {

    console.log("Enter into getTxsListBTC::: ");
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
        console.log("Error to find user !!!");
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        console.log("Invalid Email !!!");
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      clientBTC.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
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
          console.log("Return transactionList List !! ");
          // for(var i = 0; i < transactionList.length; i++) {
          //   console.log("transactionList.account ::"+transactionList[i].address);
          //   if(transactionList[i].comment == companyBCHAccountAddress){
          //     console.log("companyBCHAccountAddress found !!!");
          //       delete transactionList[i];
          //   }
          // }
          return res.json({
            "tx": transactionList,
            statusCode: 200
          });
        });
    });
  },
  getBalBCH: function(req, res, next) {
    console.log("Enter into getBalBCH::: ");
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
    }).populateAll().exec(function(err, user) {
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
      console.log("Valid User :: " + JSON.stringify(user));
      console.log("UserBCH Balance ::" + user.BCHbalance);
      var userBCHBalanceInDb = parseFloat(user.BCHbalance).toFixed(8);
      var userFreezedBCHBalanceInDb = parseFloat(user.FreezedBCHbalance).toFixed(8);
      clientBCH.cmd(
        'getbalance',
        userMailId,
        function(err, userBCHBalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromBCHAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "BCH Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code == -5) {
              return res.json({
                "message": "Invalid BCH Address",
                statusCode: 400
              });
            }
            if (err.code && err.code == -6) {
              return res.json({
                "message": "Account has Insufficient funds",
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
          var totalBCHBalance = (parseFloat(userFreezedBCHBalanceInDb) + parseFloat(userBCHBalanceInDb)).toFixed(8);
          console.log(parseFloat(userBCHBalanceFromServer).toFixed(8) + " BHC server and in DB BCH + Freezed " + parseFloat(totalBCHBalance).toFixed(8));
          if (parseFloat(userBCHBalanceFromServer).toFixed(8) > parseFloat(totalBCHBalance).toFixed(8)) {
            console.log("UserBalance Need to update ............");
            User.update({
                email: userMailId
              }, {
                BCHbalance: parseFloat(userBCHBalanceFromServer).toFixed(8)
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.json({
                    "message": "Error to update User balance",
                    statusCode: 400
                  });
                }
                User.findOne({
                  email: userMailId
                }).populateAll().exec(function(err, user) {
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
                  console.log("Return Update details for BCH balance :: " + user);
                  res.json({
                    user: user,
                    statusCode: 200
                  });
                });
              });
          } else {
            console.log("No need to update ");
            res.json({
              user: user,
              statusCode: 200
            });
          }
        });
    });
  },
  getBalBTC: function(req, res, next) {
    console.log("Enter into getBalBTC::: ");
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
    }).populateAll().exec(function(err, user) {
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
      console.log("Valid User :: " + JSON.stringify(user));
      console.log("UserBCH Balance ::" + user.BTCbalance);
      var userBTCBalanceInDb = parseFloat(user.BTCbalance).toFixed(8);
      var userFreezedBTCBalanceInDb = parseFloat(user.FreezedBTCbalance).toFixed(8);
      clientBTC.cmd(
        'getbalance',
        userMailId,
        function(err, userBTCBalanceFromServer, resHeaders) {
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
          var totalBTCBalance = (parseFloat(userFreezedBTCBalanceInDb) + parseFloat(userBTCBalanceInDb)).toFixed(8);
          console.log(parseFloat(userBTCBalanceFromServer).toFixed(8) + " on server and in DB BTC + Freezed :: " + parseFloat(totalBTCBalance).toFixed(8));
          if (parseFloat(userBTCBalanceFromServer).toFixed(8) > parseFloat(totalBTCBalance).toFixed(8)) {
            console.log("UserBalance Need to update ............");
            User.update({
                email: userMailId
              }, {
                BTCbalance: parseFloat(userBTCBalanceFromServer).toFixed(8)
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.json({
                    "message": "Error to update User balance",
                    statusCode: 400
                  });
                }
                User.findOne({
                  email: userMailId
                }).populateAll().exec(function(err, user) {
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
                  console.log("Return Update details for BTC balance :: " + user);
                  res.json({
                    user: user,
                    statusCode: 200
                  });
                });
              });
          } else {
            console.log("No need to update ");
            res.json({
              user: user,
              statusCode: 200
            });
            // res.json({
            //   "message": "No need to update",
            //   statusCode: 201
            // });
          }
        });
    });
  },
};