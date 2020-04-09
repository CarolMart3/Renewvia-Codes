var automaticSmsHandler = require("./routines/SMS/automaticSmsHandler");
var blastSMS = require("./routines/SMS/blastSMS");
var paymentHandler = require("./routines/Payments/paymentHandler");
var gridControl = require("./routines/Site Control/gridControl");
var newCustomer = require("./routines/Forms/newCustomer");
var receivedSMSHandler = require("./routines/SMS/receivedSMSHandler");
var meterChangeHandler = require("./routines/Forms/meterChangeHandler");
var paga = require("./apis/paga");
var tariffChanges = require("./routines/Site Control/tariffChanges");
var sms = require("./apis/telerivet");
var koiosCheck = require("./routines/koiosCheck");




exports.handler = async (event) => {
    var response;

    // Payment handling
    if (event.MessageType === "Validation" || event.MessageType === "Confirmation" || event.MessageType === "Payment") {
        response = await paymentHandler.handlePayments(event);
        return response;
    }





    // SMS Handling
    // Checks the SMS queues on SparkMeter (other sources can be added). This is called by AWS Cloudwatch Events.
    else if (event.MessageType === "checkForSMSSparkmeter") {
        var telerivetResponse = await automaticSmsHandler.handleAutomaticSms();
        return telerivetResponse;
    }
    // Handles and responds to SMS's sent to our Telerivet phone in Kenya
    else if (event.MessageType === "Telerivet") {
        var responseSMS = await receivedSMSHandler.handleReceivedSMS(event);
        return responseSMS;
    }
    // Used to send an SMS to every customer in a site or sites. Edit the code to change the message and recipients.
    else if (event.MessageType === "SMS blast") {
        var messageQueue = await blastSMS.sendMessages(event.SiteCodes, event.Route);
        return messageQueue;
    }
    else if (event.MessageType === "Send SMS") {
        var response = await sms.sendSMS(event.PhoneNumber, event.Message, event.Route);
        return response;
    }





    // Webform handling
    else if (event.MessageType === "Signup form- new account number") {
        response = await newCustomer.validateAccountNumber(event);
        return response;
    }
    else if (event.MessageType === "Signup form- submit info") {
        response = await newCustomer.createCustomer(event);
        return response;
    }
    else if (event.MessageType === "Meter change form") {
        response = await meterChangeHandler.handleMeterChange(event);
        return response;
    }





    // Site control
    // Set an entire site's meters to On/Off/Auto
    else if (event.MessageType === "Grid control") {
        gridControl.controlGrid(event.DesiredState, event.SiteCode);
        return;
    }

    // Tariff creation and updating on SparkMeter
    else if (event.MessageType === "Tariff Change") {
        response = await tariffChanges.fillNewSiteTariffs(event.Action, event.SiteCode, event.SiteVoltage, event.LowBalanceThreshold, event.TariffResidential, event.TariffCommercial, event.TariffIndustrial, event.TariffReligious);
        return;
    }





    // Random other things
    // Paga may check for what services we offer, so here is that
    else if (event.MessageType === "getIntegrationServicesPaga") {
        response = await paga.formatGetIntegrationServicesResponse();
        return response;
    }

    else if (event.MessageType === "Check Koios") {
        response - await koiosCheck.checkStuff();
        return response;
    }

    else {
        console.log("Function was called for an unknown reason.");
        return "Why did you call me?";
    }
};
