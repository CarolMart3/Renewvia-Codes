var sparkmeter = require("../../apis/sparkmeter");
var database = require("../../apis/database");
var email = require("../../apis/email");
exports.handleMeterChange = handleMeterChange;





async function handleMeterChange(event) {

    try {
        console.log("Meter change handler is beginning.");

        // Cleaner names for the form inputs
        var meterSerial1 = event.meterSerial1;
        var meterSerial2 = event.meterSerial2;
        var meterSiteCode1 = event.meterSiteCode1.slice(0, 2);
        var meterSiteCode2 = event.meterSiteCode2.slice(0, 2);
        var changeType = event.changeType;

        // If the form user thinks a meter is unassigned but it's actually in its destination site's archive on Thundercloud, there will be an error. This will allow the archive to be checked.
        if (meterSiteCode1 === "Unassigned") {
            meterSiteCode1 = meterSiteCode2;
        }
        else if (meterSiteCode2 === "Unassigned") {
            meterSiteCode2 = meterSiteCode1;
        }

        console.log("Form input is:\nType: " + changeType + "\nSerial 1: " + meterSerial1 + "\nSerial 2: " + meterSerial2 + "\nSite Code 1: " + meterSiteCode1 + "\nSite Code 2: " + meterSiteCode2);


        // Build the data objects that will be used everywhere
        var meter1 = {
            meterSerial: meterSerial1,
            siteCode: meterSiteCode1
        };

        var meter2 = {
            meterSerial: meterSerial2,
            siteCode: meterSiteCode2
        };

        var meterChangeInfoObject = {
            meter1: meter1,
            meter2: meter2,
            changeType: changeType
        };

        meterChangeInfoObject = await getMetersInfo(meterChangeInfoObject);
        console.log(meterChangeInfoObject);
        // At this point, you should have all the information you need to make the switch.

        var meterChangeResult;

        if (changeType === "replacement") {
            meterChangeResult = await meterReplacementHandler(meterChangeInfoObject);
        }
        else if (changeType === "swap") {
            meterChangeResult = await meterSwapHandler(meterChangeInfoObject);
        }

        await meterChangeSuccessCheck(meterChangeInfoObject);
        return meterChangeResult;
    }
    catch (e) {
        console.log("There was an error. Here's the error object: " + e);
        return "Failure";
    }
}





async function getMetersInfo(meterChangeInfoObject) {

    var meterInfoObjectFromSparkMeter1 = await sparkmeter.getCustomerInfoByMeterSerial(meterChangeInfoObject.meter1.meterSerial, meterChangeInfoObject.meter1.siteCode);
    var meterInfoObjectFromSparkMeter2 = await sparkmeter.getCustomerInfoByMeterSerial(meterChangeInfoObject.meter2.meterSerial, meterChangeInfoObject.meter2.siteCode);

    // If Meter 1 exists on this Thundercloud already, restructure the data from SparkMeter to be easier to access
    if (meterInfoObjectFromSparkMeter1.error === null) {
        meterChangeInfoObject.meter1 = await meterInfoObjectFiller(meterInfoObjectFromSparkMeter1, meterChangeInfoObject.meter1);
    }
    else {
        // Otherwise, just fill in its status
        meterChangeInfoObject.meter1.activeStatus = "Not registered";
    }

    // If Meter 2 exists on this Thundercloud already, restructure the data from SparkMeter to be easier to access
    if (meterInfoObjectFromSparkMeter2.error === null) {
        meterChangeInfoObject.meter2 = await meterInfoObjectFiller(meterInfoObjectFromSparkMeter2, meterChangeInfoObject.meter2);
    }
    else {
        // Otherwise, just fill in its status
        meterChangeInfoObject.meter2.activeStatus = "Not registered";
    }

    return meterChangeInfoObject;
}





