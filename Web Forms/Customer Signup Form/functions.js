// var form1 = document.getElementById("accountNumberFormSubmitButton");
// var form2 = document.getElementById("customerDetailsFormSubmitButton");
// form1.addEventListener('click', preventAction(event));
// form2.addEventListener('click', preventAction(event));


// function preventAction(event){
// 	event.preventDefault();
// 	event.stopPropagation();
// }



function sendToServer(message,responseElementID, buttonID){

	var xhttp= new XMLHttpRequest();
	xhttp.open("POST","https://fczcmx8rk2.execute-api.eu-west-1.amazonaws.com/prod",true);


	xhttp.onreadystatechange = function(){
		if(this.readyState==4){
			document.getElementById(responseElementID).innerHTML= this.responseText.replace(/"/g,'');
		}
	};

	xhttp.setRequestHeader("Content-Type","text/plain");
	xhttp.send(message);

}




// document.getElementById(customerAccountNumberInput).value


function reserveAccountNumber(){
	var form = document.getElementById("accountNumberForm");

	if(form.checkValidity()===false){
		form.classList.add('was-validated');
	}
	else{
		form.classList.add('was-validated');
		document.getElementById("accountNumberFormSubmitButton").innerHTML="Working on it...";
		document.getElementById("reservedAccountNumber").value = document.getElementById("customerAccountNumberInput").value;
		var message=formToJson("accountNumberForm");
		message["MessageType"] = "Signup form- new account number";
		message=JSON.stringify(message);
		var response=sendToServer(message,"accountNumberFormSubmitButton","accountNumberFormSubmitButton");
	}
}


function submitDetails(){
	var form = document.getElementById("customerDetailsForm");

	if(form.checkValidity()===false){
		form.classList.add('was-validated');
	}
	else{
		form.classList.add('was-validated');
		document.getElementById("customerDetailsFormSubmitButton").innerHTML="Working on it...";
		var message=formToJson("customerDetailsForm");
		message["MessageType"] = "Signup form- submit info";
		message=JSON.stringify(message);
		var response = sendToServer(message,"customerDetailsFormSubmitButton", "customerDetailsFormSubmitButton");
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


function showElement(elementID){
	document.getElementById("QRStuff").removeAttribute("hidden");
}

function hideElement(elementID){
	document.getElementById("QRStuff").setAttribute("hidden",true);
}

function playSound(elementID){
	var soundVar = document.getElementById("audioID");
	soundVar.play();
}

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
navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function(stream) {
	video.srcObject = stream;
	video.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
	video.play();
	requestAnimationFrame(tick);
});

function tick() {
	loadingMessage.innerText = "⌛ Loading video..."
	if (video.readyState === video.HAVE_ENOUGH_DATA) {
		loadingMessage.hidden = true;
		canvasElement.hidden = false;
		outputContainer.hidden = false;

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
				document.getElementById("meterSerial").value=code.data;
				hideElement("QRStuff");
			}
		} else {
			outputMessage.hidden = false;
			outputData.parentElement.hidden = true;
		}
	}
	requestAnimationFrame(tick);
}
