module.exports = function (map, pixel) {
	var features = [];
	map.forEachFeatureAtPixel(pixel, function (feature, layer) {
		features.push(feature);
	});
	if (features.length > 0) {
		var info = [];
		var i, ii;
		for (i = 0, ii = features.length; i < ii; ++i) {
			info.push(features[i].get('name'));
		}
		document.getElementById('info').innerHTML = info.join(', ') || '&nbsp';
	} else {
		document.getElementById('info').innerHTML = '&nbsp;';
	}
};