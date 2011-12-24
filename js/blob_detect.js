var BLOB_MAX_BLACK = 30;	// maximum intensity of sobel-ized pixel to count as "black" (non edge)
var NO_CONFIDENCE = 1000;


function blobDetect(id) {
	var blobs = [];
	var img = document.getElementById(id).getContext("2d").getImageData(0, 0, 320, 240);
	for (var y=0; y < 240; y += 10) {
		for (var x=0; x < 320; x += 10) {
			var blob = getBlob(x, y, img);
			if (blob != null) {
				// Put it in the array if it's not already there
				var found = false;
				for (var i=0; i < blobs.length; i++) {
					if (blob.isEqual(blobs[i])) {
						found = true;
						break;
					}
				}
				if (!found) {
					blobs.push(blob);
				}
			}
		}
	}
	if (logging) console.log("Found " + blobs.length + " total blobs");
	var square = [];
	for (var i=0; i < blobs.length; i++) {
		if (blobs[i].isSquare()) {
			square.push(blobs[i]);
		} else {
			blobs[i].draw("#0000ff");	// not square (blue)
		}
	}
	if (logging) console.log("Found " + square.length + " square blobs");

	// Sort by size (smallest to biggest)
	square.sort(function(a, b) {
		var areaA = a.width * a.height;
		var areaB = b.width * b.height;
		if (areaA < areaB) {
			return -1;
		} else if (areaA > areaB) {
			return 1;
		}
		return 0;
	});

	// Label each square blob (for debugging)
	for (var i=0; i < square.length; i++) {
		square[i].setLabel(i);
	}

	// Put blobs of similar size and proximity into groups
	var sizeGroups = [];
	var lastSize = 0;
	var currentGroup;
	_.each(square, function(blob) {
		var currentEdgeLength = blob.avgEdgeLength();
		if (currentEdgeLength > 10) {	// ignore blobs smaller than 10x10
			if (currentEdgeLength > lastSize * 1.1) {
				// At least 10% bigger than the previous - start a new group
				if (currentGroup != null) {
					sizeGroups.push(currentGroup);
				}
				currentGroup = [blob];
			} else {
				currentGroup.push(blob);
			}
			lastSize = currentEdgeLength;
		}
	});
	// Make sure last group is added to sizeGroups
	if (currentGroup != null) {
		sizeGroups.push(currentGroup);
	}

	// For groups with 9+ blobs, figure out which is the best match
	var gridGroups = {};	// key is confidence value based on "grid-like" position, value is array of 9 blobs
	_.each(sizeGroups, function(group) {
		pruneGroup(group);
		if (group.length >= 9) {
			var candidateGroups = [];
			// If the group has 15 or more blobs, split into sub-groups to limit combinatorial explosions
			if (group.length >= 15) {
				// For each member of the group, create a sub-group containing only blobs that could share a grid
				_.each(group, function(srcBlob) {
					var candidateGroup = [srcBlob];
					_.each(group, function(otherBlob) {
						if (srcBlob != otherBlob && srcBlob.couldBeInSameGrid(otherBlob)) {
							candidateGroup.push(otherBlob);
						}
					});
					if (candidateGroup.length >= 9) {
						candidateGroups.push(candidateGroup);
					}
				});
			} else {
				candidateGroups.push(group);
			}

			_.each(candidateGroups, function(candidateGroup) {
				// analyze all combinations of 9 within the group
				var comb = combinations(candidateGroup, 9);
				_.each(comb, function(candidate) {
					var score = cubeGridConfidence(candidate);
					if (score < NO_CONFIDENCE) {
						gridGroups[score] = candidate;
					}
				});
			});
		}
	});

	var lowest = NO_CONFIDENCE;
	var winners = [];
	_.each(gridGroups, function(grid, score) {
		if (score < lowest) {
			winners = grid;
			lowest = score;
		}
	});

	// Draw out the color-coded blobs
	_.each(square, function(blob) {
		if (_.contains(winners, blob)) {
			blob.draw("#ff0000");	// winner (red)
			//blob.drawLabel();
		} else {
			blob.draw("#00ff00");	// loser (green)
			//blob.drawLabel();
		}
	});

	return winners;
}


// Removes any blobs that are not within 3 diagonals from at least 9 other blobs, or do not have at least
// 2 blobs in the same row and 2 blobs in the same column
function pruneGroup(group) {
	if (group.length < 9) {
		// Need at least 9 in a group
		group = [];
		return;
	}
	var avgEdgeLength = 0;
	_.each(group, function(blob) {
		avgEdgeLength += blob.avgEdgeLength();
	});
	avgEdgeLength /= group.length;
	var minDistance = Math.sqrt(2 * Math.pow(avgEdgeLength*3, 2));
	var numClose = 0;
	var onSameRow = 0;
	var onSameCol = 0;
	for (var i=0; i < group.length; i++) {
		var source = group[i];
		for (var j=0; j < group.length; j++) {
			var consider = group[j];
		    if (consider != source) {
				if (source.getDistance(consider) < minDistance) {
					if (source.isSameRow(consider)) {
						onSameRow++;
					}
					if (source.isSameColumn(consider)) {
						onSameCol++;
					}
				}
			}
		}
		if (onSameRow < 2 || onSameCol < 2) {
			group.splice(i, 1);
			i--;
		}
	}
}

/**
 * The lower the value returned, the higher the confidence
 */
