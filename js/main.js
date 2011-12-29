
var SCAN_ORDER = "FLBRUD";
var F=0, L=1, B=2, R=3, U=4, D=5;
var cubeFaces = [];
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
if (window.Audio) {
	audio = new Audio();
	if (audio.canPlayType('audio/ogg; codecs="vorbis"')) {
		audio.src = "audio/JAMZ.ogg";
	} else {
		audio.src = "audio/JAMZ.mp3";
	}
	audio.load();
}

function convertToSolverInput() {
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
		$("#webcam").get(0).capture();
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
			var scan = colorScanBlobs(blobs, true, "#snapshot");
			console.log(scan);
			cubeFaces[currentFace] = scan;
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
	drawFace(currentFace, cubeFaces[currentFace]);
	$(".subsnapshot").fadeOut(500, function() {
		$(this).remove();
	});
	scanNextUnscannedFace();
	capturing = false;
}

function drawFace(faceNum, colors) {
	var canvas = $("#f"+faceNum+" canvas").get(0);
	if (canvas && canvas.getContext) {
		var context = canvas.getContext("2d");
		context.fillStyle = "#edebee";
		context.fillRect(0, 0, canvas.width, canvas.height);
		context.fillStyle = FACE_TO_HEX[colors.charAt(0)];
		context.fillRect(1, 1, 12, 12);
		context.fillStyle = FACE_TO_HEX[colors.charAt(1)];
		context.fillRect(14, 1, 12, 12);
		context.fillStyle = FACE_TO_HEX[colors.charAt(2)];
		context.fillRect(27, 1, 12, 12);
		context.fillStyle = FACE_TO_HEX[colors.charAt(3)];
		context.fillRect(1, 14, 12, 12);
		context.fillStyle = FACE_TO_HEX[colors.charAt(4)];
		context.fillRect(14, 14, 12, 12);
		context.fillStyle = FACE_TO_HEX[colors.charAt(5)];
		context.fillRect(27, 14, 12, 12);
		context.fillStyle = FACE_TO_HEX[colors.charAt(6)];
		context.fillRect(1, 27, 12, 12);
		context.fillStyle = FACE_TO_HEX[colors.charAt(7)];
		context.fillRect(14, 27, 12, 12);
		context.fillStyle = FACE_TO_HEX[colors.charAt(8)];
		context.fillRect(27, 27, 12, 12);
	}
}

function init() {
	initSolver();
	reset();
}

function reset() {
	cubeFaces = [];
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

	for (var i=0; i < SCAN_ORDER.length; i++) {
		drawFace(i, "    " + SCAN_ORDER.charAt(i) + "    ");
	}
	scanNextUnscannedFace();

	$("body").focus();

}

function scanNextUnscannedFace() {
	currentFace = null;
	$(".small_cube").removeClass("selected");
	for (var i=0; i < 6; i++) {
		if (cubeFaces[i] == null || cubeFaces[i].length == 0) {
			scanFace(i);
			return;
		}
	}
	// All done scanning
	cube = convertToSolverInput();
	//cube = "BD LF UF FR UR UB DR BR BL UL DF DL UFR BRD URB FLD RFD DLB ULF UBL"; 	// TODO: REMOVE - TESTING!
	console.log(cube);
	var valid = validateCube(cube);
	if (valid) {
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
		var face = "";
		for (var i=-0; i < 9; i++) {
			var word = wordToFace[words[i]];
			if (word != null) {
				face += word;
			} else {
				return;
			}
		}
		cubeFaces[currentFace] = face;
		onMoveSnapshotToFaceComplete();
		//$("#input2 input").val("")
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


$(window).load(function() {

	$("body").focus();
	swfobject.embedSWF("webcam/webcam.swf", "webcam", "320", "240", "10", "swfobject/expressInstall.swf", null,
			{ allowScriptAccess: "always", wmode: "transparent" });

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
