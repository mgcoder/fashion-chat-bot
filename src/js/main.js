//make socket accessible

var socket= io();
var form,d_box;


window.onload = ()=>{


console.log("ready")

//override submit
form = document.querySelector('form');
form.onsubmit = submitted.bind(form);

d_box = document.querySelector('#dialogue_container');
}

function submitted(event){
	event.preventDefault();
	console.log("submitted")

	textel = document.querySelector('input');
	if (textel.value != ''){
		socket.emit('asked',textel.value);
		appendUserMessage(textel.value);
	}
	else
		alert("Enter something!")
	textel.value = '';



};


/////////////////////////////////////
// Receive
/////////////////////////////////////

socket.on('answered', (answer)=>{
	console.log("received: "+JSON.stringify(answer))
	appendBotMessage(answer.text, answer.result)
})


/////////////////////////////////////
// Utility
/////////////////////////////////////
function appendUserMessage(text){

	var container = document.createElement('li');
	container.className='w3-container';

	var icon = document.createElement('i');
	icon.className='fa fa-user-circle w3-left'

	var bubble = document.createElement('div');
	bubble.className = 'w3-round-xxlarge w3-card-2 w3-padding w3-left'
	var say = document.createElement('p');
	var text = document.createTextNode(text);

	say.appendChild(text);
	bubble.appendChild(say);
	container.appendChild(icon);
	container.appendChild(bubble);

	d_box.appendChild(container);

	window.scrollTo(0,document.body.scrollHeight);
}

function appendBotMessage(text, extra){


	//extra
	if (extra){

		if (extra.link && extra.img){
			var extra_container = document.createElement('li');
			extra_container.className = 'w3-container w3-round'
			var a = document.createElement('a');
			if (extra.link.indexOf("lookastic.com") ==-1){
				a.href = "https://lookastic.com";
			}
			a.href += extra.link;
			a.target= '_blank'
			a.className='w3-right';

			var img = document.createElement('img')
			img.src=extra.img;
			img.height = 320;
			img.alt="Click here for more info.";
			img.title="Click here for more info.";


			a.appendChild(img);
			extra_container.appendChild(a);

			d_box.appendChild(extra_container);
		} 

	}

	//text
	var container = document.createElement('li');
	container.className='w3-container';

	var icon = document.createElement('i');
	icon.className='fa fa-question-circle-o w3-right'

	var bubble = document.createElement('div');
	bubble.className = 'w3-round-xxlarge w3-card-2 w3-padding w3-right'
	var say = document.createElement('p');


	var text = document.createTextNode(text);
	if (extra && Object.keys(extra).length === 0 && extra.constructor === Object)
		text.textContent = "Sorry, something went wrong! Try again!"





	say.appendChild(text);
	bubble.appendChild(say);
	container.appendChild(icon);
	container.appendChild(bubble);

	d_box.appendChild(container);

	window.scrollTo(0,document.body.scrollHeight);

}