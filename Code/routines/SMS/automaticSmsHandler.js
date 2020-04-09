exports.handleAutomaticSms = handleAutomaticSms;

var database = require("../../apis/database");
var sparkmeter = require("../../apis/sparkmeter");
var telerivet = require("../../apis/telerivet");
var email = require("../../apis/email");
var myMath = require("../../utilities/myMath");
var cldashes = "-------------------------------------------------------------------";

/*
SparkMeter has a feature for writing SMS messages upon certain events, like whenever a payment is made.
But it's a very basic feature. It can't calculate bills based on tax rates, for example. So we have SparkMeter
set up to just send us a list of key parameters instead of a nicely-formatted SMS, and then we use them
to format our own SMS message.

In the future, if we integrate with another source of automatic SMS's (like SteamaCo), there will likely be different
features and limitations vs SparkMeter. So this code is written to accept messages from any source as long as they're
put into a standardized format, the Message class below.
*/


// Here is the standardized format that we will put each SMS in.
class Message {
    constructor() {
        this.source = ""; // What is triggering this SMS. Right now, just sparkmeter.
        this.gatewayService = ""; // What service are we using to send the SMS. Right now, just telerivet. Could later be Africa'sTalking or Twilio or others.
        this.gateway = ""; // Specifically, which gateway. Right now we only have a Telerivet Gateway phone in Kenya and another in Nigeria, but we could also use Telerivet's online gateway in those countries, so this should be its own field.
        this.country = ""; // This is used for writing the messages and getting the taxes right on bills.
        this.siteCode = ""; // Like RN for Ringiti, 13 for Kalobeyei Settlement, etc
        this.messageType = ""; //One of the following: lowBalance, registeredNumberPayment, otherNumberPayment
        this.customerAccountNumber = "";
        this.customerBalance = "";
        this.transactionAmount = "";
        this.vendor = "";
        this.tariffName = "";
        this.messageText = ""; // The actual message to be sent
        this.phoneNumber = "";
        this.otherPhoneNumber = "";
    }
};


async function handleAutomaticSms() {

    var isTest = false; // Should be a variable set by the top-level event object, but I will hard-code it for now
    var sitesListForSms = getSitesListForSms(isTest);

    var i;
    var messageQueue;
    var siteCode, source, gateway, gatewayService, country;

    for (i in sitesListForSms) {

        messageQueue = [];
        siteCode = sitesListForSms[i].siteCode;
        source = sitesListForSms[i].source;
        gateway = sitesListForSms[i].gateway;
        gatewayService = sitesListForSms[i].gatewayService;
        country = sitesListForSms[i].country;




        // Step 1- get all the messages to be sent, and process them from the raw format they come in 
        // All of these functions must return the queue in the same format- an array of objects of class Message

        if (source === "sparkmeter") {
            messageQueue = await getSparkmeterSmsQueue(siteCode, source, gateway, gatewayService, country, messageQueue, isTest);
        }
        else if (source === "steamaco") {
            // Get the SMS queue from SteamaCo. Like: messageQueue = await getSteamacoSmsQueue(siteCode, source, gateway, gatewayService, country, messageQueue)
        }

        // etc etc




        // Step 2- process the messages
        // Handle when someone pays for someone else (both will get an SMS)
        messageQueue = await checkPaymentPhoneNumber(messageQueue)
        // Write the messages that will be sent out
        messageQueue = await writeMessages(messageQueue);



        /* If it ever becomes a problem that we're sending messages in batches by site, it would be easy to fix.
        Instead of re-initiating messageQueue at every iteration of this for loop, add on to it so that all sites'
        Messages are all in one queue. Then split messageQueue by gateway and send each gateway's queues into the functions below.
        That said, for now, Telerivet gives us 5000 API calls per day before needing to upgrade. We're well under that. So for now,
        I'll keep the code simpler and just send each sites' messages individually.
        */

        // Step 3- send the messages
        if (gateway === "telerivetGatewayPhoneKenya") {
            // First translate the queue into a Telerivet-friendly queue
            var telerivetQueue = translateStandardFormatToTelerivetFormat(messageQueue);
            // Then call Telerivet's send-multiple function
            var telerivetResponse = await telerivet.multipleSmsQueueHandler(telerivetQueue, gateway);

        }
        else if (gateway === "telerivetGatewayPhoneNigeria") {
            // First translate the queue into a Telerivet-friendly queue
            var telerivetQueue = translateStandardFormatToTelerivetFormat(messageQueue);
            // Then call Telerivet's send-multiple function
            var telerivetResponse = await telerivet.multipleSmsQueueHandler(telerivetQueue, gateway);

        }
        else if (gateway === "africasTalkingCameroon") {
            // Just picking random other destinations to inspire future integrations
        }
        else if (gateway === "twilioDrc") {
            // Yeah, let's send SMS's in DRC!
        }

    }
}














