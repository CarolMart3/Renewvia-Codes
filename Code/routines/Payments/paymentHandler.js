var mpesa = require("../../apis/mpesa");
var paga = require("../../apis/paga");
var sparkmeter = require("../../apis/sparkmeter");
var paymentConfirmation = require("./paymentConfirmation");
var paymentValidation = require("./paymentValidation");
var siteMeterPlatform = require("../siteMeterPlatform");
var cldashes = "-------------------------------------------------------------------";

exports.handlePayments = handlePayments;



async function handlePayments(event) {

    // Three logical splits happen here and in the code this calls:
    // 1. Where did the payment originate? (M-Pesa, Airtel, Paga, etc)
    // 2. Which platform needs to be notified/queried? (SparkMeter, SteamaCo, token generator, etc)
    // 3. Is this a confirmation message or validation message?

    try {
        console.log(cldashes + "\nPayment processing has begun.\n" + cldashes);

        var payment = fillPaymentObject(event);

        console.log("Transaction ID is " + payment.transactionID + ", and customer account number is " + payment.customerAccountNumber + "\n" + cldashes);

        if (payment.MessageType === "Validation") {
            return await paymentValidation.processValidation(payment);
        }
        else if (payment.MessageType === "Confirmation") {
            return await paymentConfirmation.processConfirmation(payment);
        }
        else {
            return;
        }
    }
    catch (error) {
        console.log(error);
        return "Big error!";
    }
}









function fillPaymentObject(event) {
    console.log("fillPaymentObject has begun.");

    // payment is passed between all the functions with all of the details about the transaction
    var payment = createPaymentObject();
    payment = fillFlags(event, payment);





    // This is where the information from the payment processor is put into a standard format regardless of source
    // event.PaymentSource is set in our API Gateway settings (not in this Lambda, nor by the payment processors), so it should always be filled correctly.
    console.log("Filling in payment processor details.");
    if (event.PaymentSource === "mpesa") {
        payment = mpesa.parseMessage(event, payment);
    }
    else if (event.PaymentSource === "paga") {
        payment = paga.parseMessage(event, payment);
    }
    else if (event.PaymentSource === "mtn") {
        // Just putting this here to inspire future integrations with more providers
    }




    // This is where information about the destination customer meter is put into a standard format regardless of destination (i.e. SparkMeter, SteamaCo, STS, etc)
    payment.meterPlatform = siteMeterPlatform.assignPlatform(payment.customerAccountNumber);

    var meterDetails;
    if (payment.meterPlatform === "sparkmeter") {
        meterDetails = sparkmeter.setSiteVariables(payment.customerAccountNumber);
    }
    else if (payment.meterPlatform === "steamaco") {
        // Just putting this here in case one day we integrate with SteamaCo or another metering platform
    }

    payment = fillMeterDetails(payment, meterDetails);

    return payment;
}