async function meterReplacementHandler(meterChangeInfoObject) {
    console.log("Meter replacement handler has begun.");


    if (meterChangeInfoObject.meter2.activeStatus !== true) {
        // First make sure that the new meter isn't already assigned to someone else

        var sparkmeterResponse1;
        var sparkmeterResponse2;

        // First, archive the old meter and remove its account number
        // The SparkMeter API won't allow customer code to be blanked out, so this should give the meter a unique account number that is clearly not active
        console.log("Attempting to archive old meter...");
        var timestamp = new Date;
        var newCode = meterChangeInfoObject.meter1.customerAccountNumber + " (used to be until " + timestamp + ")";
        var body = JSON.stringify({ active: false, code: newCode });
        sparkmeterResponse1 = await sparkmeter.updateCustomer(meterChangeInfoObject.meter1.siteCode, meterChangeInfoObject.meter1.customerID, body);
        console.log("SparkMeter response on archiving the old meter is: " + sparkmeterResponse1.status);



        // Then, match the new meter's details to the old meter's details
        // If the meter is in the Thundercloud archive, then it needs to be updated to active status with all the new details
        if (meterChangeInfoObject.meter2.activeStatus === false) {
            console.log("The new meter is coming from the archive. Attempting to update it with the old meter's details...");
            sparkmeterResponse2 = await changeMeterDetailsAndBalance(meterChangeInfoObject.meter2, meterChangeInfoObject.meter1);
            console.log("Updating the new meter was a " + sparkmeterResponse2);
            // Gotta match formats with the addCustomerHelper...
            sparkmeterResponse2 = { status: sparkmeterResponse2 };
        }

        // If the meter is new to this Thundercloud, it needs to be added as a new meter
        else if (meterChangeInfoObject.meter2.activeStatus === "Not registered") { // Meter is not on Thundercloud at all
            console.log("Can't find the new meter on the old meter's Thundercloud site, so adding it as a new meter now.");
            sparkmeterResponse2 = await addCustomerHelper(meterChangeInfoObject.meter1, meterChangeInfoObject.meter2.meterSerial);
            console.log("Sparkmeter response to adding the new meter to Thundercloud is " + sparkmeterResponse2.status);
        }

        if (sparkmeterResponse1.status === "success" && sparkmeterResponse2.status === "success") {
            console.log("Meter Replacement Handler was a total success");
            return "Success";
        }
        else {
            console.log("Meter Reaplacement Handler had an issue");
            return "Failure";
        }

    }


    // If the new meter is active, this needs to be handled differently. You can't just take away someone else's meter. It needs to be archived first.
    else {
        var message = "The new meter's status on Thundercloud is active, so either this should be a swap, or you should archive this customer's new meter first.";
        console.log(message);
        return message;
    }
}