/*
---------------------------------------------------------------------------------------------
Definitions
---------------------------------------------------------------------------------------------
*/







function getSitesListForSms(isTest) {
    /*
    This is a list of sources of automatic SMS's with their destinations. For example,
    the first object in the list shows that one source of automatic SMS's is Ndeda's
    SparkMeter website, and the SMS's pulled from there need to be sent to the Telerivet phone
    in Kenya.
    
    In the future, one could add very different sources and destinations. An easy example is that
    SMS's could come from SteamaCo sites (I assume they have a similar functionality to SparkMeter's)
    and go to the Africa's Talking API.

    Right now, I'm just assigning sources and destinations by site. This may cause some limitations in
    the future (like if you want a site to have multiple of either) but right now it's sufficient.
    */

    var sitesListForSms;

    if (!isTest) {

        sitesListForSms = [
            {
                siteCode: "ND",
                source: "sparkmeter",
                gatewayService: "telerivet",
                gateway: "telerivetGatewayPhoneKenya",
                country: "kenya"
            },
            {
                siteCode: "RN",
                source: "sparkmeter",
                gatewayService: "telerivet",
                gateway: "telerivetGatewayPhoneKenya",
                country: "kenya"
            },
            {
                siteCode: "13",
                source: "sparkmeter",
                gatewayService: "telerivet",
                gateway: "telerivetGatewayPhoneKenya",
                country: "kenya"
            },
            {
                siteCode: "14",
                source: "sparkmeter",
                gatewayService: "telerivet",
                gateway: "telerivetGatewayPhoneKenya",
                country: "kenya"
            },
            {
                siteCode: "15",
                source: "sparkmeter",
                gatewayService: "telerivet",
                gateway: "telerivetGatewayPhoneKenya",
                country: "kenya"
            },
            {
                siteCode: "50",
                source: "sparkmeter",
                gatewayService: "telerivet",
                gateway: "telerivetGatewayPhoneNigeria",
                country: "nigeria"
            },
            {
                siteCode: "51",
                source: "sparkmeter",
                gatewayService: "telerivet",
                gateway: "telerivetGatewayPhoneNigeria",
                country: "nigeria"
            }

        ];
    }
    else {
        sitesListForSms = [
            {
                siteCode: "99",
                source: "sparkmeter",
                gatewayService: "telerivet",
                gateway: "telerivetGatewayPhoneKenya",
                country: "kenya"
            },
            {
                siteCode: "99",
                source: "sparkmeter",
                gatewayService: "telerivet",
                gateway: "telerivetGatewayPhoneNigeria",
                country: "nigeria"
            }
        ];
    }

    return sitesListForSms;
}














/*
---------------------------------------------------------------------------------------------
Sources of SMS's
---------------------------------------------------------------------------------------------
*/

