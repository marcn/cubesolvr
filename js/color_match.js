var LEFT_EDGE_X = 55;
var TOP_EDGE_Y = 15;
var CUBIE_SIZE = 70;

var FACE_TO_HEX = {
	"F": "#fe9722",	// orange
	"L": "#2161b2",	// blue
	"B": "#f0282b",	// red
	"R": "#08a140", // green
	"U": "#ffffff",	// white
	"D": "#e9db00",	// yellow
	" ": "#acb5bc"	// empty
};


function colorScan(size, log, snapShotSelector, sampleSelector, matchSelector, graphSelector) {
	var blobs = [];
	for (var y = 0; y < 3; y++) {
		for (var x = 0; x < 3; x++) {
			var xpos = CUBIE_SIZE * x + LEFT_EDGE_X + (CUBIE_SIZE / 2) - (size / 2);
			var ypos = CUBIE_SIZE * y + TOP_EDGE_Y + (CUBIE_SIZE / 2) - (size / 2);
			blobs.push(new Blob(xpos, ypos, CUBIE_SIZE, CUBIE_SIZE));
		}
	}
	return colorScanBlobs(blobs, log, snapShotSelector, sampleSelector, matchSelector, graphSelector);
}

function colorScanBlobs(blobs, log, snapShotSelector, sampleSelector, matchSelector, graphSelector) {
	var graphContext = null;
	if (graphSelector) {
		graphContext = $(graphSelector).get(0).getContext("2d");
	}

	var result = "";
	var svh = [];
	var maxSat = 0;
	var context = $(snapShotSelector).get(0).getContext("2d");
	var i = 0;
	blobs.sort(Blob.sortFunction);
	_.each(blobs, function(blob) {
		var size = blob.width / 2;	// sample size is half of blob size
		var xpos = blob.x - (size / 2);
		var ypos = blob.y - (size / 2);
		var hsv = computeHsv(xpos, ypos, size, context);
		var hue = hsv[0];
		var sat = hsv[1];
		var val = hsv[2];
		var cssColor = hsvToCss(hsv);
		if (log) {
			console.log(hsv, cssColor);
		}
		// Update sampled color in sample selector div
		if (sampleSelector) {
			$("div", sampleSelector).eq(i).removeClass("color_grey").css("background-color", cssColor);
		}

		// Mark solid squares in sample area of snapshot canvas
		context.fillStyle = cssColor;
		context.fillRect(xpos, ypos, size, size);
		context.fillStyle = "black";
		context.strokeRect(xpos, ypos, size, size);

		svh.push([sat, hue, cssColor]);
		maxSat = Math.max(maxSat, hsv[1]);

		// Guess at matching color
		var match = "";
		if (sat < 35 || (sat < 50 && hue > 100 && hue < 288 && val > 50)) {
			match = "U";		// white
		} else {
			if (hue > 355 || (hue >= 0 && hue <= 30)) {
				match = "F";	// orange
			} else if (hue > 30 && hue <= 87) {
				match = "D";	// yellow
			} else if (hue > 87 && hue <= 200) {
				match = "R";	// green
			} else if (hue > 200 && hue <= 288) {
				match = "L";	// blue
			} else if (hue > 288 && hue <= 355) {
				match = "B";	// red
			}
		}
		if (matchSelector) {
			$("div", matchSelector).eq(i).removeClass("U F D R L B color_grey").addClass(match);
		}
		result += match;
		i++;
	});
	// saturation vs. hue graph
	if (graphContext) {
		if ($("#cleargraph").is(":checked")) {
			graphContext.fillStyle = "#cccccc";
			graphContext.fillRect(0, 0, 110, 370);
		}
		while (svh.length > 0) {
			var sv = svh.pop();
			graphContext.beginPath();
			graphContext.fillStyle = sv[2];
			graphContext.arc(((sv[0] / maxSat * 100)) + 5, 360 - sv[1] + 5, 5, 0, Math.PI + (Math.PI * 3) / 2, false);
			graphContext.fill();
			graphContext.fillStyle = "black";
			graphContext.stroke();
		}
	}
	return result;
}

