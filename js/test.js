
var pos = 0;
var ctx = null;
var image = null;
var overlayCtx = null;

function stackblur(id) {
	stackBlurCanvasRGB(id, 0, 0, 320, 240, 2);
}

function sobel(id) {
	Filters.sobel(document.getElementById(id));
}

function clearOverlay() {
	overlayCtx.clearRect(0, 0, 320, 240)
}

function resetCanvas() {
	ctx = document.getElementById("snapshot").getContext("2d");
	ctx.clearRect(0, 0, 320, 240);
	image = ctx.getImageData(0, 0, 320, 240);

	document.getElementById("edgeDetect").getContext("2d").clearRect(0, 0, 320, 240);

	overlayCtx = document.getElementById("overlay").getContext("2d");
	clearOverlay();
}

function capture() {
	console.time("capture");
	$("#webcam").get(0).capture();
}

function onCaptureComplete() {
	console.timeEnd("capture");

	var img = document.getElementById("snapshot").getContext("2d").getImageData(0, 0, 320, 240);
	document.getElementById("edgeDetect").getContext("2d").putImageData(img, 0, 0);

	console.time("stackblur");
	stackblur('edgeDetect');
	console.timeEnd("stackblur");

	console.time("sobel");
	sobel('edgeDetect');
	console.timeEnd("sobel");

	console.time("blobDetect");
	var blobs = blobDetect('edgeDetect');
	console.timeEnd("blobDetect");

	if (blobs.length == 9) {
		colorScanBlobs(blobs, !cont, "#snapshot", "#sampleCube", "#calcCube", "#satvshue");
	}
	if (cont) {
		setTimeout(capture, 1);
	}
}

cont = false;
function continuous() {
	cont = true;
	capture();
}

function contStop() {
	cont = false;
}

// Copy an image into the canvas
function copy() {
	resetCanvas();
	var img = document.getElementById("testImage");
	document.getElementById("snapshot").getContext("2d").drawImage(img, 0, 0);
	document.getElementById("edgeDetect").getContext("2d").drawImage(img, 0, 0);
}

$(window).load(function() {
	$("body").focus();
	resetCanvas();
	var graphContext = document.getElementById("satvshue").getContext("2d");
	graphContext.fillStyle = "#cccccc";
	graphContext.fillRect(0, 0, 110, 370);
	swfobject.embedSWF("webcam/webcam.swf", "webcam", "320", "240", "10", "swfobject/expressInstall.swf", null,
			{ allowScriptAccess: "always", wmode: "transparent" });
});

/**
 * Callback from webcam.swf
 * @param data base64 encoded JPG image from webcam
 */
function onCapture(data) {
	var img = document.getElementById("webcamImage");
	img.src = "data:image/jpg;base64," + data;
	// Allow image to be drawn into element before attempting to read pixels from it
	setTimeout(function() {
		resetCanvas();
		document.getElementById("snapshot").getContext("2d").drawImage(img, 0, 0);
		console.timeEnd("capture");
		onCaptureComplete();
	}, 1);
}

$(document).keydown(function(evt) {
	if (evt.keyCode == 32) {
		// space bar
		capture();
		return false;
	}
});