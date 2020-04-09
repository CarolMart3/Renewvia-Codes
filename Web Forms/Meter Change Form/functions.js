function submitDetails(formElementID, submitButtonID, renewviewServerMessageType){
	var form = document.getElementById(formElementID);

	if(form.checkValidity()===false){
		form.classList.add('was-validated');
	}
	else{
		form.classList.add('was-validated');
		document.getElementById(submitButtonID).innerHTML="Working on it...";
		var message=formToJson(formElementID);
		message["MessageType"] = renewviewServerMessageType;
		message=JSON.stringify(message);
		var response = sendToServer(message, submitButtonID);

		// This line is helpful if you need an easy printout of the message you're sending
		// document.getElementById("showText").innerHTML=message;

	}

}





function formToJson(form){
	var text="";
	var output= new Object();
	var elements = document.getElementById(form).elements;

	var fieldName;

	for (var i in elements){
		fieldName = elements[i].name;
		output[fieldName] =  elements[i].value;
	}

	return output;
}







function sendToServer(message,responseElementID){

	var xhttp= new XMLHttpRequest();

	// A lame attempt at hiding the url from crawlers
	// I never said I knew anything about web security

	var url1 = "https://fczcmx8rk2.execute-";
	var url2 = "api.eu-we";
	var url3 = "st-1.amazo";
	var url4 = "naw";
	var url5 = "s.com/prod";
	var url = url1+url2+url3+url4+url5;


	xhttp.open("POST",url,true);


	xhttp.onreadystatechange = function(){
		if(this.readyState==4){
			document.getElementById(responseElementID).innerHTML= this.responseText.replace(/"/g,'');
		}
	};

	xhttp.setRequestHeader("Content-Type","text/plain");
	xhttp.send(message);

}





// function reserveAccountNumber(){
// 	var form = document.getElementById("accountNumberForm");

// 	if(form.checkValidity()===false){
// 		form.classList.add('was-validated');
// 	}
// 	else{
// 		form.classList.add('was-validated');
// 		document.getElementById("accountNumberFormSubmitButton").innerHTML="Working on it...";
// 		document.getElementById("reservedAccountNumber").value = document.getElementById("customerAccountNumberInput").value;
// 		var message=formToJson("accountNumberForm");
// 		message["MessageType"] = "Signup form- new account number";
// 		message=JSON.stringify(message);
// 		var response=sendToServer(message,"accountNumberFormSubmitButton","accountNumberFormSubmitButton");
// 	}
// }









// All the different ways I've played with showing and hiding elements
// -------------------------------------------------------------------

function toggleVisibility(elementID){
	var e = document.getElementById("QRStuff");

	console.log(e.style.display);

	if (e.style.diplay == "none"){

		e.style.display = "block";
	} else {
		console.log("Hello?");
		e.style.display="none";
	}
}



// These ones use HTML attributes

function showElement(elementID){
	document.getElementById(elementID).removeAttribute("hidden");
}

function hideElement(elementID){
	document.getElementById(elementID).setAttribute("hidden",true);
}


// These ones use the Bootstrap d class

function showElementTwo(elementID){
	document.getElementById(elementID).classList.remove("d-none");
}

function hideElementTwo(elementID){
	document.getElementById(elementID).classList.add("d-none");
}

// -------------------------------------------------------------------
// -------------------------------------------------------------------







// I never got this to work
function playSound(elementID){
	var soundVar = document.getElementById("audioID");
	soundVar.play();
}





// Old version of toggleButtons that was specific for tariff settings
function setTariff(tariff, buttonID){
	document.getElementById("tariff").value=tariff;
	var buttonList = document.getElementsByClassName("tariff-button");

	document.getElementById(buttonID).classList.add("btn-dark");

	for (var i in buttonList){
		if(buttonList[i].id!==buttonID){
			try{
				document.getElementById(buttonList[i].id).classList.remove("btn-dark");
			}
			catch(error){};
		}
	}
}



// This function allows buttons to be used to set values.
function toggleButtons(buttonID, buttonClass, value, variableBeingSet){
	
	var clickedButtonClass = "btn-primary";
	var defaultButtonClass = "btn-dark";

	document.getElementById(variableBeingSet).value=value; // You should make a hidden form element whose value can be set here
	var buttonList = document.getElementsByClassName(buttonClass); // Get all the other buttons in the toggle group...

	document.getElementById(buttonID).classList.remove(defaultButtonClass); // Change this button's color
	document.getElementById(buttonID).classList.add(clickedButtonClass); // Change this button's color

	for (var i in buttonList){
		if(buttonList[i].id!==buttonID){
			try{
				document.getElementById(buttonList[i].id).classList.remove(clickedButtonClass); // Make the other buttons not the chosen color
				document.getElementById(buttonList[i].id).classList.add(defaultButtonClass);
			}
			catch(error){};
		}
	}
}






function qrButtonHandler(){
	cameraTester();
	// doQRStuff();
	// showElementTwo('QRStuff2');
}

function meterChangeTypeButtonHandler(buttonID, buttonClass, value, variableBeingSet){
	
	toggleButtons(buttonID, buttonClass, value, variableBeingSet);
	showElementTwo('meterDetails');

	if (value==="swap"){
		document.getElementById("meterSerial1Label").innerHTML = "Meter 1";
		document.getElementById("meterSerial2Label").innerHTML = "Meter 2";
	}
	else if (value === "replacement"){
		document.getElementById("meterSerial1Label").innerHTML = "Old Meter";
		document.getElementById("meterSerial2Label").innerHTML = "New Meter";
	}
}




// This block of code handles the first instance of the QR code reader
// -------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------

var video = document.createElement("video");
var canvasElement = document.getElementById("canvas");
var canvas = canvasElement.getContext("2d");
var loadingMessage = document.getElementById("loadingMessage");
var outputContainer = document.getElementById("output");
var outputMessage = document.getElementById("outputMessage");
var outputData = document.getElementById("outputData");

function drawLine(begin, end, color) {
	canvas.beginPath();
	canvas.moveTo(begin.x, begin.y);
	canvas.lineTo(end.x, end.y);
	canvas.lineWidth = 4;
	canvas.strokeStyle = color;
	canvas.stroke();
}

// Use facingMode: environment to attemt to get the front camera on phones
function cameraTester(){
	navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function(stream) {
		video.srcObject = stream;
	video.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
	video.play();
	requestAnimationFrame(tick);
});
}