async function getSparkmeterSmsQueue(siteCode, source, gateway, gatewayService, country, messageQueue, isTest) {
    /*
    Assumes messages coming from SparkMeter are formatted like: payment|{customer_code}|{credits_balance}|{amount}|{vendor},
    where the bracketed values are how they need to be formatted in the SparkMeter SMS settings, and those pipes (the | symbol) are there
    */

    try {

        var newSparkmeterMessages;
        if (isTest === true) {
            newSparkmeterMessages = getTestQueue(country);
        }
        else {
            newSparkmeterMessages = await sparkmeter.getSmsQueue(siteCode);
        }


        if (newSparkmeterMessages.error === null) {

            var i,
                rawMessage, registeredPhoneNumber,
                messageType, customerAccountNumber, customerBalance, transactionAmount, vendor, tariffName;


            for (i in newSparkmeterMessages.messages) {
                // Instatiate a Message object to hold all the details
                var newMessageObject = new Message();

                // First, parse what comes from SparkMeter.
                var sparkmeterMessageObject = newSparkmeterMessages.messages[i];
                rawMessage = sparkmeterMessageObject.text;
                registeredPhoneNumber = sparkmeterMessageObject.phone_number;
                console.log("Raw message from SparkMeter is: " + rawMessage);

                /* On SparkMeter, we use pipes (like this thing: |) to separate different values.
                We can't use commas, because SparkMeter uses commas in large numbers (like 1,000).
                So first we remove all the commas so that numbers can be used as numbers (not strings),
                and then we split the message up with | as the delimeter. */
                var splitMessage = rawMessage.replace(/,/g, "");
                splitMessage = splitMessage.split("|");

                // Now we can get all the individual values that SparkMeter sent us.
                // The order of these is specified on each site's ThunderCloud.
                messageType = splitMessage[0];
                customerAccountNumber = splitMessage[1];
                customerBalance = Math.round(splitMessage[2]);
                transactionAmount = splitMessage[3];
                vendor = splitMessage[4];
                tariffName = splitMessage[5];


                newMessageObject.source = source;
                newMessageObject.gateway = gateway;
                newMessageObject.gatewayService = gatewayService;
                newMessageObject.siteCode = siteCode;
                newMessageObject.country = country;
                newMessageObject.messageType = messageType;
                newMessageObject.customerAccountNumber = customerAccountNumber;
                newMessageObject.customerBalance = customerBalance;
                newMessageObject.transactionAmount = transactionAmount;
                newMessageObject.vendor = vendor;
                newMessageObject.tariffName = tariffName;
                newMessageObject.phoneNumber = registeredPhoneNumber;

                messageQueue = messageQueue.concat(newMessageObject);
            }
        }
    }
    catch (e) {
        console.log(e);
        email.sendEmail("There was an error connecting to SparkMeter to get the SMS queue for the site " + siteCode + ". Here's the error:\n" + e + "\n\n" + e.stack);
        return messageQueue;
    }

    return messageQueue;
}














/*
---------------------------------------------------------------------------------------------
Destinations
---------------------------------------------------------------------------------------------
*/



// Telerivet
function translateStandardFormatToTelerivetFormat(messageQueue) {
    var i;
    var newItem;
    var telerivetQueue = [];

    for (i in messageQueue) {
        newItem = {
            content: messageQueue[i].messageText,
            to_number: messageQueue[i].phoneNumber
        };

        telerivetQueue = telerivetQueue.concat(newItem);
    }

    return telerivetQueue;
}












/*
---------------------------------------------------------------------------------------------
Renewvia's business logic and message writing
---------------------------------------------------------------------------------------------
*/

