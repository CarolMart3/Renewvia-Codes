exports.validateAccountNumber = validateAccountNumber;
exports.checkAccountNumberStatus = checkAccountNumberStatus;
exports.modifyAccountNumberStatus = modifyAccountNumberStatus;
exports.insertNewAccountNumber = insertNewAccountNumber;
exports.createCustomer = createCustomer;

var dates = require("../../utilities/dates");
var database = require("../../apis/database");
var sparkmeter = require("../../apis/sparkmeter");
var paymentConfirmation = require("../Payments/paymentConfirmation");


async function validateAccountNumber(formSubmission) {
    try {
        var customerAccountNumber = formSubmission.customerAccountNumber;
        var formFiller = formSubmission.formFiller;

        // Checks the account number database to see if the account already exists
        var dbResponse = await checkAccountNumberStatus(customerAccountNumber);
        console.log("dbResponse is " + dbResponse);
        var response;

        if (dbResponse === "Doesn't exist") {
            response = "This account number has been successfully reserved. Please fill out the form below to register the new customer.";
            await insertNewAccountNumber(customerAccountNumber, "New signup", formFiller);
        }
        else if (dbResponse !== "") {
            response = "Account number is already taken. Please choose another account number.";
        }
        else {
            response = "Error";
        }
    }
    catch (error) {
        response = "There was an error validating the account number. Try again, and if the error persists, tell Douglas.";
    }

    return response;
}





async function createCustomer(formSubmission) {

    console.log("Creating new customer has begun.");
    console.log(formSubmission);

    // Set all the details
    var customerAccountNumber = formSubmission.customerAccountNumber.toUpperCase();

    var firstName = formSubmission.firstName.slice(0, 1).toUpperCase() + formSubmission.firstName.slice(1).toLowerCase();
    var middleName = formSubmission.middleName.slice(0, 1).toUpperCase() + formSubmission.middleName.slice(1).toLowerCase();
    var lastName = formSubmission.lastName.slice(0, 1).toUpperCase() + formSubmission.lastName.slice(1).toLowerCase();

    var siteInfo = sparkmeter.setSiteVariables(customerAccountNumber);
    var siteName = siteInfo.siteName;

    var poleNumber = formSubmission.poleNumber;
    var poleNumberGlobal = siteInfo.siteCode + "-P" + poleNumber;
    var meterSerial = formSubmission.meterSerial.toUpperCase();
    var meterType = meterSerial.substr(0, meterSerial.indexOf('-'));

    var phoneNumber = formSubmission.countryCode.toString() + formSubmission.phoneNumber.toString();

    var d = new Date();
    var firstDayConnected = d.toISOString().slice(0, 10);

    var customerType = formSubmission.customerType;
    var tariff = formSubmission.tariff;

    if (tariff === "Free") {
        tariff = "Free Tariff";
    }
    else if (tariff === "Religious") {
        tariff = "Religious Institution";
    }


    if (meterType !== "SM5R") {
        tariff = tariff + " with " + meterType;
    }
    console.log("Tariff name is: " + tariff);

    var transactionID = formSubmission.transactionID.toUpperCase();

    var displayName;
    if (customerType === "Residential") {
        displayName = firstName + " " + middleName + " " + lastName;
    }
    else {
        displayName = customerType + " (" + firstName + " " + middleName + " " + lastName + ")";
    }


    var response;
    var errorMessage = "";

    // Check for duplicate form submissions and if it is a duplicate, send that feedback.
    try {
        var dbResponse = await checkAccountNumberStatus(customerAccountNumber);
        console.log("dbResponse is " + dbResponse);

        if (dbResponse === "Active") {
            response = "This account number has already been registered.";
            console.log(response);
            return response;
        }
        else {
            console.log("Not a duplicate signup attempt.");
        }
    }
    catch (error) {
        response = "There was an error validating the account number. Try again, and if the error persists, tell Douglas.";
    }




    // Check if payment exists in confirmation DB. This counts how many times the payment confirmation has been logged (could be multiple, but should be at least 1 in order to register someone.)
    try {
        console.log("Checking if payment exists in the database.")
        // A better code organization would have getTransactionCount in database.js. Will reorganize some day. Leaving it for now to take time to strategize about cleaning up this and other database queries.
        var transactionCount = await paymentConfirmation.getTransactionCount(transactionID, formSubmission);
    }
    catch (error) {
        errorMessage = "Error connecting to the database for customer signup. Attempted account number was " + customerAccountNumber + ".";
        console.log(errorMessage);
        await database.handleDBErrorsNew(errorMessage, error);

        transactionCount = 0;
        response = "There was a techincal error finding the payment confirmation. Please tell Douglas.";
        console.log(response);
        return response;
    }

    console.log("Transaction count is " + transactionCount);



    // If the signup payment isn't found, it rejects the signup attempt.
    if (transactionCount > 0) {


        // Log all details in account number database, but leaves status as "Paying" for now. If database errors out, continue to creating customer on SparkMeter.
        try {
            console.log("Updating account number database with remaining details.");
            await modifyAccountNumberDetails(customerAccountNumber, firstName, middleName, lastName, displayName, siteName, poleNumber, poleNumberGlobal, meterType, meterSerial, phoneNumber, firstDayConnected, tariff, customerType);
        }
        catch (error) {
            errorMessage = "Error connecting to the database for customer signup. Attempted account number was " + customerAccountNumber + ".";
            console.log(errorMessage);
            await database.handleDBErrorsNew(errorMessage, error);
        }



        // Create new customer on SparkMeter
        var operatingMode = "auto";
        var startingCreditBalance = siteInfo.startingBalance;

        try {
            var sparkMeterResponse = await sparkmeter.addCustomer(meterSerial, tariff, displayName, customerAccountNumber, phoneNumber, operatingMode, startingCreditBalance);

            var sparkMeterError = sparkMeterResponse.data.error;
            var sparkMeterStatus = sparkMeterResponse.status;

            console.log("SparkMeter error response is: " + sparkMeterError);
            console.log("SparkMeter status code is: " + sparkMeterStatus);



            if (sparkMeterResponse.data.error === null) {
                response = "Customer registration was a success.";
            }
            else if (sparkMeterStatus === 400) { //This is the bad request response. This would be the code's fault, not the form user's.
                response = "Customer registration failed because of a technical error with SparkMeter. Please tell Douglas.";
            }
            else { // SparkMeter passes back helpful information. Send it to the form user.
                response = "Customer registration failed. Reason: " + sparkMeterError;
            }
        }
        catch (error) {
            response = "Customer registration failed because of a technical error with SparkMeter. Please tell Douglas.";
            console.log(response);
            console.log(error);
            await sparkmeter.handleSparkmeterErrors(formSubmission);
        }





        // If new customer creation was a success, update account number database to active
        // Note that right now there is no "if"- this will update them either way. This isn't a bad setup, as any error on SparkMeter will be emailed to me and also the message sent back to the form says "tell Douglas".
        try {
            await modifyAccountNumberStatus(customerAccountNumber, "Active");
        }
        catch (error) {
            errorMessage = "Error connecting to the database for customer signup. Attempted account number was " + customerAccountNumber + ".";
            console.log(errorMessage);
            await database.handleDBErrorsNew(errorMessage, error);
        }
    }




    else {
        response = "Could not find customer's signup payment. Please check the confirmation code and try again.";
    }
    console.log(response);
    return response;
}