function tick() {
	loadingMessage.innerText = "⌛ Loading video..."
	if (video.readyState === video.HAVE_ENOUGH_DATA) {
		loadingMessage.hidden = true;
		canvasElement.hidden = false;
		outputContainer.hidden = false;
		showElement("QRStuff");

		canvasElement.height = video.videoHeight;
		canvasElement.width = video.videoWidth;
		canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
		var imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
		var code = jsQR(imageData.data, imageData.width, imageData.height, {
			inversionAttempts: "dontInvert",
		});
		if (code) {
			drawLine(code.location.topLeftCorner, code.location.topRightCorner, "#FF3B58");
			drawLine(code.location.topRightCorner, code.location.bottomRightCorner, "#FF3B58");
			drawLine(code.location.bottomRightCorner, code.location.bottomLeftCorner, "#FF3B58");
			drawLine(code.location.bottomLeftCorner, code.location.topLeftCorner, "#FF3B58");
			// outputMessage.hidden = true;
			// outputData.parentElement.hidden = false;
			// outputData.innerText = code.data;
			// playSound();
			if(code.data!==""){
				document.getElementById("meterSerial1").value=code.data;
				hideElement("QRStuff");
				return;
			}
		} else {
			outputMessage.hidden = false;
			outputData.parentElement.hidden = true;
		}
	}
	requestAnimationFrame(tick);
}

// -------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------





// This block of code handles the first instance of the QR code reader
// -------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------

var video2 = document.createElement("video");
var canvasElement2 = document.getElementById("canvas2");
var canvas2 = canvasElement2.getContext("2d");
var loadingMessage2 = document.getElementById("loadingMessage2");
var outputContainer2 = document.getElementById("output2");
var outputMessage2 = document.getElementById("outputMessage2");
var outputData2 = document.getElementById("outputData2");


function drawLine(begin, end, color) {
	canvas.beginPath();
	canvas.moveTo(begin.x, begin.y);
	canvas.lineTo(end.x, end.y);
	canvas.lineWidth = 4;
	canvas.strokeStyle = color;
	canvas.stroke();
}

// Use facingMode: environment to attemt to get the front camera on phones
function cameraTester2(){
	navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function(stream) {
		video2.srcObject = stream;
	video2.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
	video2.play();
	requestAnimationFrame(tick2);
});
}

function tick2() {
	loadingMessage2.innerText = "⌛ Loading video..."
	if (video2.readyState === video.HAVE_ENOUGH_DATA) {
		loadingMessage2.hidden = true;
		canvasElement2.hidden = false;
		outputContainer2.hidden = false;
		showElement("QRStuff2");

		canvasElement2.height = video2.videoHeight;
		canvasElement2.width = video2.videoWidth;


		canvas2.drawImage(video2, 0, 0, canvasElement2.width, canvasElement2.height);
		var imageData = canvas2.getImageData(0, 0, canvasElement2.width, canvasElement2.height);
		var code = jsQR(imageData.data, imageData.width, imageData.height, {
			inversionAttempts: "dontInvert",
		});
		if (code) {
			drawLine(code.location.topLeftCorner, code.location.topRightCorner, "#FF3B58");
			drawLine(code.location.topRightCorner, code.location.bottomRightCorner, "#FF3B58");
			drawLine(code.location.bottomRightCorner, code.location.bottomLeftCorner, "#FF3B58");
			drawLine(code.location.bottomLeftCorner, code.location.topLeftCorner, "#FF3B58");
			// outputMessage.hidden = true;
			// outputData.parentElement.hidden = false;
			// outputData.innerText = code.data;
			// playSound();
			if(code.data!==""){
				document.getElementById("meterSerial2").value=code.data;
				hideElement("QRStuff2");
				return;
			}
		} else {
			outputMessage2.hidden = false;
			outputData2.parentElement.hidden = true;
		}
	}
	requestAnimationFrame(tick2);
}

// -------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------