
var F=0, L=1, B=2, R=3, U=4, D=5;
var scannedColors = [];	// array of faces, each one is a 9 length array of rgb values (each of those being an array size 3)
var capturing = false;
var currentFace;
var curentSnapshotImageData;
var solveStartTime;
var PROFESSOR_CUBE_MIN_TIME = 4000;
var solutionSteps = [];
var step = 0;
var spaceDown = false;
var audio;
var logging = true;
var usingWebRTC = false;
if (window.Audio) {
	audio = new Audio();
	if (audio.canPlayType('audio/ogg; codecs="vorbis"')) {
		audio.src = "audio/JAMZ.ogg";
	} else {
		audio.src = "audio/JAMZ.mp3";
	}
	audio.load();
}

// Prevent errors in browsers that don't have console
if (window['console'] == null) {
	window.console = {
		log: function() {}
	};
}

/**
 * Convert faces array into a string that can be sent to the solver routines
 * @param cubeFaces array of strings, each string is a face with 9 chars representing the colors for each cubie
 */
function convertToSolverInput(cubeFaces) {
	var x = "";
	// UF
	x += cubeFaces[U].charAt(3);
	x += cubeFaces[F].charAt(1);
	x += " ";
	// UR
	x += cubeFaces[U].charAt(7);
	x += cubeFaces[R].charAt(1);
	x += " ";
	// UB
	x += cubeFaces[U].charAt(5);
	x += cubeFaces[B].charAt(1);
	x += " ";
	// UL
	x += cubeFaces[U].charAt(1);
	x += cubeFaces[L].charAt(1);
	x += " ";
	// DF
	x += cubeFaces[D].charAt(3);
	x += cubeFaces[F].charAt(7);
	x += " ";
	// DR
	x += cubeFaces[D].charAt(1);
	x += cubeFaces[R].charAt(7);
	x += " ";
	// DB
	x += cubeFaces[D].charAt(5);
	x += cubeFaces[B].charAt(7);
	x += " ";
	// DL
	x += cubeFaces[D].charAt(7);
	x += cubeFaces[L].charAt(7);
	x += " ";
	// FR
	x += cubeFaces[F].charAt(5);
	x += cubeFaces[R].charAt(3);
	x += " ";
	// FL
	x += cubeFaces[F].charAt(3);
	x += cubeFaces[L].charAt(5);
	x += " ";
	// BR
	x += cubeFaces[B].charAt(3);
	x += cubeFaces[R].charAt(5);
	x += " ";
	// BL
	x += cubeFaces[B].charAt(5);
	x += cubeFaces[L].charAt(3);
	x += " ";
	// UFR
	x += cubeFaces[U].charAt(6);
	x += cubeFaces[F].charAt(2);
	x += cubeFaces[R].charAt(0);
	x += " ";
	// URB
	x += cubeFaces[U].charAt(8);
	x += cubeFaces[R].charAt(2);
	x += cubeFaces[B].charAt(0);
	x += " ";
	// UBL
	x += cubeFaces[U].charAt(2);
	x += cubeFaces[B].charAt(2);
	x += cubeFaces[L].charAt(0);
	x += " ";
	// ULF
	x += cubeFaces[U].charAt(0);
	x += cubeFaces[L].charAt(2);
	x += cubeFaces[F].charAt(0);
	x += " ";
	// DRF
	x += cubeFaces[D].charAt(0);
	x += cubeFaces[R].charAt(6);
	x += cubeFaces[F].charAt(8);
	x += " ";
	// DFL
	x += cubeFaces[D].charAt(6);
	x += cubeFaces[F].charAt(6);
	x += cubeFaces[L].charAt(8);
	x += " ";
	// DLB
	x += cubeFaces[D].charAt(8);
	x += cubeFaces[L].charAt(6);
	x += cubeFaces[B].charAt(8);
	x += " ";
	// DBR
	x += cubeFaces[D].charAt(2);
	x += cubeFaces[B].charAt(6);
	x += cubeFaces[R].charAt(8);
	return x;
}