async function checkPaymentPhoneNumber(messageQueue) {
    // Here, we handle the case of someone making a payment for someone else (or just from a different phone number)
    var newQueue = [];
    var i;

    for (i in messageQueue) {
        if (messageQueue[i].messageType === "payment") {
            try {

                // Any message from SparkMeter will include the registered phone number. This is the default payment message type.
                messageQueue[i].messageType = "registeredNumberPayment";

                // But we can add another message to our queue from the phone number that actually paid, if it's different
                var paymentPhoneNumber = await submitDbQueryPaymentConfirmation(messageQueue[i].customerAccountNumber, messageQueue[i].transactionAmount);
                if (paymentPhoneNumber !== messageQueue[i].phoneNumber) {

                    // Make a copy of the message
                    var newMessageObject = JSON.parse(JSON.stringify(messageQueue[i]));

                    // Let's make the copy be the one sent to the registered phone number
                    newMessageObject.messageType = "otherNumberPayment";
                    newMessageObject.otherPhoneNumber = paymentPhoneNumber;

                    // Then the original message will be sent to the paying phone number
                    messageQueue[i].phoneNumber = paymentPhoneNumber;

                    // Finally, we add the copy to the queue
                    newQueue = newQueue.concat(newMessageObject);

                }
            }
            catch (e) {
                console.log("Error! " + e);
                email.sendEmail("Problem with connecting to the payment database to find the payment phone number to send the confirmation SMS to.\n" + e + "\n\n" + e.stack);
            }
        }
    }

    messageQueue = messageQueue.concat(newQueue);
    return messageQueue;
}






async function writeMessages(messageQueue) {

    var i, messageText;



    for (i in messageQueue) {

        var siteVariables = sparkmeter.setSiteVariables(messageQueue[i].customerAccountNumber);
        var currency = siteVariables.currency;

        var customerAccountNumber = messageQueue[i].customerAccountNumber;
        var transactionAmount = messageQueue[i].transactionAmount;
        var paymentPhoneNumber = messageQueue[i].otherPhoneNumber;
        var customerBalance = messageQueue[i].customerBalance;
        var messageType = messageQueue[i].messageType;


        if (messageType === "registeredNumberPayment" || messageType === "otherNumberPayment") {
            if (messageQueue[i].vendor === "M-Pesa via API" || messageQueue[i].vendor === "API" || "System API") { // System API is just used on the test ThunderCloud

                var billCalculations = await calculateBill(messageQueue[i].customerAccountNumber, messageQueue[i].transactionAmount, messageQueue[i].tariffName);
                var billMessage = await writeBillMessage(billCalculations);


                if (messageType === "registeredNumberPayment") {
                    messageText = "Your payment of " + currency + transactionAmount + " to account " + customerAccountNumber + " was successful. Your new balance is " + currency + customerBalance + ". Thanks for using Renewvia.\n" + billMessage;
                }
                else if (messageType === "otherNumberPayment") {
                    // Additional SMS is sent to the registered phone number if payment phone number and registered phone number aren't the same
                    messageText = "A successful payment of " + currency + transactionAmount + " has been made to your account, " + customerAccountNumber + ", from " + paymentPhoneNumber + ". Your new balance is " + currency + customerBalance + ". Thanks for using Renewvia.\n" + billMessage;
                }
            }


            else {
                console.log("A payment was made either from another API or from another user. If you want an SMS to be sent for payments like this one, edit the if statement on this part of the code.");
            }
        }






        else if (messageType === "lowbalance") {
            messageText = "Your credit balance for account " + customerAccountNumber + " is only " + currency + customerBalance + ". Top up soon to keep your power on. Thanks for using Renewvia.";
        }





        else {
            console.log("Problem with SparkMeter inputs, or no messages: " + JSON.stringify(messageQueue));
        }

        messageQueue[i].messageText = messageText;
        console.log("\nMessage text is:\n\n" + messageText + "\n\n");
    }

    return messageQueue;
}



