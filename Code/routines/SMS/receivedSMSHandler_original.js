var email = require("../../apis/email");
var sparkmeter = require("../../apis/sparkmeter");
// var telerivet = require("./../apis/telerivet");
var myMath = require("../../utilities/myMath");

exports.handleReceivedSMS = handleReceivedSMS;

async function handleReceivedSMS(event) {
  console.log("Handling a received SMS.");
  var receivedMessage = event.message;
  var phoneNumber = event.phoneNumber;
  var errorMessage;

  console.log("The message received is: " + receivedMessage);
  console.log("The phone number is: " + phoneNumber);

  // One try-catch block for things that could go wrong with AWS (unlikely) or SparkMeter (rare but possible)
  try {
    var parsedMessage = await parseReceivedMessage(receivedMessage);
    var responseMessage = await handleParsedMessage(
      parsedMessage,
      phoneNumber,
      receivedMessage
    );
  } catch (e) {
    console.log(
      "You had an error processing an incoming SMS. Here's the error object:\n" +
        e
    );
    errorMessage =
      "You had an error processing an incoming SMS. Message was: " +
      receivedMessage +
      ". Phone number was: " +
      phoneNumber;
    email.sendEmail(errorMessage);
    responseMessage = writeFailureMessageError("English"); // Defaulting to English
  }
  return responseMessage;
}

async function parseReceivedMessage(receivedMessage) {
  console.log("Parsing the received SMS");
  var keyword;
  var customerAccountNumber;
  var parsedMessage = new Object();

  receivedMessage = receivedMessage.toUpperCase();

  // First, we figure out which out the allowed keywords they're sending us.
  // A future improvement to this could be introducing some regex to allow minor misspellings (like "chck" or "stpo" for "check" and "stop")
// make it in a different fucntion and call the fucntion 
// add the correct word for each of them 

keyword = findMessageKeyWord (receivedMessage);

  // if  (receivedMessage.indexOf("CHECK") != -1) {
  //   keyword = "CHECK";
  // } else if (receivedMessage.indexOf("STOP") != -1) {
  //   keyword = "STOP";
  // } else if (receivedMessage.indexOf("SUBSCRIBE") != -1) {
  //   keyword = "SUBSCRIBE";
  // } else {
  //   keyword = "CHECK";
  // }

  // Now that we've figured out the keyword, let's remove it from the SMS...
  receivedMessage = receivedMessage.replace(keyword, "");

  // ...then we'll treat the rest of the SMS as the customer account number.
  receivedMessage = receivedMessage.replace(/ /g, ""); //Removes all spaces
  customerAccountNumber = receivedMessage;

  console.log(
    "It seems that the customer account number is: " + customerAccountNumber
  );
  console.log("It seems that the keyword is: " + keyword);

  parsedMessage["keyword"] = keyword;
  parsedMessage["customerAccountNumber"] = customerAccountNumber;

  return parsedMessage;
}

async function handleParsedMessage(
  parsedMessage,
  phoneNumber,
  receivedMessage
) {
  console.log("Handling the parsed message.");
  var keyword = parsedMessage.keyword;
  var customerAccountNumber = parsedMessage.customerAccountNumber;
  var siteVariables = sparkmeter.setSiteVariables(customerAccountNumber);
  var language = siteVariables.siteLanguage;

  var responseMessage;
  var balance;
  var notification;

  // First, we can address the STOP message, since no validation currently is done on such messages.
  if (keyword === "STOP") {
    /*
        This should not default to English, but for now it will. In the future, it should at least change
        the language depending on the country code of the phone number. This will be tough in multilingual
        countries, but since unknown phone numbers will often interact with this system, we will either need
        to pick a default language or send the message in multiple languages.
        */

    responseMessage = writeStopMessage(language);
    notification =
      "Hey Douglas, somebody wants to be removed from the SMS notifications. Phone number: " +
      phoneNumber +
      ". Message was: " +
      receivedMessage;
    console.log(notification);
    await email.sendEmail(notification);
  }

  // Otherwise, we need some quick validity checks.
  // Account number too short
  else if (customerAccountNumber.length < 6) {
    console.log("Account number is too short");
    responseMessage = writeFailureMessageTooShort(language);
  }
  // Account number too long
  else if (customerAccountNumber.length > 6) {
    console.log("Account number is too long");
    responseMessage = writeFailureMessageTooLong(language);
  } else {
    balance = await checkBalance(customerAccountNumber);
    if (keyword === "CHECK") {
      if (balance === "no such customer") {
        responseMessage = writeFailureMessageInvalid(language);
      } else {
        var siteVariables = sparkmeter.setSiteVariables(customerAccountNumber);
        var currency = siteVariables.currency;
        responseMessage = writeBalanceMessage(balance, currency, language);
      }
    } else if (keyword === "SUBSCRIBE") {
      if (balance === "no such customer") {
        responseMessage = writeFailureMessageInvalid(language);
      } else {
        responseMessage = writeSubscribeMessage(
          customerAccountNumber,
          language
        );
        notification =
          "Hey Douglas, somebody wants to be subscribed to SMS notifications. Phone number: " +
          phoneNumber +
          ". Message was: " +
          receivedMessage;
        console.log(notification);
        await email.sendEmail(notification);
      }
    }
  }

  return responseMessage;
}