function capture() {
	if (currentFace != null && !capturing) {
		if (usingWebRTC) {
			var video = $("video").get(0);
			document.getElementById("snapshot").getContext("2d").drawImage(video, 0, 0);
			onCaptureComplete();
		} else {
			$("#webcam").get(0).capture();
		}
	}
}

/**
 * Callback from webcam.swf
 * @param data base64 encoded JPG image from webcam
 */
function onCapture(data) {
	capturing = true;
	var img = $("#webcamImage").get(0);
	img.src = "data:image/jpg;base64," + data;
	// Allow image to be drawn into element before attempting to read pixels from it
	setTimeout(function() {
		document.getElementById("snapshot").getContext("2d").drawImage(img, 0, 0);
		onCaptureComplete();
	}, 1);
}

function onCaptureComplete() {
	if (currentFace != null) {
		var snapshotCtx = document.getElementById("snapshot").getContext("2d");
		var img = snapshotCtx.getImageData(0, 0, 320, 240);
		document.getElementById("edgeDetect").getContext("2d").putImageData(img, 0, 0);
		stackBlurCanvasRGB("edgeDetect", 0, 0, 320, 240, 2);
		fastSobel(document.getElementById("edgeDetect"), 320, 240);
		var blobs = blobDetect('edgeDetect');
		if (blobs.length == 9) {
			var dimensions = blobGroupDimensions(blobs);
			curentSnapshotImageData = snapshotCtx.getImageData(
				dimensions.x, dimensions.y, dimensions.width, dimensions.height);
			scannedColors[currentFace] = getBlobColors(blobs, "#snapshot");
			moveSnapshotToFace(dimensions);
		} else {
			scanFace(currentFace);
			capturing = false;
 		}
	}
}

function moveSnapshotToFace(dimensions) {
	// Create new 210x210 canvas positioned on top of snapshot
	var canvas = $('<canvas class="subsnapshot" width="'+curentSnapshotImageData.width+
		'" height="'+curentSnapshotImageData.height+'"></canvas>').appendTo("#main");
	$(canvas).css({"padding-left": dimensions.x, "padding-top": dimensions.y});
	// Copy the sub-picture of the snapshot into the new canvas
	canvas.get(0).getContext("2d").putImageData(curentSnapshotImageData, 0, 0);
	// Calculate position to animate to
	var dest = $("#f"+currentFace).position();
	var dx = dest.left + 7;
	var dy = dest.top + 7;
	canvas.animate({
		"margin-left": dx,
		"margin-top": dy,
		"padding-left": 0,
		"padding-top": 0,
		width: 40,
		height: 40
	}, 1000, onMoveSnapshotToFaceComplete);
}

function onMoveSnapshotToFaceComplete() {
	drawFace(currentFace, scannedColors[currentFace]);
	$(".subsnapshot").fadeOut(500, function() {
		$(this).remove();
	});
	scanNextUnscannedFace();
	capturing = false;
}

function drawFace(faceNum, colors) {
	// colors can either be a string of 9 chars (faces) or array of 9 RGB values
	var isString = (typeof colors == 'string');
	var canvas = $("#f"+faceNum+" canvas").get(0);
	if (canvas && canvas.getContext) {
		var context = canvas.getContext("2d");
		context.fillStyle = "#edebee";
		context.fillRect(0, 0, canvas.width, canvas.height);
		context.fillStyle = isString ? FACE_TO_HEX[colors.charAt(0)] : rgbToCss(colors[0]);
		context.fillRect(1, 1, 12, 12);
		context.fillStyle = isString ? FACE_TO_HEX[colors.charAt(1)] : rgbToCss(colors[1]);
		context.fillRect(14, 1, 12, 12);
		context.fillStyle = isString ? FACE_TO_HEX[colors.charAt(2)] : rgbToCss(colors[2]);
		context.fillRect(27, 1, 12, 12);
		context.fillStyle = isString ? FACE_TO_HEX[colors.charAt(3)] : rgbToCss(colors[3]);
		context.fillRect(1, 14, 12, 12);
		context.fillStyle = isString ? FACE_TO_HEX[colors.charAt(4)] : rgbToCss(colors[4]);
		context.fillRect(14, 14, 12, 12);
		context.fillStyle = isString ? FACE_TO_HEX[colors.charAt(5)] : rgbToCss(colors[5]);
		context.fillRect(27, 14, 12, 12);
		context.fillStyle = isString ? FACE_TO_HEX[colors.charAt(6)] : rgbToCss(colors[6]);
		context.fillRect(1, 27, 12, 12);
		context.fillStyle = isString ? FACE_TO_HEX[colors.charAt(7)] : rgbToCss(colors[7]);
		context.fillRect(14, 27, 12, 12);
		context.fillStyle = isString ? FACE_TO_HEX[colors.charAt(8)] : rgbToCss(colors[8]);
		context.fillRect(27, 27, 12, 12);
	}
}