async function calculateBill(customerAccountNumber, transactionAmount, tariffName) {

    // This assumes four charges on top of the tariff: tax (like VAT), inflation, fuel, and foreign exchange
    // The inflation and forex rates are applied to the base tariff, and then VAT applies to all.
    // Fuel is being ignored for now.

    var tariffNameSplit = tariffName.split(" ");
    var firstWord = tariffNameSplit[0];

    var siteDetails = sparkmeter.setSiteVariables(customerAccountNumber);

    var tariff;
    if (firstWord === "Residential") {
        tariff = siteDetails.tariffResidential;
    }
    else if (firstWord === "Religious") {
        tariff = siteDetails.tariffReligious;
    }
    else if (firstWord === "Industrial") {
        tariff = siteDetails.tariffIndustrial;
    }
    else {
        tariff = siteDetails.tariffCommercial;
    }

    var forexRate = siteDetails.forexRate;
    var inflationRate = siteDetails.inflationRate;
    var taxRate = siteDetails.taxRate;
    var fuelRate = siteDetails.fuelRate; // Here is the fuel rate, but note that it isn't used below


    var amountForEnergy = transactionAmount / ((1 + taxRate) * (1 + inflationRate + forexRate));
    var kwhPurchased = amountForEnergy / tariff;

    var amountForForex = forexRate * amountForEnergy;
    var amountForInflation = inflationRate * amountForEnergy;
    var amountForTax = taxRate * (amountForEnergy + amountForForex + amountForInflation);

    var response = {
        amountForEnergy: amountForEnergy,
        kwhPurchased: kwhPurchased,
        amountForForex: amountForForex,
        amountForInflation: amountForInflation,
        amountForTax: amountForTax,
        total: transactionAmount
    };

    return response;
}




async function writeBillMessage(billCalculations) {

    // Clean up the numbers
    var amountForEnergy = myMath.round(billCalculations.amountForEnergy, 2);
    var kwhPurchased = myMath.round(billCalculations.kwhPurchased, 2);
    var amountForForex = myMath.round(billCalculations.amountForForex, 2);
    var amountForInflation = myMath.round(billCalculations.amountForInflation, 2);
    var amountForTax = myMath.round(billCalculations.amountForTax, 2);
    var total = billCalculations.total;

    var inflationString;
    var forexString;
    var taxString;

    // If a site doesn't have any of these charges for any reason (for example, a site in its first year won't have an inflation or forex charge),
    // the SMS bill shouldn't refer to them
    if (amountForInflation === 0) {
        inflationString = "";
    }
    else {
        inflationString = "Inflation adjustment: " + amountForInflation + "\n";
    }

    if (amountForForex === 0) {
        forexString = "";
    }
    else {
        forexString = "Foreign exchange adjustment: " + amountForForex + "\n";
    }

    if (amountForTax === 0) {
        taxString = "";
    }
    else {
        taxString = "VAT: " + amountForTax + "\n";
    }





    var messageText = "Here is your bill:\nEnergy Payment: " + amountForEnergy + " (for " + kwhPurchased + " units)\n" + forexString + inflationString + taxString + "Total: " + total;

    return messageText;
}














/*
---------------------------------------------------------------------------------------------
Utilities
---------------------------------------------------------------------------------------------
*/


async function submitDbQueryPaymentConfirmation(customerAccountNumber, transactionAmount) {
    // Writes the query string that gets the phone number of the last payment matching the payment's account number and amount
    // This way the payer gets a confirmation SMS even if the number they use isn't on record

    var string = 'SELECT * FROM renewviadb.payments WHERE customerAccountNumber="' + customerAccountNumber + '" AND transactionAmount=' + transactionAmount + ' ORDER BY id DESC LIMIT 1';
    var phoneNumber = await database.queryDB(string);
    phoneNumber = "+" + phoneNumber[0].phoneNumber;
    console.log("results is " + phoneNumber);
    return phoneNumber;
}






/*
---------------------------------------------------------------------------------------------
Testing
---------------------------------------------------------------------------------------------
*/