async function meterSwapHandler(meterChangeInfoObject) {

    console.log("Meter swap handler has begun.");

    var body;
    var newCode;
    var sparkmeterResponse1;
    var sparkmeterResponse2;
    var sparkmeterResponse3;
    var sparkmeterResponse4;


    // If they're both active...
    if (meterChangeInfoObject.meter1.activeStatus === true || meterChangeInfoObject.meter2.activeStatus === true) {
        console.log("Both meters are active...");
        // If they're from the same site...
        if (meterChangeInfoObject.meter1.siteCode === meterChangeInfoObject.meter2.siteCode) {
            console.log("Both meters are from the same site...");
            // First, turn meter 1's account number into a placeholder
            // The SparkMeter API won't allow customer code to be blanked out, so this should give the meter a unique account number that is clearly not active
            var timestamp = new Date;
            console.log("First, attempting to turn meter 1's account number into a placeholder");
            newCode = meterChangeInfoObject.meter1.customerAccountNumber + " (used to be until " + timestamp + ")";
            body = JSON.stringify({ code: newCode });
            sparkmeterResponse1 = await sparkmeter.updateCustomer(meterChangeInfoObject.meter1.siteCode, meterChangeInfoObject.meter1.customerID, body);
            console.log("SparkMeter response on changing meter 1's account number to a placeholder is: " + sparkmeterResponse1.status);


            // Then, update meter 2 with all details
            sparkmeterResponse2 = await changeMeterDetailsAndBalance(meterChangeInfoObject.meter2, meterChangeInfoObject.meter1);
            console.log("Updating meter 2 with meter 1's details was a " + sparkmeterResponse2);

            // Finally, update meter 1 with all details
            sparkmeterResponse3 = await changeMeterDetailsAndBalance(meterChangeInfoObject.meter1, meterChangeInfoObject.meter2);
            console.log("Updating meter 1 with meter 2's details was a " + sparkmeterResponse3);

            if (sparkmeterResponse1.status === "success" && sparkmeterResponse2 === "success" && sparkmeterResponse3 === "success") {
                console.log("Meter Swap Handler was a success");
                return "Success";
            }
            else {
                console.log("Meter Swap Handler had a problem");
                return "Failure";
            }

        }
        else {
            // If the meters are from different sites, you must archive each of them and them add them to their new sites as new customers

            console.log("The two meters are from different sites.");

            // First, update each meter to be inactive
            newCode = meterChangeInfoObject.meter1.customerAccountNumber + " (used to be), moved to " + meterChangeInfoObject.meter2.customerAccountNumber + " (other site)";
            body = JSON.stringify({ active: false, code: newCode });
            sparkmeterResponse1 = await sparkmeter.updateCustomer(meterChangeInfoObject.meter1.siteCode, meterChangeInfoObject.meter1.customerID, body);
            console.log("Archiving the first meter was a " + sparkmeterResponse1);

            newCode = meterChangeInfoObject.meter2.customerAccountNumber + " (used to be), moved to " + meterChangeInfoObject.meter1.customerAccountNumber + " (other site)";
            body = JSON.stringify({ active: false, code: newCode });
            sparkmeterResponse2 = await sparkmeter.updateCustomer(meterChangeInfoObject.meter2.siteCode, meterChangeInfoObject.meter2.customerID, body);
            console.log("Archiving the second meter was a " + sparkmeterResponse2);

            // Then each meter as a new customer
            console.log("Adding meter 1 as a new meter now.");
            sparkmeterResponse3 = await addCustomerHelper(meterChangeInfoObject.meter1, meterChangeInfoObject.meter2.meterSerial);
            console.log("Sparkmeter response to adding the new meter to Thundercloud is " + sparkmeterResponse3.status);

            console.log("Adding meter 2 as a new meter now.");
            sparkmeterResponse4 = await addCustomerHelper(meterChangeInfoObject.meter2, meterChangeInfoObject.meter1.meterSerial);

            if (sparkmeterResponse1.status === "success" && sparkmeterResponse2.status === "success" && sparkmeterResponse3.status === "success" && sparkmeterResponse4.status === "success") {
                return "success";
            }
            else {
                return "failure";
            }
        }
    }
    else {
        return "At least one of the meters isn't active, so this isn't a swap. Use the replacement form instead.";
    }
}




