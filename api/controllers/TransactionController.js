/**
 * TransactionController
 *
 * @description :: Server-side logic for managing transactions
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var request = require('request');
var bcrypt = require('bcrypt');
var nodemailer = require('nodemailer');
var mergeJSON = require("merge-json");
var validator = require('validator');


var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'visioncoin017@gmail.com',
    pass: 'vision@123'
  }
});

module.exports = {

	requestToConvertBTC : function(req, res){

		let email = req.body.email;
		let txId = req.body.txId;
		let amount = req.body.amount;
		
		console.log("requestToConvertBTC"+email + txId + amount);

		if(email || txId || amount){
			
			User.findOne({email : email}).exec(function(err, data){
				if(err){
					return res.json({
						statusCode : 400,
						message : email+" User does not exists!."
					});		
				}
				else{
					if(data){
					let txObj = {
						email : email,
						txId  : txId,
						amount :amount
					}

					Transaction.create(txObj).exec(function(err, result){
						if(err){
							return res.json({
								statusCode : 400,
								message : "Error while saving data in DB"
							});
						}
						else{
							console.log("Ready to send an email");
							var mailOptions = {
					        from: 'visioncoin017@gmail.com',
					        to: email,
					        subject: 'Transact Amount',
					        text: 'We heard to you that you are requested for coneverting BTC to VCN currency' +
					          '\nfor Amount is: ' + amount + " and your transction ID is: " + txId
					      };
						      transporter.sendMail(mailOptions, function(error, info) {
						        if (error) {
						          console.log(error);
						        } else {
						          console.log(newCreatedPassword + 'Email sent: ' + info.response);
						        }
						      });

							return res.json({
								statusCode : 200,
								message : "Invoice has been generated, send on your registered EmailID",
								result : result
							});
						}
					})
				  }
				  else{
				  	return res.json({
						statusCode : 400,
						message : email+" User does not exists!."
					});		
				  }
				}
			});
		}
		else{
			return res.json({
				statusCode : 400,
				message : "Please Fill all required fields"
			});
		}
	},

	getTransactionByEmailId : function(req, res){
		let emailId = req.body.email;

			User.findOne({email : emailId}).exec(function(err, data){
				if(err){
					return res.json({
						statusCode : 400,
						message : emailId+" User does not exists!."
					});		
				}
				else{
					if(data){
							Transaction.find({email : emailId}).exec(function(err, records){
								if(err){
									return res.json({
										statusCode : 400,
										message :"Error to fetching data from DB"
									})
								}
								else{
									return res.json({
										statusCode : 200,
										message : "records get successfully",
										records  : records
									})
								}
							});
						}
						else{
							return res.json({
								sattus  : 400,
								message : 'Please Enter valid EmailID'
							})
						}
			        }
	        })
	},
};

