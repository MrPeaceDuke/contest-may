var mysql = require('mysql2');
var express = require('express');
var app = express();
var session = require('express-session');
var bodyParser = require('body-parser');
var multer  = require("multer");
var fs = require('fs');
var port = process.env.PORT || 3000;


app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

const server = require('http').Server(app);
const io = require('socket.io')(server);

server.listen(port);

const conn = mysql.createConnection({
	database: "soft0018",
	host: "pgsha.ru",
	port: 35006,
	user: "soft0018",
	password: "d14qGle5"
});
conn.connect(function(err){
	if (err) {
			return console.error("Ошибка: " + err.message);
	}
	else{
			console.log("Подключение к серверу MySQL успешно установлено");
	}
});
// conn.end(function(err) {
// 	if (err) {
// 			return console.log("Ошибка: " + err.message);
// 	}
// 	console.log("Подключение закрыто");
// });
//--------------

var storage = multer.diskStorage({
	destination: function (req, file, cb) {
	  cb(null, 'uploads/')
	},
	filename: function (req, file, cb) {
	  cb(null, file.originalname)
	}
  });


  var upload = multer({ storage : storage });

  app.post("/check", upload.array("filedata", 1), function(req, res,) {

	let output = [];
	console.log("+1");

	conn.query('SELECT a.id_answer, a.output, t.max_time, t.max_memory FROM answers a ,tasks t WHERE a.id_task=? and a.id_task=t.id ',req.body.task_id, function(error, results) {
		if(error) console.log(error);
		else {
			output = results;
			console.log(output);
			console.log(req.body);
			chechResult = CheckCode(req.body.langId, req.files[0].originalname, output);
			console.log(chechResult);
		}
		
	});
	

	



	console.log(req.output);
	



	
	console.log(req.body.task_id);
	console.log(req.files);
    res.send(null);
});

app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');//
app.set('views', './views');//указание директории с доступными страницами
app.get('/', (req, res)=>{
	if (req.session.loggedin) {
		res.redirect('index');
	}
	else res.render('login');
});
app.get('/index', (req, res)=>{
	if (req.session.loggedin) {
		conn.query('SELECT * FROM tasks', function(error, results) {
			
			if (results.length > 0) {
				req.session.tasks = results;
			}
			res.render('index', {
				username: req.session.username,
				idaccount: req.session.idaccount,
				tasks: req.session.tasks
			});
		});
		
	} else {
		// res.send('Please login to view this page!');
		res.render('login');
	}
	
});
app.get('/contest-page/:ids', (req, res)=>{
	var ids = req.params.ids;
	if (req.session.loggedin) {
		conn.query('SELECT * FROM tasks', function(error, results) {
			
			if (results.length > 0) {
				req.session.tasks = results;
			}
			res.render('contest-page', {
				username: req.session.username,
				contestid: ids,
				idaccount: req.session.idaccount,
				tasks: req.session.tasks
			});
		});
		
	} else {
		// res.send('Please login to view this page!');
		res.render('login');
	}
	
});
app.post('/exit', function(req, res){
	req.session.destroy();
	res.redirect('/');
});
app.post('/auth', function(request, response) {
	var username = request.body.username;
	var password = request.body.password;
	if (username && password) {
		conn.query('SELECT * FROM accounts WHERE username = ? AND password = ? LIMIT 1', [username, password], function(error, results, fields) {
			if (results.length > 0) {
				// console.log(results);
				// console.log(results[0].id);
				request.session.loggedin = true;
				request.session.username = username;
				request.session.idaccount = results[0].id;
				response.redirect('index');
			} else {
				// response.send('Incorrect Username and/or Password!');
				res.render('login');
			}			
			response.end();
		});
	} else {
		response.send('Please enter Username and Password!');
		response.end();
	}
});


io.on('connection', function(socket) {
	console.log('client add');
	socket.on('txt', data => {
		console.log(data);
	});
});


function CheckCode(codeType, codeFile, answers){
	let pidusage = require('pidusage');
	var execCommand = "";
	switch(codeType) {
		case '1':
			execCommand = "node";
			break;
		case '2':
			execCommand = "python";
			break;

	}
	codeResult=true;

	for (var i=0; i<answers.length; i++){
		
		trueAnswer = answers[i].output+"\n";
		inputFile="inputs\\" + answers[i].id_answer +".txt";
		

		

		const child_process = require("child_process");

		try {
			console.log(execCommand + " ./uploads/" + codeFile+ " < " + inputFile);
			codeAnswer = child_process.execSync("perl timeout -t 2 perl -e 'while ($i<100000000) {$i++;}'",{timeout: 3000, shell: '/bin/bash'}).toString();
			pidusage(codeAnswer.pid, function (err, stats) {

				console.log(stats);
				
			});
			console.log(codeAnswer);
			if (codeAnswer!=trueAnswer) {
				codeResult=false;
				return ("Тест №"+ i+1 +" Wrong Answer");
			} 
		  
		  } catch (err) {
		  
			console.log(err);
			switch(err.code) {
				case "ETIMEDOUTs":  
					return ("Тест №"+ i++ +" TimeLimit");
				case "ENOBUFS": 
					return ("Тест №"+ i++ +" Memory limit");
				default:
					return ("Тест №"+ i++ +" Application Error");
			}
			
			
		  
		  }


		
		


		
	};

	if (codeResult) return("OK");	
}