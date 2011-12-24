/**
 * Optimized single-pass sobel operator (edge detection) using kernel approximation formula defined at:
 * http://homepages.inf.ed.ac.uk/rbf/HIPR2/sobel.htm
 * Also performs grayscale conversion on our source using average RGB values as opposed to perceptual weighted RGB values.
 */
function fastSobel(canvas, width, height) {
	var ctx = canvas.getContext("2d");
	var ro = width * 4;	// row offset: # bytes per row
	var dst = fastSobelTmpCtx.createImageData(width, height);
	var src = ctx.getImageData(0, 0, width, height);
	for (var y=1; y < height-1; y++) {
		for (var x=1; x < width-1; x++) {
			var p1off = (y-1) * ro + (x-1) * 4;
			var p1 = src.data[p1off] + src.data[p1off+1] + src.data[p1off+2];
			var p2off = (y-1) * ro + (x  ) * 4;
			var p2 = src.data[p2off] + src.data[p2off+1] + src.data[p2off+2];
			var p3off = (y-1) * ro + (x+1) * 4;
			var p3 = src.data[p3off] + src.data[p3off+1] + src.data[p3off+2];
			var p4off = (y  ) * ro + (x-1) * 4;
			var p4 = src.data[p4off] + src.data[p4off+1] + src.data[p4off+2];
			var p5off = (y  ) * ro + (x  ) * 4;
			var p5 = src.data[p5off] + src.data[p5off+1] + src.data[p5off+2];
			var p6off = (y  ) * ro + (x+1) * 4;
			var p6 = src.data[p6off] + src.data[p6off+1] + src.data[p6off+2];
			var p7off = (y+1) * ro + (x-1) * 4;
			var p7 = src.data[p7off] + src.data[p7off+1] + src.data[p7off+2];
			var p8off = (y+1) * ro + (x  ) * 4;
			var p8 = src.data[p8off] + src.data[p8off+1] + src.data[p8off+2];
			var p9off = (y+1) * ro + (x+1) * 4;
			var p9 = src.data[p9off] + src.data[p9off+1] + src.data[p9off+2];
			var g = (Math.abs((p1+2*p2+p3)-(p7+2*p8+p9))+Math.abs((p3+2*p6+p9)-(p1+2*p4+p7))) / 3;
			dst.data[y*ro + x*4] = g;
			dst.data[y*ro + x*4 + 1] = g;
			dst.data[y*ro + x*4 + 2] = g;
			dst.data[y*ro + x*4 + 3] = 255;
		}
	}
	ctx.putImageData(dst, 0, 0);
}

// Used to get a temporary ImageData to use as a destination buffer for the sobel operator
fastSobelTmpCtx = document.createElement('canvas').getContext('2d');