function createPaymentObject() {
    console.log("Creating payment object.");

    // I've made a million changes to this but I'm going to revert three of them for the sake of interfacing nicely with the database:
    // transactionType: I want it to be processorTransactionType
    // sparkMeterResponse: Needs to be meterResponse
    // sparkMeterTransactionID: Needs to be meterTransactionID
    // Change all this and the database column names after you've pushed all the new Paga code

    var payment = {

        // Top level categorization
        MessageType: "", // MessageType is the field used by the top level of this code to decide if this is a payment, SMS, etc. Don't log in database.
        PaymentMessageType: "", // PaymentMessageType is going to describe if it's a validation or confirmation (or something else). Don't log in database.

        // Where did the payment come from
        paymentProcessor: "", //I.e. M-Pesa, Paga, Airtel, etc. Banks (like CBA or Zenith) could also go here.
        transactionType: "", // Set by processor, along the lines of "Paybill" or "BILL_PAY".
        transactionChannel: "", // Right now will always be same for M-Pesa, but could be different for Paga (like Online vs USSD)
        businessShortCode: "", // M-Pesa paybill number. One day we could have more than one.

        // Payment Info
        transactionID: "", // As received from payment processor.
        transactionDateTime: "", // An early mistake I made was to split date and time. Will remove those later.
        transactionDate: "", // Will delete later
        transactionTime: "", // Will delete later
        modifiedDateTime: "", // For manual changes to the payment database. By default, this will be the same as transactionDateTime
        currency: "",
        transactionAmount: "", // Gross payment amount
        renewviaAmount: "", // New payment amount to Renewvia (Paga takes a cut out of the payment)
        isCredit: "", // Paga uses this
        isProcessorTest: "", // As set by the payment processor, not by Renewvia. We'll set our own test flag in a different line.

        // Useless M-Pesa Things That I'm Logging For Now
        invoiceNumber: "", // M-Pesa field, seems to be unused
        thirdPartyTransactionID: "", // M-Pesa field, seems to be unused
        renewviaBalance: "", // M-Pesa field, we don't use this right now but they do send it.

        // Customer Info
        customerAccountNumber: "", // As assigned by Renewvia
        phoneNumber: "",
        firstName: "",
        middleName: "",
        lastName: "",

        // Details we add while processing the payment
        country: "",
        meterPlatform: "", // SparkMeter, SteamaCo, STS token, etc
        siteAuthToken: "", // These meter fields are meant to work with either SparkMeter or SteamaCo. Don't log in database.
        siteURLPath: "", // Don't log in database.
        meterBaseURL: "", // Don't log in database
        sparkMeterResponse: "",
        // meterCustomerID: "", // This is for SparkMeter's weird customer ID field that's needed for a few calls but otherwise unused by us. Don't log in database. //deleteme!
        sparkMeterTransactionID: "",
        standardSiteCode: "",
        siteName: "",
        renewviaResponse: "", // The response we send back to the payment processor.

        // Flags for categorization
        isTest: "",
        isSignup: "", // For flagging first-time signup payments
        isBalanceTransfer: "", // For flagging "payments" that are for changing/swapping meters, not actual payments
        isAutomatic: "", // For flagging payments that are made manually, like when M-Pesa doesn't send a confirmation after a successful validation


        // Stuff for logs
        fullMessage: "", // The entire JSON object received by this Lambda function. Just in case.
        dbID: "" // The row number in the relevant database (right now, either the confirmation or validation database). Don't log in database (because the database generates this).
    };

    console.log("Payment object created.");
    return payment;
}



function fillFlags(event, payment) {

    if (event.isTest === true) {
        payment.isTest = true;
    }
    else if (event.isTest === false) {
        payment.isTest = false;
    }
    else {
        payment.isTest = false;
    }

    if (event.isSignup === true) {
        payment.isSignup = true;
    }
    else if (event.isSignup === false) {
        payment.isSignup = false;
    }
    else {
        payment.isSignup = false;
    }

    if (event.isBalanceTransfer === true) {
        payment.isBalanceTransfer = true;
    }
    else if (event.isBalanceTransfer === false) {
        payment.isBalanceTransfer = false;
    }
    else {
        payment.isBalanceTransfer = false;
    }

    if (event.isAutomatic === true) {
        payment.isAutomatic = true;
    }
    else if (event.isAutomatic === false) {
        payment.isAutomatic = false;
    }
    else {
        payment.isAutomatic = true;
    }

    return payment;
}


function fillMeterDetails(payment, meterDetails) {

    console.log("Meter details are: " + JSON.stringify(meterDetails));

    payment.siteAuthToken = meterDetails.siteAuthToken;
    payment.siteURLPath = meterDetails.siteURLPath;
    payment.meterBaseURL = meterDetails.meterBaseURL;
    payment.siteName = meterDetails.siteName;
    payment.standardSiteCode = meterDetails.standardSiteCode;

    return payment;
}