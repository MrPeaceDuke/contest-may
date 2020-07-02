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


var storage = multer.diskStorage({
	destination: function (req, file, cb) {
	  cb(null, 'uploads/')
	},
	filename: function (req, file, cb) {
	  cb(null, file.originalname)
	}
});


var upload = multer({ storage : storage });

app.post("/checkfile", upload.single("filedata"), function(req, res,) {
	console.log(req.file)
	console.log("CheckFile");
	conn.query('SELECT a.id_answer, a.input, a.output, t.max_time, t.max_memory FROM answers a ,tasks t WHERE a.id_task=? and a.id_task=t.id ',req.body.task_id, function(error, results) {
		if(error) console.log(error);
		else {
			console.log(req.body );
			output = results;
			console.log(output);
			console.log(req.body);
			chechResult = CheckCode("file",req.body.langId, req.file.originalname, output,res,req.body.task_id, req.body.user_id);
		}
	});
});

app.post("/checktext", upload.none(), function(req, res,) {
	console.log("CheckText");
	conn.query('SELECT a.id_answer, a.input, a.output, t.max_time, t.max_memory FROM answers a ,tasks t WHERE a.id_task=? and a.id_task=t.id ',req.body.task_id, function(error, results) {
		if(error) console.log(error);
		else {
			console.log(req.body );
			output = results;
			console.log(output);
			console.log(req.body);
			chechResult = CheckCode("text",req.body.langId, req.body.codeText, output,res, req.body.task_id, req.body.user_id);
		}
	});
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
			console.log(req.session.idaccount+" | "+ids);
			conn.query('SELECT * FROM user_attempts WHERE id_user='+req.session.idaccount+' and id_task='+ids, function(error, results) {
			
				if (results.length > 0) {
					req.session.attempts = results;
				}
				console.log(req.session.attempts);
				res.render('contest-page', {
					username: req.session.username,
					contestid: ids,
					idaccount: req.session.idaccount,
					tasks: req.session.tasks,
					attempts: req.session.attempts
				});
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


function CheckCode(checkType, codeType, code, answers, res, id_task, id_user){
	const  { c , cpp , node , python , java }  =  require ( 'compile-run' ) ;
	var i = 0;
	var max = answers.length;

	var execCommand = "";
	var codeResult=true;

	switch(codeType) {
		case '1':
			var execCommand = node;
			break;
		case '2':
			var execCommand = python;
			break;
		case '3':
			var execCommand = c;
			break;
		case '4':
			var execCommand = cpp;
			break;
		case '5':
			var execCommand = java;
			break;

	}
	run();	

	function run() {

		if (checkType=="file") {
			let resultPromise = execCommand.runFile("scripts/"+code, { stdin: answers[i].input, timeout: answers[i].max_time},(err, result) => {
				if(err){
					console.log(err);
				}
				else{
					if ((result.stderr == '') && (result.errorType == "run-time")) {
						var dateTime = new Date();
						dateTime = dateTime.getFullYear() + "-" + (dateTime.getMonth() + 1) + "-" + dateTime.getDate() + " " + dateTime.getHours() + ":" + dateTime.getMinutes() + ":" + dateTime.getSeconds();
						SetAttempt(id_task, id_user, dateTime,code, "Тест N"+(i+1)+" Time Limit" );
						res.send(dateTime+","+code+","+"Тест N"+(i+1)+" Time Limit");
						return;

					}
					if (result.errorType == "compile-time") {
						var dateTime = new Date();
						dateTime = dateTime.getFullYear() + "-" + (dateTime.getMonth() + 1) + "-" + dateTime.getDate() + " " + dateTime.getHours() + ":" + dateTime.getMinutes() + ":" + dateTime.getSeconds();
						SetAttempt(id_task, id_user, dateTime,code, "Тест N"+(i+1)+" Compilation Error" );
						res.send(dateTime+","+code+","+"Тест N"+(i+1)+" Compilation Error");
						return;
					}
					if (result.errorType == "run-time") {
						var dateTime = new Date();
						dateTime = dateTime.getFullYear() + "-" + (dateTime.getMonth() + 1) + "-" + dateTime.getDate() + " " + dateTime.getHours() + ":" + dateTime.getMinutes() + ":" + dateTime.getSeconds();
						SetAttempt(id_task, id_user, dateTime,code, "Тест N"+(i+1)+" Runtime Error" );
						res.send(dateTime+","+code+","+"Тест N"+(i+1)+" Runtime Error");
						return;
					}
					if (result.stdout!=answers[i].output+"\r\n")  {
						var dateTime = new Date();
						dateTime = dateTime.getFullYear() + "-" + (dateTime.getMonth() + 1) + "-" + dateTime.getDate() + " " + dateTime.getHours() + ":" + dateTime.getMinutes() + ":" + dateTime.getSeconds();
						SetAttempt(id_task, id_user, dateTime,code, "Тест N"+(i+1)+" Wrong Answer" );
						res.send(dateTime+","+code+","+"Тест N"+(i+1)+" Wrong Answer");
						return;
					}
					if (result.memoryUsage / 1024 >= answers[i].max_memory) {
						var dateTime = new Date();
						dateTime = dateTime.getFullYear() + "-" + (dateTime.getMonth() + 1) + "-" + dateTime.getDate() + " " + dateTime.getHours() + ":" + dateTime.getMinutes() + ":" + dateTime.getSeconds();
						SetAttempt(id_task, id_user, dateTime,code, "Тест N"+(i+1)+" Memory Limit" );
						res.send(dateTime+","+code+","+"Тест N"+(i+1)+" Memory Limit");
						return;
					}
					if (i+1!=max) {
						i++;
						run();
					}  else {
						var dateTime = new Date();
						dateTime = dateTime.getFullYear() + "-" + (dateTime.getMonth() + 1) + "-" + dateTime.getDate() + " " + dateTime.getHours() + ":" + dateTime.getMinutes() + ":" + dateTime.getSeconds();
						SetAttempt(id_task, id_user, dateTime,code, "+" );
						res.send(dateTime+","+code+","+"+");
						return;
					}
				}
			});
		} else {
			let resultPromise = execCommand.runSource(code, { stdin: answers[i].input, timeout: answers[i].max_time},(err, result) => {
				if(err){
					console.log(err);
				}
				else{
					if ((result.stderr == '') && (result.errorType == "run-time")) {
						var dateTime = new Date();
						dateTime = dateTime.getFullYear() + "-" + (dateTime.getMonth() + 1) + "-" + dateTime.getDate() + " " + dateTime.getHours() + ":" + dateTime.getMinutes() + ":" + dateTime.getSeconds();
						SetAttempt(id_task, id_user, dateTime,code, "Тест N"+(i+1)+" Time Limit" );
						res.send(dateTime+","+code+","+"Тест N"+(i+1)+" Time Limit");
						return;

					}
					if (result.errorType == "compile-time") {
						var dateTime = new Date();
						dateTime = dateTime.getFullYear() + "-" + (dateTime.getMonth() + 1) + "-" + dateTime.getDate() + " " + dateTime.getHours() + ":" + dateTime.getMinutes() + ":" + dateTime.getSeconds();
						SetAttempt(id_task, id_user, dateTime,code, "Тест N"+(i+1)+" Compilation Error" );
						res.send(dateTime+","+code+","+"Тест N"+(i+1)+" Compilation Error");
						return;
					}
					if (result.errorType == "run-time") {
						var dateTime = new Date();
						dateTime = dateTime.getFullYear() + "-" + (dateTime.getMonth() + 1) + "-" + dateTime.getDate() + " " + dateTime.getHours() + ":" + dateTime.getMinutes() + ":" + dateTime.getSeconds();
						SetAttempt(id_task, id_user, dateTime,code, "Тест N"+(i+1)+" Runtime Error" );
						res.send(dateTime+","+code+","+"Тест N"+(i+1)+" Runtime Error");
						return;
					}
					if (result.stdout!=answers[i].output+"\r\n")  {
						var dateTime = new Date();
						dateTime = dateTime.getFullYear() + "-" + (dateTime.getMonth() + 1) + "-" + dateTime.getDate() + " " + dateTime.getHours() + ":" + dateTime.getMinutes() + ":" + dateTime.getSeconds();
						SetAttempt(id_task, id_user, dateTime,code, "Тест N"+(i+1)+" Wrong Answer" );
						res.send(dateTime+","+code+","+"Тест N"+(i+1)+" Wrong Answer");
						return;
					}
					if (result.memoryUsage / 1024 >= answers[i].max_memory) {
						var dateTime = new Date();
						dateTime = dateTime.getFullYear() + "-" + (dateTime.getMonth() + 1) + "-" + dateTime.getDate() + " " + dateTime.getHours() + ":" + dateTime.getMinutes() + ":" + dateTime.getSeconds();
						SetAttempt(id_task, id_user, dateTime,code, "Тест N"+(i+1)+" Memory Limit" );
						res.send(dateTime+","+code+","+"Тест N"+(i+1)+" Memory Limit");
						return;
					}
					if (i+1!=max) {
						i++;
						run();
					}  else {
						var dateTime = new Date();
						dateTime = dateTime.getFullYear() + "-" + (dateTime.getMonth() + 1) + "-" + dateTime.getDate() + " " + dateTime.getHours() + ":" + dateTime.getMinutes() + ":" + dateTime.getSeconds();
						SetAttempt(id_task, id_user, dateTime,code, "+" );
						res.send(dateTime+","+code+","+"+");
						return;
					}
				}
			});
		}
	}
}

function SetAttempt(id_task, id_user, date, code, res){
	console.log(id_task, id_user, date, code, res);
	conn.query('INSERT INTO `user_attempts`(`id_task`, `id_user`, `result`, `code`, `date`) VALUES (?,?,?,?,?)',[id_task, id_user, res, code, date], function(error, results) {
		if(error) console.log(error);
	});
}

