
function Blob(centerX, centerY, width, height) {
	this.x = centerX;
	this.y = centerY;
	this.width = width;
	this.height = height;
}

Blob.prototype.isEqual = function(blob) {
	return	Math.abs(this.x - blob.x) < 10 &&
			Math.abs(this.y - blob.y) < 10 &&
			Math.abs(this.width - blob.width) < 10 &&
			Math.abs(this.height - blob.height) < 10;
};

Blob.prototype.isSquare = function() {
	var ratio = this.width / this.height;
	return ratio > 0.7 && ratio < 1.3;
};

Blob.prototype.avgEdgeLength = function() {
	return (this.width + this.height) / 2;
};

Blob.prototype.isSameRow = function(blob) {
	return Math.abs(this.y - blob.y) < this.height;
};

Blob.prototype.isSameColumn = function(blob) {
	return Math.abs(this.x - blob.x) < this.width;
};

Blob.prototype.getDistance = function(blob) {
	var x2 = (this.x - blob.x) * (this.x - blob.x);
	var y2 = (this.y - blob.y) * (this.y - blob.y);
	return Math.sqrt(x2 + y2);
};

/**
 * Determines if another blob could potentially be in the same face grid as the current blob.
 * (i.e. within 3 diagonals distance)
 */
Blob.prototype.couldBeInSameGrid = function(blob) {
	var minDistance = Math.sqrt(2 * Math.pow(this.avgEdgeLength()*3, 2));
	return this.getDistance(blob) < minDistance;
};

Blob.prototype.draw = function(color) {
	this.drawLine(this.x, this.y - (this.height/2), this.x, this.y + (this.height/2), color);
	this.drawLine(this.x - (this.width/2), this.y, this.x + (this.width/2), this.y, color);
};

Blob.prototype.setLabel = function(text) {
	this.text = text;
};

Blob.prototype.drawLabel = function(color) {
	if (!color) {
		color = "yellow";
	}
	overlayCtx.strokeStyle = color;
	overlayCtx.textAlign = "center";
	overlayCtx.textBaseline = "middle";
	overlayCtx.strokeText(this.text, this.x, this.y);
};

Blob.prototype.getLabel = function() {
	return this.text;
};

Blob.prototype.toString = function() {
	return "Blob["+label+"(x="+this.x+",y="+this.y+",width="+this.width+",height="+this.height+")]";
};

/**
 * Sorts a list of blobs from top to bottom, left to right
 */
Blob.sortFunction = function(a,b) {
	if (a.isSameRow(b)) {
		if (a.x < b.x) {
			return -1;
		} else if (a.x > b.x) {
			return 1;
		}
		return 0;
	} else {
		if (a.y < b.y) {
			return -1;
		} else if (a.y > b.y) {
			return 1;
		}
		return 0;
	}
};

Blob.prototype.drawLine = function(x1, y1, x2, y2, color) {
	if (window.overlayCtx != null) {
		overlayCtx.strokeStyle = color;
		overlayCtx.beginPath();
		overlayCtx.moveTo(x1, y1);
		overlayCtx.lineTo(x2, y2);
		overlayCtx.closePath();
		overlayCtx.stroke();
	}
};
