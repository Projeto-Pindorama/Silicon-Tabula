function fortune6(){
	var fortune = [
		"dixitque Deus <b>fiat lux</b> et facta est lux",
		"Sapere aude",
		"Errare humanum est, perseverare autem diabolicum",
		"Verum sine mendacio, certum et verissimum",
		"<b>Pray</b> as though everything depended on God;<br /><b>act</b> as though everything depended on you"
	];
	var randomfortune = fortune[Math.floor(Math.random() * fortune.length)];
	var chtxt = document.getElementById('fortune');
        chtxt.innerHTML = randomfortune
}