async function checkAccountNumberStatus(customerAccountNumber) {
    console.log("Checking Customer Account Number database for this account number");
    var select = "customerStatus AS customerStatusResult";
    var from = "renewviadb.accountnumbers";
    var where = 'customerAccountNumber = "' + customerAccountNumber + '"';

    var queryString = database.readDB(select, from, where);
    var dbResponse = await database.queryDB(queryString);

    if (dbResponse[0] === undefined) {
        console.log("Account number isn't in the database.");
        return "Doesn't exist";
    }
    else {
        var accountNumberStatus = dbResponse[0].customerStatusResult;
        console.log("Account number status is: " + accountNumberStatus);
        return accountNumberStatus;
    }
}







async function modifyAccountNumberStatus(customerAccountNumber, newStatus) {
    var update = "renewviadb.accountnumbers";
    var setString = 'customerStatus = "' + newStatus + '"';
    var where = 'customerAccountNumber = "' + customerAccountNumber + '"';

    var queryString = database.updateDB(update, setString, where);
    var connectionResult = await database.queryDB(queryString);
    return connectionResult;
}






async function modifyAccountNumberDetails(customerAccountNumber, firstName, middleName, lastName, displayName, site, poleNumber, poleNumberGlobal, meterType, meterSerial, phoneNumber, firstDayConnected, tariff, customerType) {
    var update = "renewviadb.accountnumbers";
    var setString = "";

    // The ways to do this programatically look overly complicated. Unfortunately, this means that changing the query string will require syncing this and the actual arguments list
    var argsList = ["customerAccountNumber", "firstName", "middleName", "lastName", "displayName", "site", "poleNumber", "poleNumberGlobal", "meterType", "meterSerial", "phoneNumber", "firstDayConnected", "tariff", "customerType"];

    var columnName;
    var columnValue;
    var subString;

    for (var i in arguments) {
        columnName = argsList[i];
        columnValue = arguments[i];
        subString = columnName + ' = "' + columnValue + '", ';
        setString = setString.concat(subString);
    }

    setString = setString.slice(0, -2);

    var where = 'customerAccountNumber = "' + customerAccountNumber + '"';

    var queryString = database.updateDB(update, setString, where);
    var connectionResult = await database.queryDB(queryString);
    return connectionResult;
}






async function insertNewAccountNumber(customerAccountNumber, newStatus, formFiller) {
    var insertInto = "renewviadb.accountnumbers (customerAccountNumber,customerStatus,createdTime,formFiller)";
    var timestamp = new Date;
    timestamp = dates.convertJStoSQLTimestamp(timestamp);


    var values = '("' + customerAccountNumber + '", "' + newStatus + '", "' + timestamp + '", "' + formFiller + '")';

    var queryString = database.insertDB(insertInto, values);
    var connectionResult = await database.queryDB(queryString);
    return connectionResult;
}