function getTestQueue(country) {

    /*
    Here's what needs to be tested:
    1. Each country (given as an input)
    2. Each message type (low balance and payment)
    3. Payments made from a non-registered phone number
    4. Different sites with different inflations, forex adjustments, etc. For now, an ND and a 13 payment will show this well.

    Here's what will need to be tested but not yet:
    1. Each gateway (for now, since there's only one per country, I'll just do country)
    2. Each SMS source (we only have SparkMeter now)
    */

    var testingPhoneNumber1;
    var testPaymentAmount = "3,141";

    if (country === "kenya") {
        testingPhoneNumber1 = "+254795339437";
    }
    else if (country === "nigeria") {
        testingPhoneNumber1 = "+2347036563456";
    }

    var testingQueue = {
        error: null,
        messages: [{
            "id": "a8fe15e9-7bb2-4c6f-9440-aed079b6e310",
            "phone_number": testingPhoneNumber1,
            "text": "payment|ND2264|1|" + testPaymentAmount + "|M-Pesa via API|Residential with SM60R",
            "timestamp": "2019-02-12T08:56:28.802036"
        },
        {
            "id": "a8fe15e9-7bb2-4c6f-9440-aed079b6e310",
            "phone_number": testingPhoneNumber1,
            "text": "payment|131197|1,100.00|" + testPaymentAmount + "|M-Pesa via API|Commercial with SM60R",
            "timestamp": "2019-02-12T08:56:28.802036"
        },
        {
            "id": "a8fe15e9-7bb2-4c6f-9440-aed079b6e310",
            "phone_number": testingPhoneNumber1,
            "text": "lowbalance|ND2264|9.12",
            "timestamp": "2019-02-12T08:56:28.802036"
        },
        ]
    };


    return testingQueue;
}



























// Old code for the record:




// async function sparkmeterSMSHandler() {

//     var sitesLists = {
//         Kenya: ["ND", "RN", "13", "14"],
//         Nigeria: []
//     }

//     var i;

//     for (i in sitesLists) {
//         // First, get the raw SMS queue from each of the SparkMeter sites
//         var messageQueue = await compileSMSQueues(sitesLists[i]);

//         // Next, craft the text of the messages that will be sent and decide which phone numbers to send them to
//         try {
//             messageQueue = await writeMessages(messageQueue);
//         }
//         catch (e) {
//             var errorMessage = "You had a problem with creating the new SMS queue from the SparkMeter raw inputs:\n" + e + "\n\n Here's the stack:" + e.stack;
//             console.log(errorMessage);
//             email.sendEmail(errorMessage);
//         }

//         // Finally, send the message queue to Telerivet in appropriate batches
//         var telerivetResponseList = await sms.multipleSmsQueueHandler(messageQueue);

//     }

//     return telerivetResponseList;
// }










// async function compileSMSQueues() {
//     // Gets queued messages from SparkMeter and puts them into a nice structure

//     var messageQueue = [],
//         newMessages = [],
//         siteList = ["ND", "RN", "13", "14"],
//         i;

//     for (i in siteList) {
//         try {
//             newMessages = await sparkmeter.getSmsQueue(siteList[i]);
//             if (newMessages.error === null) {
//                 messageQueue = messageQueue.concat(newMessages.messages);
//             }
//         }
//         catch (e) {
//             console.log(e);
//             email.sendEmail("There was an error connecting to SparkMeter to get the SMS queue for the site " + siteList[i] + ". Here's the error:\n" + e + "\n\n" + e.stack);
//         }
//     }




//     // var testingQueue = [{
//     //         "id": "a8fe15e9-7bb2-4c6f-9440-aed079b6e310",
//     //         "phone_number": "+254795339437‬",
//     //         "text": "payment|MA9999|1,000|1|M-Pesa via API|Residential with SM60R",
//     //         "timestamp": "2019-02-12T08:56:28.802036"
//     //     }
//     //     // {
//     //     //     "id": "a8fe15e9-7bb2-4c6f-9440-aed079b6e310",
//     //     //     "phone_number": "+254795339437",
//     //     //     "text": "payment|MA9999|2|1.00|M-Pesa via API|Residential with SM60R",
//     //     //     "timestamp": "2019-02-12T08:56:28.802036"
//     //     // },
//     //     // {
//     //     //     "id": "a8fe15e9-7bb2-4c6f-9440-aed079b6e310",
//     //     //     "phone_number": "+254795339437",
//     //     //     "text": "payment|MA9998|2|1.00|M-Pesa via API|Commercial with SM60R",
//     //     //     "timestamp": "2019-02-12T08:56:28.802036"
//     //     // }
//     // ];

