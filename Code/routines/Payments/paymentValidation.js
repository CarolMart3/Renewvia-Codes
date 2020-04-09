var mpesa = require("../../apis/mpesa");
var paga = require("../../apis/paga");
var sparkmeter = require("../../apis/sparkmeter");
var database = require("../../apis/database");
var email = require("../../apis/email");
// var telerivet = require("./../apis/telerivet");
var newCustomer = require("../Forms/newCustomer");
var cldashes =
  "-------------------------------------------------------------------";

exports.processValidation = processValidation;

async function processValidation(payment) {
  console.log("Payment Validation has begun");
  console.log(cldashes);
  var acceptance = false;

  // 1. Log this message in the validations database
  // 2. Check if the customer is registered on a metering platform
  // 3. Take the result of that check and do some logic
  // 4. Log the final result in our database
  // 5. Format and send back the appropriate response to the payment platform

  try {
    // Log this in the database
    payment = await submitDbQueryValidationLog(payment);

    // Check for customer existence
    if (customerAccountNumber.length !== 0) {
      console.log("Checking for customer existence.");
      var existence = await checkCustomerExistence(payment);
      console.log("Customer existence is: " + existence);

      // Check in the signup list
      if (existence === false) {
        var signupStatus = await checkSigningUpStatus(payment);
        console.log("Signup status is: " + signupStatus);
        if (signupStatus === true) {
          acceptance = true;
        } else {
          acceptance = false;
        }
      } else if (existence === true) {
        acceptance = true;
      } else {
        acceptance = "error";
      }
    } else {
      acceptance = false;
    }

    // Log the result in our database
    if (acceptance === true) {
      payment.sparkMeterResponse = "Accepted";
      payment.renewviaResponse = "Accepted";
    } else {
      payment.sparkMeterResponse = "Rejected";
      payment.renewviaResponse = "Rejected";
    }

    console.log("Payment should be: " + payment.sparkMeterResponse);
    await submitDbQueryValidationResultSparkMeter(payment);
    await submitDbQueryValidationResultRenewvia(payment);

    // Format and send back the response
    var response = formatValidationResponse(payment);
    console.log(
      "The data object for this transaction is: " + JSON.stringify(payment)
    );
    return response;
  } catch (error) {
    console.log("Payment processor acknowledges error validating payment.");
    payment.sparkMeterResponse = "Error";
    payment.renewviaResponse = "Rejected";
    // email.sendEmail("There was a problem validation payment " + payment.transactionID + ".\nHere is the transaction data object: " + JSON.stringify(payment));
    return;
  }
}

async function checkCustomerExistence(payment) {
  console.log("Checking for customer existence has begun");
  var existence = false; // Declaring this false is a fail-safe. Payments should be rejected unless they have a place to go.

  console.log(payment.meterPlatform);
  if (payment.meterPlatform === "sparkmeter") {
    try {
      var customerInfo = await sparkmeter.getCustomerInfo(
        payment.customerAccountNumber
      );
      if (customerInfo.error === "no such customer") {
        existence = false;
      } else if (customerInfo.error === null) {
        existence = true;
      }
      console.log("customerInfo.error is: " + customerInfo.error);
    } catch (e) {
      console.log("There was an error, so this payment will be rejected.");
      existence = false;
    }
  } else if (payment.meterPlatform === "steamaco") {
    // Put SteamaCo logic here
  } else if (payment.meterPlatform === "sts") {
    // Put dumb meter checking logic here
  }

  return existence;
}

async function checkSigningUpStatus(payment) {
  // If the customer doesn't exist on a metering platform, maybe the customer is just signing up. This checks that.
  // If the Renewvia agent doing the signup has reserved the account number, the payment will be accepted.

  console.log(
    "Customer doesn't exist on metering platform, now checking to see if they are signing up."
  );
  var signupCheck = await newCustomer.checkAccountNumberStatus(
    payment.customerAccountNumber
  );
  console.log("Signup check is: " + signupCheck);

  if (signupCheck === "New signup" || signupCheck === "Paying") {
    // "Paying" would be there if they attempted a validation before and somehow it didn't go through
    // For example, Paga seems to send two separate validations for each payment over USSD, the first of
    // which will cause signUp check to be read as "Paying" when the second one comes in.
    await newCustomer.modifyAccountNumberStatus(
      payment.customerAccountNumber,
      "Paying"
    );
    return true;
  } else {
    return false;
  }
}

async function formatValidationResponse(payment) {
  var response;

  if (payment.paymentProcessor === "mpesa") {
    response = mpesa.formatValidationResponse(payment);
  } else if (payment.paymentProcessor === "paga") {
    response = paga.formatValidationResponse(payment);
  }

  console.log("Response to payment processor is: " + JSON.stringify(response));
  return response;
}