async function meterChangeSuccessCheck(meterChangeInfoObject) {

    console.log('--------------------------------------------------------------');
    console.log("One final check of all the details");
    console.log('--------------------------------------------------------------');

    var newSiteCode1;
    var newSiteCode2;

    if (meterChangeInfoObject.changeType === "swap") {
        newSiteCode1 = meterChangeInfoObject.meter2.siteCode;
        newSiteCode2 = meterChangeInfoObject.meter1.siteCode;
    }
    else {
        newSiteCode1 = meterChangeInfoObject.meter1.siteCode;
        newSiteCode2 = meterChangeInfoObject.meter2.siteCode;
    }

    // Wiping meterChangeInfoObject to only include which sites and serial numbers to check 
    var meterChangeInfoObjectPostChange = {
        meter1: {
            meterSerial: meterChangeInfoObject.meter1.meterSerial,
            siteCode: newSiteCode1
        },
        meter2: {
            meterSerial: meterChangeInfoObject.meter2.meterSerial,
            siteCode: newSiteCode2
        }
    };

    // Run it through the same info gathering as in the beginning of the process
    meterChangeInfoObjectPostChange = await getMetersInfo(meterChangeInfoObjectPostChange);

    // Small cleanup to make checking easier
    delete meterChangeInfoObject.meter1.customerID;
    delete meterChangeInfoObject.meter1.siteAuthToken;
    delete meterChangeInfoObject.meter2.customerID;
    delete meterChangeInfoObject.meter2.siteAuthToken;

    delete meterChangeInfoObjectPostChange.meter1.customerID;
    delete meterChangeInfoObjectPostChange.meter1.siteAuthToken;
    delete meterChangeInfoObjectPostChange.meter2.customerID;
    delete meterChangeInfoObjectPostChange.meter2.siteAuthToken;

    // Log both whole objects for visual verification
    console.log("The original status was:\n" + JSON.stringify(meterChangeInfoObject));
    console.log("The new status is:\n" + JSON.stringify(meterChangeInfoObjectPostChange));

    await email.sendEmail("Somebody used the meter change form and you need to update the customer database. Here is the before and after.\n\nThe original status was:\n" + JSON.stringify(meterChangeInfoObject) + "\n\nThe new status is:\n" + JSON.stringify(meterChangeInfoObjectPostChange));

    return;

}







async function meterInfoObjectFiller(meterInfoObjectFromSparkMeter, meterChangeInfoObject) {

    meterChangeInfoObject.customerAccountNumber = meterInfoObjectFromSparkMeter.customers[0].code;
    meterChangeInfoObject.customerID = meterInfoObjectFromSparkMeter.customers[0].id;
    meterChangeInfoObject.balance = meterInfoObjectFromSparkMeter.customers[0].credit_balance;
    meterChangeInfoObject.name = meterInfoObjectFromSparkMeter.customers[0].name;
    meterChangeInfoObject.activeStatus = meterInfoObjectFromSparkMeter.customers[0].meters[0].active;
    meterChangeInfoObject.tariff = meterInfoObjectFromSparkMeter.customers[0].meters[0].current_tariff_name;
    meterChangeInfoObject.phoneNumber = meterInfoObjectFromSparkMeter.customers[0].phone_number;

    var siteVariables = sparkmeter.setSiteVariables(meterChangeInfoObject.customerAccountNumber);

    meterChangeInfoObject.siteURLPath = siteVariables.siteURLPath;
    meterChangeInfoObject.meterBaseURL = siteVariables.meterBaseURL;
    meterChangeInfoObject.siteAuthToken = siteVariables.siteAuthToken;

    return meterChangeInfoObject;

}








// async function postPaymentHelper(sparkMeterCustomerID, transactionAmount, siteURLPath, siteAuthToken) {

//     // Helper variables to make the code cleaner
//     var transactionID = "Meter change balance transfer " + Date.now();

//     var transactionDataObject = {
//         siteURLPath: siteURLPath,
//         siteAuthToken: siteAuthToken,
//         sparkMeterCustomerID: sparkMeterCustomerID,
//         transactionAmount: transactionAmount,
//         transactionID: transactionID
//     };

//     return transactionDataObject;
// }









async function addCustomerHelper(meterDetails, meterSerial) {

    var tariff = meterDetails.tariff;
    var customerName = meterDetails.name;
    var customerAccountNumber = meterDetails.customerAccountNumber;
    var phoneNumber = meterDetails.phoneNumber;
    var startingCreditBalance = meterDetails.balance;
    var operatingMode = "auto";

    var sparkMeterResponse = await sparkmeter.addCustomer(meterSerial, tariff, customerName, customerAccountNumber, phoneNumber, operatingMode, startingCreditBalance);
    return sparkMeterResponse.data; // Currently I pass the whole Axios response object back on the sparkmeter.addCustomer call, which was a mistake.
}








