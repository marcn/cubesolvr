
/**
 * Calculate all combinations of the given array, limiting the result to combinations of the given size
 */
function combinations(a, size) {
	var fn = function(n, src, got, all) {
		if (n == 0) {
			if (got.length > 0 && got.length == size) {
				all[all.length] = got;
			}
			return;
		}
		for (var j = 0; j < src.length; j++) {
			fn(n - 1, src.slice(j + 1), got.concat([src[j]]), all);
		}
	};
	var all = [];
	for (var i = 0; i < a.length; i++) {
		fn(i, a, [], all);
	}
	if (a.length == size) {
		all.push(a);
	}
	return all;
}


function getAverageFromNumArr( numArr ){
	var i = numArr.length,
		sum = 0;
	while( i-- ){
		sum += numArr[ i ];
	}
	return (sum / numArr.length );
}

function getVariance( numArr ){
	var avg = getAverageFromNumArr( numArr ),
		i = numArr.length,
		v = 0;

	while( i-- ){
		v += Math.pow( (numArr[ i ] - avg), 2 );
	}
	v /= numArr.length;
	return v;
}

function stddev( numArr ){
	return Math.sqrt( getVariance( numArr ) );
}