/**
 * Compute the average HSV value for a square centered at the given coordinates
 * @param x
 * @param y
 * @param size
 * @param context
 */
function computeHsv(x, y, size, context) {
	var image = context.getImageData(0, 0, 320, 240);
	var xmin = Math.floor(x) - Math.floor(size / 2);
	var xmax = Math.floor(x) + Math.floor(size / 2);
	var ymin = Math.floor(y) - Math.floor(size / 2);
	var ymax = Math.floor(y) + Math.floor(size / 2);
	var rsum = 0, gsum = 0, bsum = 0, total = 0;
	for (var xx = xmin; xx < xmax; xx++) {
		for (var yy = ymin; yy < ymax; yy++) {
			total++;
			rsum += image.data[((yy * (image.width * 4)) + (xx * 4)) + 0];
			gsum += image.data[((yy * (image.width * 4)) + (xx * 4)) + 1];
			bsum += image.data[((yy * (image.width * 4)) + (xx * 4)) + 2];
		}
	}
	return RGB2HSV(rsum / total, gsum / total, bsum / total);
}


function hsvToCss(hsv) {
	var rgb = HSV2RGB(hsv[0], hsv[1], hsv[2]);
	return "rgb(" + Math.round(rgb[0]) + "," + Math.round(rgb[1]) + "," + Math.round(rgb[2]) + ")";
}

function RGB2HSV(r, g, b) {
	r = r / 255;
	g = g / 255;
	b = b / 255;
	var minVal = Math.min(r, g, b);
	var maxVal = Math.max(r, g, b);
	var delta = maxVal - minVal;

	var v = maxVal;
	var h;
	var s;

	if (delta == 0) {
		h = 0;
		s = 0;
	} else {
		s = delta / maxVal;
		var del_R = (((maxVal - r) / 6) + (delta / 2)) / delta;
		var del_G = (((maxVal - g) / 6) + (delta / 2)) / delta;
		var del_B = (((maxVal - b) / 6) + (delta / 2)) / delta;

		if (r == maxVal) {
			h = del_B - del_G;
		}
		else if (g == maxVal) {
			h = (1 / 3) + del_R - del_B;
		}
		else if (b == maxVal) {
			h = (2 / 3) + del_G - del_R;
		}

		if (h < 0) {
			h += 1;
		}
		if (h > 1) {
			h -= 1;
		}
	}
	h *= 360;
	s *= 100;
	v *= 100;

	return [h, s, v];
}


function HSV2RGB(h, s, v) {
	h = h / 360;
	s = s / 100;
	v = v / 100;
	var r, g, b = 0;
	if (s == 0) {
		r = v * 255;
		g = v * 255;
		b = v * 255;
	} else {
		var_h = h * 6;
		var_i = Math.floor(var_h);
		var_1 = v * (1 - s);
		var_2 = v * (1 - s * (var_h - var_i));
		var_3 = v * (1 - s * (1 - (var_h - var_i)));

		if (var_i == 0) {
			var_r = v;
			var_g = var_3;
			var_b = var_1
		}
		else if (var_i == 1) {
			var_r = var_2;
			var_g = v;
			var_b = var_1
		}
		else if (var_i == 2) {
			var_r = var_1;
			var_g = v;
			var_b = var_3
		}
		else if (var_i == 3) {
			var_r = var_1;
			var_g = var_2;
			var_b = v
		}
		else if (var_i == 4) {
			var_r = var_3;
			var_g = var_1;
			var_b = v
		}
		else {
			var_r = v;
			var_g = var_1;
			var_b = var_2
		}
		;

		r = var_r * 255;
		g = var_g * 255;
		b = var_b * 255;
	}
	return [r, g, b];
}
