fetch("/files/fortune.txt")
	.then(response => response.text())
	.then(data => {
		var fortune = Array.from(data);
	});

function fortune6(){
	var randomfortune = fortune[Math.floor(Math.random() * fortune.length)];
	var chtxt = document.getElementById('fortune');
        chtxt.innerHTML = randomfortune
}
