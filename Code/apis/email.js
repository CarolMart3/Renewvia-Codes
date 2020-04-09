   // This makes use of the AWS Simple Notification System (SNS) to send emails.


   exports.sendEmail = sendEmail;
   exports.sendAsyncEmail = sendAsyncEmail;

   var AWS = require('aws-sdk');
   AWS.config.update({ region: 'eu-west-1' });
   var snsParams = {
       Message: "This text shouldn't appear.",
       TopicArn: process.env.arnEmail
   };


   function sendEmail(message) {

       snsParams.Message = message;
       var publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' }).publish(snsParams).promise(); // Creates promise and SNS service object

       publishTextPromise.then(
           function(data) {
               console.log("SNS message " + data.MessageId + " send sent to the topic " + snsParams.TopicArn);
               return;
           }).catch(
           function(err) {
               console.log("Sending SNS message did not work for this payment. Here's the details:");
               console.error(err, err.stack);
               return;
           });
   }


   async function sendAsyncEmail(message) {

       snsParams.Message = message;
       var publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' }).publish(snsParams).promise(); // Creates promise and SNS service object

       publishTextPromise.then(
           function(data) {
               console.log("SNS message " + data.MessageId + " send sent to the topic " + snsParams.TopicArn);
               return;
           }).catch(
           function(err) {
               console.log("Sending SNS message did not work for this payment. Here's the details:");
               console.error(err, err.stack);
               return;
           });
   }
   