var {Wit, log} = require('node-wit');
var request = require('request');
var cheerio = require('cheerio');
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);


/////////////////////////////////////
// DM related
/////////////////////////////////////

// Dialogue,
class CasualDialogue{
	constructor(){
		this.valid_intent = ["bye","hello","thanks"];
	}

	updateInfo(knowledge){
		if (this.valid_intent.indexOf(knowledge.intent) != -1)
			this.intent = knowledge.intent;
		this.intent = knowledge.intent;
	}

	generateAnswer(){
		return new Promise((resolve,reject)=>{
			var answer = {};
			answer.complete = true; // casual is simple, short answers
			switch(this.intent){
				case "bye": answer.text = "Ok. Bye."; break;
				case "hello": answer.text = "Hi :)"; break;
				case "thanks": answer.text = "You're welcome."; break;
			}

			if (answer.text) {
				resolve(answer);
				console.log("Answer:"+JSON.stringify(answer));	
			}

		})
	}
}


// Dialogue, slot based
class RecommendDialogue{
	constructor(){
		this.valid_intent = ["look_matching","list_matching","auto_recommend"];

	}

	updateInfo(knowledge){
		//selective update of intent
		if (this.valid_intent.indexOf(knowledge.intent) != -1)
			this.intent = knowledge.intent;
		this.gender = knowledge.gender;
		this.color = knowledge.color;
		this.clothes_type = knowledge.clothes_type;
	}


	//should return Promise
	generateAnswer(){
		// 
		return new Promise((resolve,reject)=>{
			var answer = {};
			answer.complete = false;


			//condition

			if (!this.gender){
				answer.text = "Are you looking for men's or women's clothing?";
			} else if (!this.clothes_type){
				answer.text = "What kind of clothes are you looking for?";
			} else if (!this.color){
				answer.text = "Can you specify a color?";
			} else {
				answer.complete = true; // need Promise
				var url = 'https://lookastic.com/'+this.gender+'/'+this.color+'-'+this.clothes_type;
				if (this.intent === "list_matching"){
					url +='/shop'
					answer.text = "How's this item?"
				} else if (this.intent === "look_matching") {
					url +='/looks'
					answer.text = "How about this look?"
				}

				//

			}
			if (!answer.complete){
				resolve(answer);
				console.log("Answer:"+JSON.stringify(answer));	
			} else {
				this.fetch_look_matching(url,this.intent).then((extra)=>{
					// temporary
					this.color = undefined;
					this.clothes_type = undefined;
					answer.result = extra;
					resolve(answer);
					console.log("Answer:"+JSON.stringify(answer));	
				}).catch((err)=> console.error(err));
			}

		})


	}

	fetch_look_matching(url,mode){
		return new Promise((resolve,reject)=>{
			request(url,(error,response,html)=>{
				if (!error){
					var $ = cheerio.load(html);
					var extra = {};
					if (mode === "look_matching"){
						var looks = $('.compact-look')
						var a = looks.eq(Math.floor(Math.random()*looks.length)).find('figure').find('a').eq(0);
						extra.link = a.attr('href')
						extra.img = a.children().first().attr('src');
						resolve(extra);
					}
					if (mode === "list_matching"){
						var items = $('.photos')
						var item = items.eq(Math.floor(Math.random()*items.length))
						extra.link = item.attr('href');
						extra.img = item.children().first().attr('src');

						resolve(extra);
					}
					
					reject(Error("No mode"));

				} else {
					reject(Error("could not fetch img_src"));
				}
			});
		});
	}
}

// DM

class DialogueManager{
	constructor(){
		this.knowledge = {};
		this.dialogueList = {};
		this.lastActive = "";
		this.initialize();
	}

	initialize(){
		this.dialogueList.rec_clothes = {dialogue: new RecommendDialogue(), active: false};
		this.dialogueList.casual = {dialogue: new CasualDialogue(), active: false};

	}


	updateDialogue(){
		Object.keys(this.dialogueList).forEach((key,index)=>{
			this.dialogueList[key].dialogue.updateInfo(this.knowledge);
		})

	}

	// Recieve Input and process
	processInput(wit_entities){

		var entities = wit_entities.entities;
		Object.keys(entities).forEach((key,index)=>{
		    // key: the name of the object key
		    // index: the ordinal position of the key within the object 
		    this.knowledge[key] = entities[key][0].value
		});

		if (this.knowledge.intent){
			switch(this.knowledge.intent){
				case "look_matching" : this.dialogueList.rec_clothes.active = true; break;
				case "list_matching" : this.dialogueList.rec_clothes.active = true; break;
				case "retry" : if (this.lastActive!="") this.dialogueList[this.lastActive].active = true; break;
				default: this.dialogueList.casual.active = true; break;
			}

			this.updateDialogue();
		}
		else{
			// no intent..?
		}
		

		console.log("DialogueList: "+JSON.stringify(this.dialogueList));
		console.log("Knowledge : " + JSON.stringify(this.knowledge));

	}

	// Must return result
	processOutput(){
		return new Promise((resolve,reject)=>{	
			var promises = [];
			var keyList = [];
			Object.keys(this.dialogueList).forEach((key,index)=>{
				if (this.dialogueList[key].active){
						promises.push(this.dialogueList[key].dialogue.generateAnswer());
						keyList.push(key);

				}
			});

			// answer 
			// answer.text   = string
			// answer.result = object
			// 
			Promise.all(promises).then((answers)=>{
				if (promises.length > 0){
					if (answers[0].complete){
						this.lastActive = keyList[0];
						this.dialogueList[keyList[0]].active = false;
						console.log("---------------------")
						console.log("Dialogue complete");
						console.log(this.dialogueList);
						console.log("---------------------")
						//reset intent
						this.knowledge.intent = "";
					}
					resolve(answers[0]);
				} else {
					"No answer"
					resolve({text:"I don't understand."})
				}
			}).catch((err)=>{
				console.error(err);
				reject(Error("processOuput failed"))
			})
		})
	}

}





/////////////////////////////////
// Server variables
/////////////////////////////////


//Wit.ai
const wit_client = new Wit({accessToken: ""});

var port = process.env.PORT || 8080;
app.use(express.static(__dirname + '/src'));

/////////////////////////////////
// request process
/////////////////////////////////

app.get('/', (req, res)=> {
    res.sendFile(__dirname + '/src/main.html');
});

server.listen(port, ()=>{
    console.log("WonderLand at port " + port);
});



/////////////////////////////////////
//	Socket.io
/////////////////////////////////////

io.on('connection', socket=> {
	console.log('socket ' +socket.id+' connected')
	var dm = new DialogueManager();

	socket.on('asked',(text_query)=>{
		wit_client.message(text_query,{}).then((data)=>{
			 console.log('Wit.ai Result : '+JSON.stringify(data));
			//process dialogue
			dm.processInput(data)
			dm.processOutput().then((answer)=>{
				socket.emit('answered', answer);
			}).catch(err=>console.error(err));
		}).catch(console.error);
	})
	//DC
	socket.on('disconnect',()=>{
	//send user id
		console.log('socket '+socket.id+' disconnected');
	});
});

