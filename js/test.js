
var pos = 0;
var ctx = null;
var image = null;
var overlayCtx = null;
var lastContinuousTimestamp = null;
var logging = true;
var videoEl = null;

function stackblur(id) {
	stackBlurCanvasRGB(id, 0, 0, 320, 240, 2);
}

function sobel(id) {
	fastSobel(document.getElementById(id), 320, 240);
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
	if (logging) console.time("capture");
	resetCanvas();
	var snapshot = document.getElementById("snapshot");
	if (videoEl && videoEl.videoWidth) {
		var vw = videoEl.videoWidth;
		var vh = videoEl.videoHeight;
		var targetAspect = snapshot.width / snapshot.height;
		var srcAspect = vw / vh;
		var sx = 0, sy = 0, sw = vw, sh = vh;
		if (srcAspect > targetAspect) {
			sw = vh * targetAspect;
			sx = (vw - sw) / 2;
		} else if (srcAspect < targetAspect) {
			sh = vw / targetAspect;
			sy = (vh - sh) / 2;
		}
		snapshot.getContext("2d").drawImage(videoEl, sx, sy, sw, sh, 0, 0, snapshot.width, snapshot.height);
	}
	if (logging) console.timeEnd("capture");
	onCaptureComplete();
}

function onCaptureComplete() {
	if (logging) console.timeEnd("capture");

	var img = document.getElementById("snapshot").getContext("2d").getImageData(0, 0, 320, 240);
	document.getElementById("edgeDetect").getContext("2d").putImageData(img, 0, 0);

	if (logging) console.time("stackblur");
	stackblur('edgeDetect');
	if (logging) console.timeEnd("stackblur");

	if (logging) console.time("sobel");
	sobel('edgeDetect');
	if (logging) console.timeEnd("sobel");

	if (logging) console.time("blobDetect");
	var blobs = blobDetect('edgeDetect');
	if (logging) console.timeEnd("blobDetect");

	if (blobs.length == 9) {
		var colors = getBlobColors(blobs, "#snapshot", "#sampleCube", "#satvshue");
		var cubies = $("#sampleCube .cubie");
		for (var i=0; i < 9; i++) {
			var dist = distanceBetween(colors[i], colors[4]);
			cubies.eq(i).text(Math.round(dist));
		}
	}
	if (cont) {
		var now = new Date().getTime();
		if (lastContinuousTimestamp != null) {
			var elapsed = now - lastContinuousTimestamp;
			var fps10 = String(Math.round(10000 / elapsed));
			$("#fps").text(fps10.substr(0, fps10.length-1) + "." + fps10.substr(-1, 1) + " fps");
		}
		lastContinuousTimestamp = now;
		setTimeout(capture, 10);
	} else {
		$("#fps").text("");
	}
}

cont = false;
function continuous() {
	cont = true;
	logging = false;
	capture();
}

function contStop() {
	cont = false;
	logging = true;
}

// Copy an image into the canvas
function copy() {
	resetCanvas();
	var img = document.getElementById("testImage");
	document.getElementById("snapshot").getContext("2d").drawImage(img, 0, 0);
	document.getElementById("edgeDetect").getContext("2d").drawImage(img, 0, 0);
}

function setupCamera() {
	videoEl = document.getElementById("webcam");
	if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
		console.log("getUserMedia is not supported in this browser");
		return;
	}
	navigator.mediaDevices.getUserMedia({
		video: { width: { ideal: 640 }, height: { ideal: 480 } },
		audio: false
	}).then(function(stream) {
		videoEl.srcObject = stream;
	}).catch(function(err) {
		console.log("Unable to access webcam:", err);
	});
}

$(window).load(function() {
	$("body").focus();
	resetCanvas();
	var graphContext = document.getElementById("satvshue").getContext("2d");
	graphContext.fillStyle = "#cccccc";
	graphContext.fillRect(0, 0, 220, 370);

	setupCamera();
});

$(document).keydown(function(evt) {
	if (evt.keyCode == 32) {
		// space bar
		capture();
		return false;
	}
});