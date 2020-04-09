// This isn't very useful yet. It's a way to update a SparkMeter customer's phone number in ThunderCloud, but it doesn't update our database.
// This could be useful one day if we come up with a nice way to have customers update their own phone numbers.


var sparkmeter = require("../../apis/sparkmeter");
exports.updatePhoneNumberHandler = updatePhoneNumberHandler;

async function updatePhoneNumberHandler(customerAccountNumber, newPhoneNumber) {
    var transactionDataObject = { "customerAccountNumber": customerAccountNumber };
    transactionDataObject = sparkmeter.setSiteVariables;

    var customerInfo = sparkmeter.getCustomerInfo(transactionDataObject.customerAccountNumber);
    var customerId = customerInfo.customers[0].id;
    var body = {
        "phone_number": newPhoneNumber
    };

    var sparkMeterResponse = await sparkmeter.updateCustomer(transactionDataObject, customerId, body);
    return sparkMeterResponse;
}