function cubeGridConfidence(blobs) {
	var myblobs = _.clone(blobs);
	// Group by rows
	var rows = [];
	while (myblobs.length > 0) {
		var row = [];
		var src = myblobs.shift();
		row.push(src);
		for (var i=0; i < myblobs.length; i++) {
			if (src.isSameRow(myblobs[i])) {
				row.push(myblobs[i]);
				myblobs.splice(i, 1);
				i--;
			}
		}
		// If the row does not have three blobs, it's not a good row
		if (row.length == 3) {
			rows.push(row);
		}
	}
	// Should have 3 rows
	if (rows.length != 3) {
		return NO_CONFIDENCE;
	}
	// Sort rows from top to bottom
	rows.sort(function(a,b) {
		var avgA = a[0].y + a[1].y + a[2].y;
		var avgB = b[0].y + b[1].y + b[2].y;
		if (avgA < avgB) {
			return -1;
		} else if (avgA > avgB) {
			return 1;
		}
		return 0;
	});
	// Sort blobs in each row by x value
	for (var i=0; i < 3; i++) {
		rows[i].sort(function(a,b) {
			if (a.x < b.x) {
				return -1;
			} else if (a.x > b.x) {
				return 1;
			}
			return 0;
		});
	}
	// Verify that blobs in each row align in columns
	for (var i=1; i < 3; i++) {
		if (!rows[0][0].isSameColumn(rows[i][0]) ||
			!rows[0][1].isSameColumn(rows[i][1]) ||
			!rows[0][2].isSameColumn(rows[i][2])) {
			return NO_CONFIDENCE;
		}
	}
	// Ensure rows and columns aren't spaced too far from each other
	var edgeLength = 0;
	_.each(blobs, function(blob) {
		edgeLength += blob.avgEdgeLength();
	});
	edgeLength /= 9;
	for (var y=0; y < 2; y++) {
		for (var x=0; x < 3; x++) {
			var distance = rows[y][x].getDistance(rows[y+1][x]);
			if (distance > edgeLength * 2) {
				return NO_CONFIDENCE;
			}
		}
	}
	// Now that we've verified they're in a 3x3 grid with acceptable spacing, calculate how close it is to a
	// perfect grid by adding the standard deviations of all of their x and y values for each row and column
	var total = 0;
	total += stddev([rows[0][0].y, rows[0][1].y, rows[0][2].y]);	// row 0
	total += stddev([rows[1][0].y, rows[1][1].y, rows[1][2].y]);	// row 1
	total += stddev([rows[2][0].y, rows[2][1].y, rows[2][2].y]);	// row 2
	total += stddev([rows[0][0].x, rows[1][0].x, rows[2][0].x]);	// col 0
	total += stddev([rows[0][1].x, rows[1][1].x, rows[2][1].x]);	// col 1
	total += stddev([rows[0][2].x, rows[1][2].x, rows[2][2].x]);	// col 2
	return total;
}



function getBlob(startX, startY, img) {
	var lastBlob = getRoughBlob(startX, startY, img);
	if (lastBlob == null) {
		return null;
	}
	for (var i=0; i < 3; i++) {
		var newBlob = getRoughBlob(lastBlob.x, lastBlob.y, img);
		if (newBlob == null) {
			return null;
		}
		if (newBlob.getDistance(lastBlob) < 3) {
			return newBlob;
		}
		lastBlob = newBlob;
	}
	return null;
}

/**
 * Returns null if the sample point is not black, or blob info if it is black
 */
function getRoughBlob(startX, startY, img) {
	var src = img.data;
	var sw = img.width;
	var sh = img.height;
	// Make sure we're starting on black
	if (src[offset(startX, startY, sw)] > BLOB_MAX_BLACK) {
		return null;
	}
	for (var minX = startX; minX > 0; minX--) {
		if (src[offset(minX, startY, sw)] > BLOB_MAX_BLACK) {
			break;
		}
	}
	for (var maxX = startX; maxX < sw; maxX++) {
		if (src[offset(maxX, startY, sw)] > BLOB_MAX_BLACK) {
			break;
		}
	}
	for (var minY = startY; minY > 0; minY--) {
		if (src[offset(startX, minY, sw)] > BLOB_MAX_BLACK) {
			break;
		}
	}
	for (var maxY = startY; maxY < sh; maxY++) {
		if (src[offset(startX, maxY, sw)] > BLOB_MAX_BLACK) {
			break;
		}
	}
	//console.log(minX, maxX, minY, maxY);
	return new Blob(Math.round((minX+maxX)/2), Math.round((minY+maxY)/2), maxX - minX, maxY - minY);

}

function offset(x, y, imgWidth) {
	return (y * imgWidth + x) * 4;
}

function blobGroupDimensions(group) {
	var minX = 1000, maxX = 0, minY = 1000, maxY = 0;
	_.each(group, function(blob) {
		var blobMinX = blob.x - blob.width/2;
		var blobMaxX = blob.x + blob.width/2;
		var blobMinY = blob.y - blob.height/2;
		var blobMaxY = blob.y + blob.height/2;
		if (blobMinX < minX) minX = blobMinX;
		if (blobMaxX > maxX) maxX = blobMaxX;
		if (blobMinY < minY) minY = blobMinY;
		if (blobMaxY > maxY) maxY = blobMaxY;
	});
	return {
		x: Math.round(minX),
		y: Math.round(minY),
		width: Math.round(maxX - minX),
		height: Math.round(maxY - minY)
	}
}