async function submitDbQueryValidationLog(payment) {
  try {
    console.log(cldashes);
    console.log(
      "The handler for posting validation messages to the database has begun"
    );

    // Start with the whole thing and subtract what isn't logged.
    // This method of copying objects only works for properties but not methods. That's ok, we don't have any
    // methods assigned to the payment object yet. And this copy is just for logging things to the database.
    // But if we ever assign methods to the payment object and call them for the sake of database logging, watch out!
    var transactionDataObjectForDB = JSON.parse(JSON.stringify(payment));

    // This is the same as for the confirmation logs:
    delete transactionDataObjectForDB.MessageType;
    delete transactionDataObjectForDB.PaymentMessageType;
    delete transactionDataObjectForDB.siteAuthToken;
    delete transactionDataObjectForDB.meterBaseURL;
    delete transactionDataObjectForDB.siteURLPath;
    delete transactionDataObjectForDB.transactionDate;
    delete transactionDataObjectForDB.transactionTime;
    // delete transactionDataObjectForDB.meterCustomerID; //deleteme!
    delete transactionDataObjectForDB.dbID;
    // This is just for validations:
    delete transactionDataObjectForDB.sparkMeterTransactionID; // This won't ever exist for a validation

    // Gotta remove the quotes from the full message or else everything can break
    var newFullMessage = payment.fullMessage.replace(/"/g, "");
    newFullMessage = newFullMessage.replace(/'/g, "");
    transactionDataObjectForDB.fullMessage = newFullMessage;

    // Make the first part of the query string
    var keysList = Object.keys(transactionDataObjectForDB);
    var x;
    var stringForInsertQuery1 = "";
    for (x in keysList) {
      stringForInsertQuery1 += keysList[x] + ", ";
    }

    stringForInsertQuery1 = stringForInsertQuery1.slice(0, -2);

    // Make the second part of the query string
    var i;
    var stringForInsertQuery2 = "";
    for (i in transactionDataObjectForDB) {
      stringForInsertQuery2 += "'" + transactionDataObjectForDB[i] + "', ";
    }
    stringForInsertQuery2 = stringForInsertQuery2.slice(0, -2);

    // Put it together
    var stringForInsertQueryCombined =
      "INSERT INTO renewviadb.validations (" +
      stringForInsertQuery1 +
      ") VALUES (" +
      stringForInsertQuery2 +
      ")";

    var connectionResult = await database.queryDB(stringForInsertQueryCombined);
    console.log("----DB entry row number is " + connectionResult.insertId);
    payment.dbID = connectionResult.insertId;
    return payment;
  } catch (error) {
    await database.handleDBErrors(payment, error, stringForInsertQueryCombined);
    return payment;
  }
}

async function submitDbQueryValidationResultSparkMeter(payment) {
  try {
    console.log(cldashes);
    console.log(
      "The handler for posting SparkMeter validation responses to the database has begun"
    );
    var queryString =
      "UPDATE renewviadb.validations SET sparkMeterResponse='" +
      payment.sparkMeterResponse +
      "' WHERE id=" +
      payment.dbID;
    var connectionResult = await database.queryDB(queryString);
    return connectionResult;
  } catch (error) {
    await database.handleDBErrors(payment, error);
    return;
  }
}

async function submitDbQueryValidationResultRenewvia(payment) {
  try {
    console.log(cldashes);
    console.log(
      "The handler for posting Renewvia validation responses to the database has begun"
    );
    var queryString =
      "UPDATE renewviadb.validations SET renewviaResponse='" +
      payment.renewviaResponse +
      "' WHERE id=" +
      payment.dbID;
    var connectionResult = await database.queryDB(queryString);
    return connectionResult;
  } catch (error) {
    await database.handleDBErrors(payment, error);
    return;
  }
}

// Old main validation routine, before Paga integration

// try {
// var customerInfo = await sparkmeter.getCustomerInfo(payment.customerAccountNumber);

// if (customerInfo.error === "no such customer") {
//     // The customer doesn't exist on SparkMeter, but maybe the customer is just signing up. This checks that.
//     // If the Renewvia agent doing the signup has reserved the account number as signing up, the payment will be accepted.

//     console.log("Customer doesn't exist on SparkMeter, now checking to see if they are signing up.");
//     var signupCheck = await newCustomer.checkAccountNumberStatus(payment.customerAccountNumber);
//     console.log("Signup check is: " + signupCheck);

// if (signupCheck === "New signup") {
//     payment.sparkMeterResponse = "Accepted";
//     payment.renewviaResponse = "Accepted";
//     await newCustomer.modifyAccountNumberStatus(payment.customerAccountNumber, "Paying");
// }

//     // If the customer doesn't exist on SparkMeter nor are they marked as signing up, the payment is rejected.
//     else {
//         payment.sparkMeterResponse = "Rejected";
//         payment.renewviaResponse = "Rejected";
//     }
// }
//         else if (customerInfo.error === null) {
//     payment.sparkMeterResponse = "Accepted";
//     payment.renewviaResponse = "Accepted";
// }
//     }
//     catch (error) {
//     console.log("Payment processor acknowledges error connecting to SparkMeter.");
//     payment.sparkMeterResponse = "Error";
//     payment.renewviaResponse = "Rejected";
//     email.sendEmail("There was a problem connecting to SparkMeter for payment " + payment.transactionID + ".\nHere is the transaction data object: " + JSON.stringify(payment));
// }

// // Log customer existence and Renewvia response in the database
// console.log("Payment should be: " + payment.sparkMeterResponse);
// await submitDbQueryValidationResultMpesa(payment);
// await submitDbQueryValidationResultRenewvia(payment);

// //Respond to M-Pesa
// console.log(cldashes);
// var responseToMpesa = mpesa.formatResponse(payment);
// console.log("Response to M-Pesa is: " + JSON.stringify(responseToMpesa));
// console.log("The data object for this transaction is: " + JSON.stringify(payment));
// return responseToMpesa;