async function checkBalance(customerAccountNumber) {
  var sparkmeterResponse = await sparkmeter.getCustomerInfo(
    customerAccountNumber
  );

  if (sparkmeterResponse.error === "no such customer") {
    console.log("That account number doesn't exist");
    return "no such customer";
  } else {
    var balance = sparkmeterResponse.customers[0].credit_balance;
    balance = myMath.round(balance, 0);
    console.log("Customer balance is: " + balance);
    return balance;
  }
}


// function findMessageKeyWord (receivedMessage) {

//   var keyword;
//   var checkRegex0 = new RegExp(/check/i);
//   var checkRegex1 = new RegExp(/chck/i);
//   var checkRegex2 = new RegExp(/chdck/i);
//   var checkRegex3 = new RegExp (/chack/i);

//   let stopRegex0 = new RegExp (/stop/i);
//   let stopRegex1 = new RegExp(/stp/i);
//   let stopRegex2 = new RegExp(/sop/i);
//   let stopRegex3 = new RegExp(/top/i);

//   let subscribeRegex0 = new RegExp (/subscribe/i);
//   let subscribeRegex1 = new RegExp(/subcribe/i);
//   let subscribeRegex2 = new RegExp(/subscr/i);
//   let subscribeRegex3 = new RegExp(/subscrabe/i);

//   if (receivedMessage.match(checkRegex0)) {
//       receivedMessage = receivedMessage.replace(keyword, "check");
//     }
//   else if (receivedMessage.match(checkRegex1)){
//       receivedMessage = receivedMessage.replace("chck", "check");
//     }
//     receivedMessage.match(checkRegex1) ||
//     receivedMessage.match(checkRegex2) ||
//     receivedMessage.match(checkRegex3)
//     {

//   keyword = "CHECK";
//   }

//   else if (
//     receivedMessage.match(stopRegex0) ||
//     receivedMessage.match(stopRegex1) ||
//     receivedMessage.match(stopRegex2)
//   ) {
//   keyword = "STOP";
//   }

//   else if (
//     receivedMessage.match(subscribeRegex0) ||
//     receivedMessage.match(subscribeRegex1) ||
//     receivedMessage.match(subscribeRegex2)
//   ) {
//   keyword = "SUBSCRIBE";
//   }

//   else {
//     keyword = "CHECK";
//   }
// return keyword;
// }


function writeFailureMessageTooShort(language) {
  if (language === "English") {
    var responseMessage =
      "Your account number was less than 6 characters. Please include all 6 characters (like ND1234 or 119876).";
  }

  return responseMessage;
}

function writeFailureMessageTooLong(language) {
  if (language === "English") {
    var responseMessage =
      "Your account number was more than 6 characters. The number should be 6 characters (like ND1234 or 119876)";
  }

  return responseMessage;
}

function writeFailureMessageInvalid(language) {
  if (language === "English") {
    var responseMessage =
      "The account number you sent doesn't exist. Please check and try again.";
  }

  return responseMessage;
}

function writeFailureMessageError(language) {
  if (language === "English") {
    var responseMessage =
      "There was an unknown error. Please wait a few minutes and try sending your message again. Thanks for using Renewvia Energy.";
  }

  return responseMessage;
}

function writeSubscribeMessage(customerAccountNumber, language) {
  if (language === "English") {
    var responseMessage =
      "Your phone number will be subscribed for account " +
      customerAccountNumber +
      " shortly. Thank you for using Renewvia Energy. Send us STOP to be removed from our notifications list.";
  }

  return responseMessage;
}

function writeStopMessage(language) {
  if (language === "English") {
    var responseMessage =
      "Your phone number will be removed from our notifications list shortly. We apologize for the inconvenience.";
  }

  return responseMessage;
  ``;
}

function writeBalanceMessage(balance, currency, language) {
  if (language === "English") {
    var responseMessage =
      "Your balance is " +
      currency +
      balance +
      ". Thank you for using Renewvia!";
  }

  return responseMessage;
}