function init() {
	initSolver();
	reset();
}

function reset() {
	scannedColors = [];
	//scannedFaces = ["FRUBFBFLU", "RRDRLDBDR", "DLDFBULBR", "LFBRRDBFU", "LFFDUBFLL", "RUBUDUULD"];
	currentFace = null;
	solutionSteps = [];
	step = 0;
	cube = solvedCube;
	solution = null;

	if (audio) {
		audio.pause();
	}

	$("#camera").fadeIn();
	$("#webcam_container").fadeIn();
	$("#camera_button").fadeIn();
	$(".small_cube").fadeIn();

	$("#omt").fadeOut();
	$("#input2").fadeOut();
	$("#solving").fadeOut();
	$("#suggestion").fadeOut();
	$("#suggestion_move").fadeOut();
	$("#done").fadeOut();

	for (var i=0; i < FACE_ORDER.length; i++) {
		drawFace(i, "    " + FACE_ORDER.charAt(i) + "    ");
	}
	scanNextUnscannedFace();

	$("body").focus();

}

function scanNextUnscannedFace() {
	currentFace = null;
	$(".small_cube").removeClass("selected");
	for (var i=0; i < 6; i++) {
		if (scannedColors[i] == null || scannedColors[i].length == 0) {
			scanFace(i);
			return;
		}
	}
	// All done scanning
	var valid = false;
	var cubeFaces = matchColors(scannedColors);
	if (cubeFaces != null) {
		cube = convertToSolverInput(cubeFaces);
		//cube = "BD LF UF FR UR UB DR BR BL UL DF DL UFR BRD URB FLD RFD DLB ULF UBL"; 	// TODO: REMOVE - TESTING!
		console.log(cube);
		valid = validateCube(cube);
	}
	if (valid) {
		// Replace scanned colors with actual matched colors
		for (var i=0; i < 6; i++) {
			drawFace(i, cubeFaces[i]);
		}
		showSolvingUI();
	} else {
		// copy errorImg
		var canvas = $("#snapshot").get(0);
		if (canvas.getContext) {
			ctx = canvas.getContext("2d");
			ctx.drawImage($("#errorImg").get(0), 0, 0);
		}
	}
}

function showSolvingUI() {
	$("#camera").fadeOut();
	$("#camera_button").fadeOut();
	$("#solving").fadeIn();
	solveStartTime = new Date().getTime();
	solve();
}

function onSolutionFound(str) {
	str = str.trim();
	solutionSteps = str.length > 0 ? str.split(" ") : [];
	step = 0;
	var now = new Date().getTime();
	console.log("now - solveStartTime = ", now - solveStartTime);
	if (now - solveStartTime < PROFESSOR_CUBE_MIN_TIME) {
		setTimeout(showCurrentSolutionStep, PROFESSOR_CUBE_MIN_TIME - (now - solveStartTime));
	} else {
		showCurrentSolutionStep();
	}
}

