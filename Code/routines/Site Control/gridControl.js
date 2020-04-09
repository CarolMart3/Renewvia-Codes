var sparkmeter = require("../../apis/sparkmeter");
exports.controlGrid = controlGrid;


async function controlGrid(desiredState, siteCode) {

    desiredState = desiredState.toLowerCase(); // Make it so case doesn't matter

    var sparkmeterDetails = sparkmeter.setSiteVariables(siteCode);
    var siteURL = sparkmeterDetails.siteURLPath;
    var meterBaseURL = sparkmeterDetails.meterBaseURL;
    var siteAuthToken = sparkmeterDetails.siteAuthToken;

    var customerList = await sparkmeter.getCustomerList(siteCode);
    var metersList = cleanupList(customerList);

    var i, response;
    for (i in metersList) {
        response = await sparkmeter.changeMeterMode(siteURL, meterBaseURL, siteAuthToken, metersList[i], desiredState);
        console.log(response);
    }

    return;
}



// This function takes the big nasty customer list and makes a more usable list of just what we want. In this case, meter serial numbers.
function cleanupList(customerList) {
    var metersList = []; // Initialize the array that will hold our meter serial number list
    var i; // Initialize the for loop variable

    for (i in customerList.customers) { // Run this code for each element (customer) in the list
        if (customerList.customers[i].meters[0].active == true && customerList.customers[i].code != null) { // This weeds out inactive meters and meters with no customer account number, like totalizer meters
            metersList.push(customerList.customers[i].meters[0].serial); // This is where we build our new list that only contains serial numbers.
        }
    }

    return metersList;
}
