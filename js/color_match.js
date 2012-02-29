
var FACE_ORDER = "FLBRUD";	// color agnostic face notation (front, left, etc.)

var FACE_TO_HEX = {
	"F": "#fe9722",	// orange
	"L": "#2161b2",	// blue
	"B": "#f0282b",	// red
	"R": "#08a140", // green
	"U": "#ffffff",	// white
	"D": "#e9db00",	// yellow
	" ": "#acb5bc"	// empty
};

// Used for translating color name to an RGB array
var COLOR_TO_RGB = {
	"orange": [254, 151, 34],
	"blue":   [33, 97, 178],
	"red":    [240, 40, 43],
	"green":  [8, 161, 64],
	"white":  [255, 255, 255],
	"yellow": [233, 219, 0]
};

/**
 * Calculate the distance between two RGB values.  If the RGB for the test color is deemed to be
 * washed out, additional distance is added to the result because it will not provide reliable results.
 * @param test array of [r, g, b]
 * @param base array of [r, g, b]
 */
function distanceBetween(test, base) {
	var dist = Math.sqrt(
		(test[0]-base[0]) * (test[0]-base[0]) +
		(test[1]-base[1]) * (test[1]-base[1]) +
		(test[2]-base[2]) * (test[2]-base[2]));
	if (test[0] > 245 && test[1] > 245 && test[2] > 245) {
		dist += 300;
	}
	return dist
}

/**
 * Return array of RGB values for each blob as sampled from it's center region
 */
function getBlobColors(blobs, snapShotSelector, sampleSelector, graphSelector) {
	var graphContext = null;
	if (graphSelector) {
		graphContext = $(graphSelector).get(0).getContext("2d");
	}

	var results = [];
	var svh = [];
	var maxSat = 0;
	var context = $(snapShotSelector).get(0).getContext("2d");
	var i = 0;
	blobs.sort(Blob.sortFunction);
	_.each(blobs, function(blob) {
		var size = blob.width / 2;	// sample size is half of blob size
		var xpos = blob.x - (size / 2);
		var ypos = blob.y - (size / 2);
		var rgb = computeRGB(xpos, ypos, size, context);
		results.push(rgb);
		var hsv = RGB2HSV(rgb);
		var cssColor = rgbToCss(rgb);
		// Update sampled color in sample selector div
		if (sampleSelector) {
			$("div", sampleSelector).eq(i).removeClass("color_grey").css("background-color", cssColor);
		}
		// Mark solid squares in sample area of snapshot canvas
		context.fillStyle = cssColor;
		context.fillRect(xpos, ypos, size, size);
		context.fillStyle = "black";
		context.strokeRect(xpos, ypos, size, size);

		svh.push([hsv[1], hsv[0], cssColor]);
		maxSat = Math.max(maxSat, hsv[1]);
		i++;
	});

	// saturation vs. hue graph
	if (graphContext) {
		if ($("#cleargraph").is(":checked")) {
			graphContext.fillStyle = "#cccccc";
			graphContext.fillRect(0, 0, 220, 370);
		}
		while (svh.length > 0) {
			var sv = svh.pop();
			graphContext.beginPath();
			graphContext.fillStyle = sv[2];
			graphContext.arc(((sv[0] / maxSat * 200)) + 5, 360 - sv[1] + 5, 5, 0, Math.PI + (Math.PI * 3) / 2, false);
			graphContext.fill();
			graphContext.fillStyle = "black";
			graphContext.stroke();
		}
	}

	return results;
}

/**
 * Using proximity of each cubie's color to the (known) center colors, determine it's actual color
 */
function matchColors(scanned) {
	var results = [];
	for (var f=0; f < 6; f++) {
		var face = scanned[f];
		var faceColors = "";
		for (var i=0; i < 9; i++) {
			var closestDistance = 1000;
			var closestColor = "";
			if (i != 4) {
				for (var j=0; j < 6; j++) {
					var dist = distanceBetween(face[i], scanned[j][4]);
					if (dist < closestDistance) {
						closestDistance = dist;
						closestColor = FACE_ORDER.charAt(j);
					}
				}
			} else {
				closestColor = FACE_ORDER.charAt(f);
			}
			faceColors += closestColor;
		}
		results.push(faceColors);
	}
	return results;
}


/**
 * Compute the average RGB value for a square centered at the given coordinates
 * @param x
 * @param y
 * @param size
 * @param context
 */
function computeRGB(x, y, size, context) {
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
	return [rsum / total, gsum / total, bsum / total];
}


function rgbToCss(rgb) {
	return "rgb(" + Math.round(rgb[0]) + "," + Math.round(rgb[1]) + "," + Math.round(rgb[2]) + ")";
}

function RGB2HSV(rgb) {
	r = rgb[0] / 255;
	g = rgb[1] / 255;
	b = rgb[2] / 255;
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
