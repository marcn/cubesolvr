var N_CUBIES = 20;
var N_EDGES = 12;
var solvedCube = "UF UR UB UL DF DR DB DL FR FL BR BL UFR URB UBL ULF DRF DFL DLB DBR" ;
var cube = solvedCube;
var solution;
var cstk; // CallstackObject

var wordToFace = {
	"orange": "F",
	"blue": "L",
	"red": "B",
	"green": "R",
	"white": "U",
	"yellow": "D"
};

function print_solution(str) {
	console.warn("print_solution", str);
	if (str != null && str.trim().length > 0) {
		onSolutionFound(str);
	}
}

function print_status(str) {
	console.warn("print_status", str);
}

function print_message(str) {
	console.warn("print_message", str);
}

function solve() {
	if (cube == solvedCube) {
		onSolutionFound("");
		return;
	}
	function solFcn(set_sol) {
		solution = set_sol;
		print_solution(set_sol);
	}

	cstk.addStep(print_solution, "");
	cstk.addStep(solvecube, [cube, 0, solFcn, print_message]);
	cstk.doSteps();
}

function startNotice() {
	print_status("Working...");
}
function endNotice() {
	print_status("Done");
}

function initSolver() {
	cstk = new CallstackObject(startNotice, endNotice);
	cstk.addStep(init_cube, cstk);
	cstk.doSteps();
}

function validateCube( cubeStr ) {
	var msg = "" ;
	var syntaxerr = 0 ;
	var i, j, cc ;
	if (cubeStr.length != solvedCube.length) {
		msg = "Cube string is the wrong length" ;
		syntaxerr = 1 ;
	}
	if (msg == "") {
		for (i=0; i < solvedCube.length; i++) {
			var c1 = solvedCube.charAt(i) ;
			var c2 = cubeStr.charAt(i) ;
			if ((c1 == ' ') != (c2 == ' ')) {
				msg = "Bad syntax" ;
				syntaxerr = 1 ;
			}
		}
	}
	if (msg == "") {
		var idchars = solvedCube.split('').sort().join('') ;
		var poschars = cubeStr.split('').sort().join('') ;
		if (idchars != poschars)
			msg = "Color count not right" ;
	}
	if (msg == "") {
		var solvedCubies = solvedCube.split(" ") ;
		var cubies = cubeStr.split(" ") ;
		var doublecid = new Array() ;
		for (i=0; i < N_CUBIES; i++)
			doublecid[i] = solvedCubies[i] + solvedCubies[i] ;
		var searchable = doublecid.join(" ") ;
		var mask = 0 ;
		var corder = new Array() ;
		var cosum = 0 ;
		var eosum = 0 ;
		for (i=0; i < N_CUBIES ; i++) {
			j = searchable.indexOf(cubies[i]) ;
			if (j < 0) {
				msg = "Bad cubie" ;
			}
			if (i < N_EDGES) {
				cc = j / 5 ;
				eosum += j % 5 ;
				mask |= (1 << cc) ;
			} else {
				cc = (j - 60) / 7 ;
				cosum += (j - 60) % 7 ;
				mask |= (1 << (cc + 12)) ;
			}
			corder[i] = cc ;
		}
		if (msg == "") {
			if (mask != 0xfffff)
				msg = "Missing cubie" ;
			else if (eosum % 2 != 0)
				msg = "Edge orientation mismatch" ;
			else if (cosum % 3 != 0)
				msg = "Corner orientation mismatch" ;
		}
		if (msg == "") {
			// check parity; quadratic
			var p = 0 ;
			for (i=0; i < N_EDGES; i++)
				for (j=0; j<i; j++)
					if (corder[j] > corder[i])
						p++ ;
			for (i=N_EDGES; i < N_CUBIES; i++)
				for (j=12; j<i; j++)
					if (corder[j] > corder[i])
						p++ ;
			if (p % 2 != 0)
				msg = "Parity error" ;
		}
	}
	if (msg == "") {
		//f.elements["solveButton"].disabled = false ;
	} else {
		//f.elements["solveButton"].disabled = true ;
	}
	print_message( msg );
	return( msg == "" );
}
