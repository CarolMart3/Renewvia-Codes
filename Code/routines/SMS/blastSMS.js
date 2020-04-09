// Send mass SMS's to customers with this code. Write the message in craftMessage() and pick the sites that this gets sent to in getCustomerListAllSites().
// This will send your message to the phone numbers registered on ThunderCloud.


exports.sendMessages = sendMessages;
var sparkmeter = require("../../apis/sparkmeter");
var sms = require("../../apis/telerivet");
var cldashes = "-------------------------------------------------------------------";




async function sendMessages(siteCodes, route) {

    // The message to be sent is written manually in the writeMessage function below,
    // but set the sites and sending routes in the event input object

    var customerList = await getCustomerList(siteCodes);
    var messageQueue = await makeQueue(customerList);
    var telerivetResponseList = await sms.multipleSmsQueueHandler(messageQueue, route);
    return telerivetResponseList;
}


function writeMessage(customerAccountNumber) {
    // This is where you write the message that can be sent out.

    var message = "Good morning Oloibiri. This is the automated SMS system of Renewvia. Please do not respond to this number except using the appropriate keywords.\n\nTo check your balance, send an SMS to this number (0703 528 9254‬) with CHECK and your account number, like:\nCHECK " + customerAccountNumber + "\n\nWe are sending you messages because you registered your phone number with us when you signed up with Renewvia. If you would like to receive messages from Renewvia on a different number, send us an SMS from that number with SUBSCRIBE and your account number, like:\nSUBSCRIBE " + customerAccountNumber + "\n\nFinally, to stop receiving these messages, you can reply with STOP. But we encourage you to wait a few days before requesting this. We will only send you notifications about payments, warnings when your balance is low, and important announcements.\n\nRemember, this is an automated system. Please do not call this number, and please do not send it any SMS without the correct keywords (CHECK, SUBSCRIBE, or STOP). Thank you for using Renewvia!";
    console.log(message);
    return message;
}






async function getCustomerList(siteCodes) {
    var customerListAllSites = [],
        i, siteCustomers;

    for (i in siteCodes) {
        siteCustomers = await sparkmeter.getCustomerList(siteCodes[i]);
        if (siteCustomers.error === null) {
            customerListAllSites = customerListAllSites.concat(siteCustomers.customers);
        }
    }

    return customerListAllSites;
}


function makeQueue(customerList) {
    var i, customerAccountNumber, phoneNumber, phoneNumber2;
    var messageQueue = [];

    for (i in customerList) {
        phoneNumber = customerList[i].phone_number;
        customerAccountNumber = customerList[i].code;

        if (customerList[i].meters[0].active === true && customerAccountNumber !== null) {
            messageQueue.push({ "content": writeMessage(customerAccountNumber), "to_number": phoneNumber });
        }
    }
    return messageQueue;
}