//     // var messageQueue = testingQueue;





//     console.log(messageQueue);
//     return messageQueue;

// }






// async function writeMessages(messageQueue) {
//     // Takes the raw inputs and (1) decides which phone numbers to send them to and (2) makes pretty messages out of them
//     // Assumes messages coming from SparkMeter are formatted like: payment|{customer_code}|{credits_balance}|{amount}|{vendor}
//     // Where the bracketed values are how they need to be formatted in the SparkMeter SMS settings

//     var newQueue = [];
//     var i, sparkMeterText, splitMessage;
//     var messageType, customerAccountNumber, customerBalance, transactionAmount, vendor, tariffName;
//     var messageText, registeredPhoneNumber, paymentPhoneNumber;

//     for (i in messageQueue) {
//         sparkMeterText = messageQueue[i].text;
//         registeredPhoneNumber = messageQueue[i].phone_number;
//         console.log("Raw message from SparkMeter is: " + sparkMeterText);
//         splitMessage = sparkMeterText.replace(/,/g, ""); // Commas in big numbers will come in a strings, not numbers, and that will break things downstream
//         splitMessage = splitMessage.split("|"); // Don't use commas! SparkMeter will break you with surprise commas in large numbers.
//         messageType = splitMessage[0];
//         customerAccountNumber = splitMessage[1];
//         customerBalance = Math.round(splitMessage[2]);
//         vendor = splitMessage[4];
//         tariffName = splitMessage[5];

//         if (messageType === "payment") {
//             if (vendor === "M-Pesa via API") {
//                 transactionAmount = Math.round(splitMessage[3]);
//                 var billCalculations = await calculateBillKenya(customerAccountNumber, transactionAmount, tariffName);
//                 var billMessage = await writeBillMessageKenya(billCalculations);
//                 console.log("Bill message is: " + billMessage);




//                 // This SMS is sent to the paying phone number
//                 messageText = "Your payment of KSH" + transactionAmount + " to account " + customerAccountNumber + " was successful. Your new balance is KSH" + customerBalance + ". Thanks for using Renewvia Energy.\n" + billMessage;
//                 try {
//                     paymentPhoneNumber = await submitDbQueryPaymentConfirmation(customerAccountNumber, transactionAmount);
//                 }
//                 catch (e) {
//                     console.log("Error! " + e);
//                     email.sendEmail("Problem with connecting to the payment database to find the payment phone number to send the confirmation SMS to.\n" + e + "\n\n" + e.stack);
//                     paymentPhoneNumber = registeredPhoneNumber;
//                 }
//                 newQueue.push({ "content": messageText, "to_number": paymentPhoneNumber });




//                 // Additional SMS is sent to the registered phone number if payment phone number and registered phone number aren't the same
//                 if (paymentPhoneNumber !== registeredPhoneNumber) {
//                     messageText = "A successful payment of KSH" + transactionAmount + " has been made to your account, " + customerAccountNumber + ", from " + paymentPhoneNumber + ". Your new balance is KSH" + customerBalance + ". Thanks for using Renewvia Energy.\n" + billMessage;
//                     newQueue.push({ "content": messageText, "to_number": registeredPhoneNumber });
//                 }



//             }
//             else {
//                 console.log("A payment was made either from another API or from another user. If you want an SMS to be sent for payments like this one, edit the if statement on this part of the code.");
//             }
//         }
//         else if (messageType === "lowbalance") {
//             messageText = "Your credit balance for account " + customerAccountNumber + " is only KSH" + customerBalance + ". Top up soon to keep your power on. Thanks for using Renewvia Energy.";
//             newQueue.push({ "content": messageText, "to_number": registeredPhoneNumber });
//         }
//         else {
//             console.log("Problem with SparkMeter inputs, or no messages: " + JSON.stringify(messageQueue));
//         }
//     }