function showCurrentSolutionStep() {
	if (step > solutionSteps.length) {
		return;
	}
	if (step == 0) {
		$("#solving").fadeOut();
		$(".small_cube").fadeOut();
		$("#suggestion").fadeIn();
		$("#suggestion_move").fadeIn();
	}
	if (step == solutionSteps.length) {
		// All steps complete - they should now (hopefully) have a solved cube
		$("#suggestion").fadeOut();
		$("#suggestion_move").fadeOut();
		$("#done").fadeIn();
		if (audio) {
			audio.currentTime = 0;
			audio.play();
		}
		return;
	}
	var s = solutionSteps[step];
	$("#suggestion .center").css("background-color", FACE_TO_HEX[s.charAt(0)]);
	if (s.length == 1) {
		$("#suggestion_move").removeClass().addClass("right");
	} else if (s.charAt(1) == "'") {
		$("#suggestion_move").removeClass().addClass("left");
	} else {
		$("#suggestion_move").removeClass().addClass("one_eighty");
	}
}

function omt() {
	$("#camera").fadeOut();
	$("#camera_button").fadeOut();
	$(".small_cube").fadeOut();
	$("#solving").fadeOut();
	$("#suggestion").fadeOut();
	$("#suggestion_move").fadeOut();
	$("#done").fadeOut();
	$("#omt").fadeIn();
}

function showInput2() {
	$("#input2").fadeIn();
	$("#camera").fadeIn();
	$("#webcam_container").fadeOut();
}

function input2Done(txt) {
	var words = txt.toLowerCase().trim().split(" ");
	console.log(words);
	if (words.length == 9) {
		var face = [];
		for (var i=-0; i < 9; i++) {
			var rgb = COLOR_TO_RGB[words[i]];
			if (rgb != null) {
				face.push(rgb);
			} else {
				return;
			}
		}
		scannedColors[currentFace] = face;
		onMoveSnapshotToFaceComplete();
		$("#input2 input").val("")
	}
}

function scanFace(face) {
	$(".small_cube").removeClass("selected");
	var canvas = $("#snapshot").get(0);
	if (canvas.getContext) {
		ctx = canvas.getContext("2d");
		ctx.drawImage($("#step"+(face+1)).get(0), 0, 0);
	}
	currentFace = face;
	$("#f"+face).addClass("selected");
}

function embedFlash() {
	console.log("Using Flash");
	swfobject.embedSWF("webcam/webcam.swf", "webcam", "320", "240", "10", "swfobject/expressInstall.swf", null,
			{ allowScriptAccess: "always", wmode: "transparent" });
}

$(window).load(function() {

	$("body").focus();

	// Use WebRTC if available, otherwise fall back on Flash
	if (navigator['webkitGetUserMedia']) {
		var video = $("video").show().get(0);
		navigator.webkitGetUserMedia("video",
			function(stream) {
				console.log("Using WebRTC");
				usingWebRTC = true;
				video.src = window.webkitURL.createObjectURL(stream);
				// We get 352x288 video back (at least on the MacBook Pro webcam) so to work with existing code,
				// (which assumes 320x240), scale the video to fit 320x240
				setTimeout(function() {
					var scaleX = (320/240) / (video.videoWidth/video.videoHeight);
					$(video).css("-webkit-transform", "scaleX("+scaleX+")");
				}, 1);
			},
			function(error) {
				console.log("Unable to get video stream");
				embedFlash();
			});
	} else {
		embedFlash();
	}

	$("#camera_button").click(function() {
		capture();
	});

	$(".small_cube").click(function() {
		scanFace(parseInt($(this).attr("id").charAt(1), 10));
	});

	$("#done .startover").click(function() {
		reset();
	});

	init();
});

$(document).keydown(function(evt) {
	if (evt.keyCode == 32) {
		// space bar
		if (spaceDown) {
			// Don't allow repeats
			return;
		}
		spaceDown = true;
		if ($("#omt").is(":visible")) {
			reset();
			showInput2();
			return false;
		}
		if (solutionSteps == null || solutionSteps.length == 0) {
			capture();
		} else {
			step++;
			showCurrentSolutionStep();
		}
		return false;
	} else if (evt.keyCode == 79 && evt.shiftKey) {
		omt();
		return false;
	}
});

$(document).keyup(function(evt) {
	if (evt.keyCode == 32) {
		spaceDown = false;
	}
});
