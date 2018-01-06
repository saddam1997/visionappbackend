var request = require('request');
var async = require('async');

//BTC Wallet Details
var bitcoinBTC = require('bitcoin');
var clientBTC = new bitcoinBTC.Client({
  host: '162.213.252.66',
  port: 18336,
  user: 'test',
  pass: 'test123'
});
var companyBTCAccount = "admin@@visionex.io ";

//BCH Wallet Details
var bitcoinBCH = require('bitcoin');
var clientBCH = new bitcoinBCH.Client({
  host: '162.213.252.66',
  port: 18336,
  user: 'test',
  pass: 'test123'
});
var companyBCHAccount = "admin@@visionex.io ";

module.exports.cron = {
  searchBidJob: {
    schedule: '60 * * * * *',
    onTick: function() {
      console.log("Search in Bid table!!!");
      var options = {
        method: 'GET',
        url: 'https://cex.io/api/ticker/BCH/BTC',
        headers: {
          accept: '*/*',
          'content-type': 'application/json',
          'accept-language': 'en-US,en;q=0.8'
        },
        json: true
      };
      request(options, function(error, response, body) {
        if (error) {
          console.log("Error to get current BCH Price");
        } else {
          console.log("Returning Current price of BCH ");
          var currentBCHPriceDetailsJSON = body;
          var currentBCHBidPrice = parseFloat(currentBCHPriceDetailsJSON.bid).toFixed(8);
          console.log("Current Price of Bid :: " + currentBCHBidPrice);

          Bid.query('SELECT DISTINCT bid.bidowner FROM bid WHERE bid.bidRate >= ?', [currentBCHBidPrice],
            function(err, totalBidWithCurrentPrice) {
              if (err) {
                console.log("Error to in SELECT bid query " + err);
              } else {
                sails.log("totalBidWithCurrentPrice ::: " + JSON.stringify(totalBidWithCurrentPrice));
                async.forEach(totalBidWithCurrentPrice, function(userIdWithBid, callback) {

                  console.log("Bidowner Id :: " + JSON.stringify(userIdWithBid));
                  User.findOne({
                      id: userIdWithBid.bidowner
                    })
                    .populate("bids", {
                      bidRate: {
                        '>=': currentBCHBidPrice
                      }
                    })
                    .exec(function(err, userAllDetailsInDB) {
                      if (err) {
                        console.log("Error to find user");
                      }
                      if (!userAllDetailsInDB) {
                        console.log("Invalid Id!");
                      } else {
                        var bidDetailsSavedInDB = userAllDetailsInDB.bids[0];
                        var totalBidDetails = {
                          totalBidIds: [],
                          totalbidAmountBTC: 0,
                          totalbidAmountBCH: 0
                        }
                        var userTotalBids = userAllDetailsInDB.bids;

                        if (userTotalBids.length > 1) {
                          for (var i = 0; i < userTotalBids.length; i++) {
                            totalBidDetails.totalbidAmountBTC = (parseFloat(totalBidDetails.totalbidAmountBTC) + parseFloat(userTotalBids[i].bidAmountBTC)).toFixed(8);
                            totalBidDetails.totalbidAmountBCH = (parseFloat(totalBidDetails.totalbidAmountBCH) + parseFloat(userTotalBids[i].bidAmountBCH)).toFixed(8);
                            totalBidDetails.totalBidIds.push(userTotalBids[i].id)
                            // console.log(userAllDetailsInDB.email + " totalbidAmountBTC " + totalBidDetails.totalbidAmountBTC);
                            // console.log(userAllDetailsInDB.email + " totalbidAmountBCH " + totalBidDetails.totalbidAmountBTC);
                            // console.log(userAllDetailsInDB.email + " totalBidIds " + totalBidDetails.totalBidIds);
                          }
                        } else if (userTotalBids.length == 1) {
                          totalBidDetails.totalbidAmountBTC = (parseFloat(totalBidDetails.totalbidAmountBTC) + parseFloat(userTotalBids[0].bidAmountBTC)).toFixed(8);
                          totalBidDetails.totalbidAmountBCH = (parseFloat(totalBidDetails.totalbidAmountBCH) + parseFloat(userTotalBids[0].bidAmountBCH)).toFixed(8);
                          totalBidDetails.totalBidIds.push(userTotalBids[0].id);
                          // console.log(userAllDetailsInDB.email + " totalbidAmountBTC " + totalBidDetails.totalbidAmountBTC);
                          // console.log(userAllDetailsInDB.email + " totalbidAmountBCH " + totalBidDetails.totalbidAmountBTC);
                          // console.log(userAllDetailsInDB.email + " totalBidIds " + totalBidDetails.totalBidIds);
                        } else {
                          console.log("No bid find for this user");
                        }
                        if (totalBidDetails.totalbidAmountBTC > 0 && totalBidDetails.totalbidAmountBCH > 0 && totalBidDetails.totalBidIds.length >= 1) {

                          console.log(userAllDetailsInDB.email + " Execute bid with totalbidAmountBTC :: " + totalBidDetails.totalbidAmountBTC);
                          console.log(userAllDetailsInDB.email + " Execute bid with totalbidAmountBCH :: " + totalBidDetails.totalbidAmountBCH);
                          console.log(userAllDetailsInDB.email + " Execute bid with totalBidIds :: " + totalBidDetails.totalBidIds);
                          var userAccount = userAllDetailsInDB.email;
                          var userBCHBalanceInDb = parseFloat(userAllDetailsInDB.BCHbalance).toFixed(8);
                          var userFreezBTCBalanceInDb = parseFloat(userAllDetailsInDB.FreezedBTCbalance).toFixed(8);

                          clientBTC.cmd('move',
                            userAccount,
                            companyBTCAccount,
                            parseFloat(totalBidDetails.totalbidAmountBTC).toFixed(8),
                            function(err, transactionBuBCH, resHeaders) {
                              if (err) {
                                console.log("Error from sendFromBCHAccount:: ");
                                if (err.code && err.code == "ECONNREFUSED") {
                                  console.log("BCH Server Refuse to connect App");
                                }
                                if (err.code && err.code == -6) {
                                  console.log("Account has Insufficient funds");
                                }
                                if (err.code && err.code < 0) {
                                  console.log("Problem in BCH server");
                                }
                                console.log("Error in BCH Server");
                              } else {
                                //Not error in BCH Transaction
                                if (transactionBuBCH == true) {
                                  console.log("Transaction successfully for move user To Company BCHacc::: " + transactionBuBCH);
                                  console.log("BID ::clientBCH  move " + companyBCHAccount + " " + userAccount + " " + parseFloat(bidDetailsSavedInDB.bidAmountBCH).toFixed(8));
                                  clientBCH.cmd('move',
                                    companyBCHAccount,
                                    userAccount,
                                    totalBidDetails.totalbidAmountBCH,
                                    function(err, transactionBuyBTC, resHeaders) {
                                      if (err) {
                                        console.log("Error from sendFromBCHAccount:: ");
                                        if (err.code && err.code == "ECONNREFUSED") {
                                          console.log("BCH Server Refuse to connect App");
                                        }
                                        if (err.code && err.code == -6) {
                                          console.log("Account has Insufficient funds");
                                        }
                                        if (err.code && err.code < 0) {
                                          console.log("Problem in BCH server");

                                        }
                                        console.log("Error in BCH Server");
                                      } else {
                                        //Not error in Send BCT
                                        console.log("BCH TX : " + companyBCHAccount + "  move " + userAccount + " status:: " + transactionBuyBTC);
                                        console.log("transactionBuyBTC ::: " + transactionBuyBTC);
                                        if (transactionBuyBTC == true) {

                                          var updatedFreezedBTCbalance = (parseFloat(userFreezBTCBalanceInDb).toFixed(8) - parseFloat(totalBidDetails.totalbidAmountBTC).toFixed(8));
                                          var updatedBCHbalance = (parseFloat(userBCHBalanceInDb) + parseFloat(totalBidDetails.totalbidAmountBCH)).toFixed(8);
                                          console.log(userAccount + "updatedFreezedBTCbalance :: " + updatedFreezedBTCbalance);
                                          console.log(userAccount + "updatedBCHbalance :: " + updatedBCHbalance);
                                          User.update({
                                              email: userAccount
                                            }, {
                                              FreezedBTCbalance: parseFloat(updatedFreezedBTCbalance).toFixed(8),
                                              BCHbalance: parseFloat(updatedBCHbalance).toFixed(8)
                                            })
                                            .exec(function(err, updatedUser) {
                                              if (err) {
                                                console.log("Error to update User after move bid!!!!!!!!!");
                                              }
                                              console.log("remove bids :: " + totalBidDetails.totalBidIds);
                                              Bid.destroy({
                                                id: totalBidDetails.totalBidIds
                                              }).exec(function(err) {
                                                if (err) {
                                                  console.log("!!!!!!!!!!!!!!! Error to remove bid !!!!!!!!!!!!!!!!!!!!!!!");
                                                }
                                                console.log("Bid removed.... Succesfully");
                                              });
                                            });
                                        } else {
                                          console.log("Transaction Failed BTC !!!!!!!!!");
                                        }
                                      }
                                    });
                                } else {
                                  //Error to send BCH From user account to companyBCH account
                                  console.log("Error to send BCH From user account to companyBCH account!!!!!");
                                }
                              }
                            });
                        }
                      }
                    })
                }, function(err) {
                  if (err) {
                    console.log("Error to async.....");
                  }
                  console.log("Loop compleate for bid. .............");
                });
              }
            });

        }
      });
    }
  },
  searchAskJob: {
    schedule: '60 * * * * *',
    onTick: function() {
      console.log("Search in ask table");
      var options = {
        method: 'GET',
        url: 'https://cex.io/api/ticker/BCH/BTC',
        headers: {
          accept: '*/*',
          'content-type': 'application/json',
          'accept-language': 'en-US,en;q=0.8'
        },
        json: true
      };
      request(options, function(error, response, body) {
        if (error) {
          console.log("Error to get current BCH Price");
        } else {
          var currentBCHPriceDetailsJSON = body;
          if (!currentBCHPriceDetailsJSON) {
            console.log("Error to get current BCH Price of Ask");
          } else {
            console.log("Returning Current price of BCH  for ask");
            var currentBCHPriceDetailsJSON = body;
            var currentBCHAskPrice = parseFloat(currentBCHPriceDetailsJSON.ask).toFixed(8);
            console.log("currentBCHAskPrice " + currentBCHAskPrice);

            Ask.query('SELECT DISTINCT ask.askowner FROM ask WHERE ask.askRate <= ?', [currentBCHAskPrice],
              function(err, totalAskWithCurrentPrice) {
                if (err) {
                  console.log("Error to in SELECT ask query " + err);
                } else {
                  sails.log("totalAskWithCurrentPrice ::: " + JSON.stringify(totalAskWithCurrentPrice));
                  async.forEach(totalAskWithCurrentPrice, function(userIdWithAsk, callback) {
                    console.log("userId :: " + JSON.stringify(userIdWithAsk));
                    User.findOne({
                        id: userIdWithAsk.askowner
                      })
                      .populate("asks", {
                        askRate: {
                          '<=': currentBCHAskPrice
                        }
                      })
                      .exec(function(err, userAllDetailsInDB) {
                        if (err) {
                          console.log("Error to find user");
                        }
                        if (!userAllDetailsInDB) {
                          console.log("Invalid email!");
                        } else {
                          var askDetailsSavedInDB = userAllDetailsInDB.asks[0];
                          var totalaskDetails = {
                            totalaskIds: [],
                            totalaskAmountBTC: 0,
                            totalaskAmountBCH: 0
                          }
                          var userTotalasks = userAllDetailsInDB.asks;

                          if (userTotalasks.length > 1) {
                            for (var i = 0; i < userTotalasks.length; i++) {
                              totalaskDetails.totalaskAmountBTC = (parseFloat(totalaskDetails.totalaskAmountBTC) + parseFloat(userTotalasks[i].askAmountBTC)).toFixed(8);
                              totalaskDetails.totalaskAmountBCH = (parseFloat(totalaskDetails.totalaskAmountBCH) + parseFloat(userTotalasks[i].askAmountBCH)).toFixed(8);
                              totalaskDetails.totalaskIds.push(userTotalasks[i].id)
                              // console.log(userAllDetailsInDB.email + " totalaskAmountBTC " + totalaskDetails.totalaskAmountBTC);
                              // console.log(userAllDetailsInDB.email + " totalaskAmountBCH " + totalaskDetails.totalaskAmountBTC);
                              // console.log(userAllDetailsInDB.email + " totalaskIds " + totalaskDetails.totalaskIds);
                            }
                          } else if (userTotalasks.length == 1) {
                            totalaskDetails.totalaskAmountBTC = (parseFloat(totalaskDetails.totalaskAmountBTC) + parseFloat(userTotalasks[0].askAmountBTC)).toFixed(8);
                            totalaskDetails.totalaskAmountBCH = (parseFloat(totalaskDetails.totalaskAmountBCH) + parseFloat(userTotalasks[0].askAmountBCH)).toFixed(8);
                            totalaskDetails.totalaskIds.push(userTotalasks[0].id);
                            // console.log(userAllDetailsInDB.email + " totalaskAmountBTC " + totalaskDetails.totalaskAmountBTC);
                            // console.log(userAllDetailsInDB.email + " totalaskAmountBCH " + totalaskDetails.totalaskAmountBTC);
                            // console.log(userAllDetailsInDB.email + " totalaskIds " + totalaskDetails.totalaskIds);
                          } else {
                            console.log("No ask find for this user");
                          }
                          if (totalaskDetails.totalaskAmountBTC > 0 && totalaskDetails.totalaskAmountBCH > 0 && totalaskDetails.totalaskIds.length >= 1) {

                            console.log(userAllDetailsInDB.email + "Execute ask with totalaskAmountBTC :: " + totalaskDetails.totalaskAmountBTC);
                            console.log(userAllDetailsInDB.email + "Execute ask with totalaskAmountBCH :: " + totalaskDetails.totalaskAmountBCH);
                            console.log(userAllDetailsInDB.email + "Execute ask with totalaskIds :: " + totalaskDetails.totalaskIds);
                            var userAccount = userAllDetailsInDB.email;
                            var userBTCBalanceInDb = parseFloat(userAllDetailsInDB.BTCbalance).toFixed(8);
                            var userFreezBCHBalanceInDb = parseFloat(userAllDetailsInDB.FreezedBCHbalance).toFixed(8);

                            clientBCH.cmd('move',
                              userAccount,
                              companyBCHAccount,
                              parseFloat(totalaskDetails.totalaskAmountBCH).toFixed(8),
                              function(err, transactionBuBCH, resHeaders) {
                                if (err) {
                                  console.log("Error from sendFromBCHAccount:: ");
                                  if (err.code && err.code == "ECONNREFUSED") {
                                    console.log("BCH Server Refuse to connect App");
                                  }
                                  if (err.code && err.code == -6) {
                                    console.log("Account has Insufficient funds");
                                  }
                                  if (err.code && err.code < 0) {
                                    console.log("Problem in BCH server");
                                  }
                                  console.log("Error in BCH Server");
                                } else {
                                  //Not error in BCH Transaction
                                  if (transactionBuBCH == true) {
                                    console.log("Transaction successfully for move user To Company BCHacc::: " + transactionBuBCH);
                                    console.log("ask ::clientBCH  move " + companyBCHAccount + " " + userAccount + " " + parseFloat(askDetailsSavedInDB.askAmountBCH).toFixed(8));
                                    clientBTC.cmd('move',
                                      companyBTCAccount,
                                      userAccount,
                                      parseFloat(totalaskDetails.totalaskAmountBTC).toFixed(8),
                                      function(err, transactionBuyBTC, resHeaders) {
                                        if (err) {
                                          console.log("Error from sendFromBCHAccount:: ");
                                          if (err.code && err.code == "ECONNREFUSED") {
                                            console.log("BCH Server Refuse to connect App");
                                          }
                                          if (err.code && err.code == -6) {
                                            console.log("Account has Insufficient funds");
                                          }
                                          if (err.code && err.code < 0) {
                                            console.log("Problem in BCH server");

                                          }
                                          console.log("Error in BCH Server");
                                        } else {
                                          //Not error in Send BCT
                                          console.log("BCH TX : " + companyBCHAccount + "  move " + userAccount + " status:: " + transactionBuyBTC);
                                          console.log("transactionBuyBTC ::: " + transactionBuyBTC);
                                          if (transactionBuyBTC == true) {
                                            console.log("parseFloat(userFreezBCHBalanceInDb).toFixed(8) :: " + parseFloat(userFreezBCHBalanceInDb).toFixed(8));
                                            console.log("parseFloat(totalaskDetails.totalaskAmountBCH).toFixed(8) :: " + parseFloat(totalaskDetails.totalaskAmountBCH).toFixed(8));
                                            var updatedFreezedBHCbalance = (parseFloat(userFreezBCHBalanceInDb).toFixed(8) - parseFloat(totalaskDetails.totalaskAmountBCH).toFixed(8));
                                            var updatedBTCbalance = (parseFloat(userBTCBalanceInDb) + parseFloat(totalaskDetails.totalaskAmountBTC)).toFixed(8);
                                            console.log(userAccount + " updatedFreezedBHCbalance :: " + updatedFreezedBHCbalance);
                                            console.log(userAccount + " updatedBTCbalance :: " + updatedBTCbalance);
                                            User.update({
                                                email: userAccount
                                              }, {
                                                FreezedBCHbalance: parseFloat(updatedFreezedBHCbalance).toFixed(8),
                                                BTCbalance: parseFloat(updatedBTCbalance).toFixed(8)
                                              })
                                              .exec(function(err, updatedUser) {
                                                if (err) {
                                                  console.log("Error to update User after move ask!!!!!!!!!");
                                                }
                                                console.log("remove asks :: " + totalaskDetails.totalaskIds);
                                                Ask.destroy({
                                                  id: totalaskDetails.totalaskIds
                                                }).exec(function(err) {
                                                  if (err) {
                                                    console.log("Err to remove ask");
                                                  }
                                                  console.log("ask removed.... Succesfully");
                                                });
                                              });
                                          } else {
                                            console.log("Transaction Failed BTC !!!!!!!!!");
                                          }
                                        }
                                      });
                                  } else {
                                    //Error to send BCH From user account to companyBCH account
                                    console.log("Error to send BCH From user account to companyBCH account!!!!!");
                                  }
                                }
                              });
                          }
                        }
                      })
                  }, function(err) {
                    if (err) {
                      console.log("Error to async.....");
                    }
                    console.log("Loop compleate for ask..............");
                  });
                }
              });
          }
        }
      });
    }
  }
};