//     return newQueue;
// }







// async function submitDbQueryPaymentConfirmation(customerAccountNumber, transactionAmount) {
//     // Writes the query string that gets the phone number of the last payment matching the payment's account number and amount
//     // This way the payer gets a confirmation SMS even if the number they use isn't on record

//     var string = 'SELECT * FROM renewviadb.payments WHERE customerAccountNumber="' + customerAccountNumber + '" AND transactionAmount=' + transactionAmount + ' ORDER BY id DESC LIMIT 1';
//     var phoneNumber = await database.queryDB(string);
//     phoneNumber = "+" + phoneNumber[0].phoneNumber;
//     console.log("results is " + phoneNumber);
//     return phoneNumber;
// }



// async function calculateBillKenya(customerAccountNumber, transactionAmount, tariffName) {

//     var tariffNameSplit = tariffName.split(" ");
//     var firstWord = tariffNameSplit[0];

//     var siteDetails = sparkmeter.setSiteVariables(customerAccountNumber);

//     var tariff;
//     if (firstWord === "Residential") {
//         tariff = siteDetails.tariffResidential;
//     }
//     else if (firstWord === "Religious") {
//         tariff = siteDetails.tariffReligious;
//     }
//     else {
//         tariff = siteDetails.tariffCommercial;
//     }

//     var forexRate = siteDetails.forexRate;
//     var inflationRate = siteDetails.inflationRate;
//     var taxRate = siteDetails.taxRate;


//     var amountForEnergy = transactionAmount / ((1 + taxRate) * (1 + inflationRate + forexRate));
//     var kwhPurchased = amountForEnergy / tariff;

//     var amountForForex = forexRate * amountForEnergy;
//     var amountForInflation = inflationRate * amountForEnergy;
//     var amountForTax = taxRate * (amountForEnergy + amountForForex + amountForInflation);

//     var response = {
//         amountForEnergy: amountForEnergy,
//         kwhPurchased: kwhPurchased,
//         amountForForex: amountForForex,
//         amountForInflation: amountForInflation,
//         amountForTax: amountForTax,
//         total: transactionAmount
//     };

//     return response;
// }




// async function writeBillMessageKenya(billCalculations) {

//     // Clean up the numbers
//     var amountForEnergy = myMath.round(billCalculations.amountForEnergy, 2);
//     var kwhPurchased = myMath.round(billCalculations.kwhPurchased, 2);
//     var amountForForex = myMath.round(billCalculations.amountForForex, 2);
//     var amountForInflation = myMath.round(billCalculations.amountForInflation, 2);
//     var amountForTax = myMath.round(billCalculations.amountForTax, 2);
//     var total = billCalculations.total;

//     var inflationString;
//     var forexString;
//     var taxString;

//     // If a site doesn't have any of these charges for any reason (for example, a site in its first year won't have an inflation or forex charge),
//     // the SMS bill shouldn't refer to them
//     if (amountForInflation === 0) {
//         inflationString = "";
//     }
//     else {
//         inflationString = "Inflation adjustment: " + amountForInflation;
//     }

//     if (amountForForex === 0) {
//         forexString = "";
//     }
//     else {
//         forexString = "Foreign exchange adjustment: " + amountForForex;
//     }

//     if (amountForTax === 0) {
//         taxString = "";
//     }
//     else {
//         taxString = "VAT: " + amountForTax;
//     }





//     var messageText = "Here is your bill:\nEnergy Payment: " + amountForEnergy + " (for " + kwhPurchased + " units)\n" + forexString + "\n" + inflationString + "\n" + taxString + "\nTotal: " + total;
//     console.log(messageText);

//     return messageText;
// }