async function changeMeterDetailsAndBalance(newMeterDetails, oldMeterDetails) {

    /* This function "flashes" details of one meter ("old meter") onto another meter ("new meter").
    It is helpful because it transfers the balance too, which requires multiple steps.

    Note that "new" and "old" in this function aren't necessarily referrring to the new and
    old meters of a meter replacement, as this function is also used for a swap of two meters that
    are both active. "Old" and "new" just mean where the data is coming from and where it's going. */

    console.log('--------------------------------------------------------------');
    console.log("The subroutine of changing meter details and balance has begun");
    console.log("The request is to put meter " + oldMeterDetails.meterSerial + "'s details onto meter " + newMeterDetails.meterSerial);
    console.log('--------------------------------------------------------------');

    // Right now this is the only variable coming from newMeterDetails
    var newMeterCustomerID = newMeterDetails.customerID;

    var sparkmeterResponse1;
    var sparkmeterResponse2;
    var sparkmeterResponse3;

    // First, update everything on the new meter except balance
    var body = JSON.stringify({
        code: oldMeterDetails.customerAccountNumber,
        name: oldMeterDetails.name,
        meter_tariff_name: oldMeterDetails.tariff,
        phone_number: oldMeterDetails.phoneNumber,
        active: true,
        operating_mode: "auto"
    });

    console.log("Changing meter " + newMeterDetails.meterSerial + " to these details: " + body);

    sparkmeterResponse1 = await sparkmeter.updateCustomer(oldMeterDetails.siteCode, newMeterCustomerID, body);
    console.log("SparkMeter response on updating the new meter is: " + sparkmeterResponse1.status);





    // Next, zero its balance
    sparkmeterResponse2 = await sparkmeter.zeroBalance(oldMeterDetails.customerAccountNumber);
    console.log("SparkMeter response on zeroing the balance of the new meter is " + sparkmeterResponse2.status);




    // Finally, make a payment of the amount of its new balance
    // It seems to error out if you try to post a transaction of zero. That's not documented, but it seems to be the case.
    var balanceToTransfer = oldMeterDetails.balance;

    if (balanceToTransfer > 0) {
        var transactionID = "Meter change balance transfer " + Date.now();
        var sparkmeterResponse3 = await sparkmeter.postPayment(oldMeterDetails.customerAccountNumber, balanceToTransfer, "cash", transactionID);
        console.log("SparkMeter response on posting the old meter's balance as a transaction to the new meter is " + sparkmeterResponse3.status);
    }
    else {
        console.log("Balance to be transfered was zero, so no transaction was posted.");
        sparkmeterResponse3 = { status: "success" };
    }

    console.log('--------------------------------------------------------------');

    if (sparkmeterResponse1.status === "success" && sparkmeterResponse2.status === "success" && sparkmeterResponse3.status === "success") {
        return "success";
    }
    else {
        return "failure";
    }
}



async function updateSerialNumberInDatabase(customerAccountNumber, newMeterSerialNumber) {
    var update = "renewviadb.accountnumbers";
    var setString = 'meterSerial = "' + newMeterSerialNumber + '"';
    var where = 'customerAccountNumber = "' + customerAccountNumber + '"';

    var queryString = database.updateDB(update, setString, where);
    var connectionResult = await database.queryDB(queryString);
    return connectionResult;
}



    // Old stuff, delete once it works:
    // This transactionDataObject is needed to interface to the original postPayment function, so make it first:
    // var transactionDataObject = await postPaymentHelper(newMeterCustomerID, oldMeterDetails.balance, oldMeterDetails.siteURLPath, oldMeterDetails.siteAuthToken);
    // var memoString = "This payment is a balance transfer from meter " + oldMeterDetails.meterSerial;
    // transactionDataObject.memo = memoString;