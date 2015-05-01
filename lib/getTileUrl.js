module.exports = function (coordinate, title) {

			if (coordinate == null) {
				return "";
			}
			//console.log(coordinate);
			//Array [ 24, 106, 8388623 ]
			var z = coordinate[0];
			var x = coordinate[1];
			var y = (1 << z) - coordinate[2] - 1;
			return './mapcache/'+title+'/' + z + '/' + x + '/' + y + '.png';
		};