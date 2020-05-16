var mysql = require('mysql2');
var express = require('express');
var app = express();
var session = require('express-session');
var bodyParser = require('body-parser');
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
		conn.query('SELECT * FROM settasks', function(error, results) {
			if (results.length > 0) {
				req.session.settasks = results;
			}
			res.render('index', {
				username: req.session.username,
				idaccount: req.session.idaccount,
				settasks: req.session.settasks
			});
		});
		
	} else {
		// res.send('Please login to view this page!');
		res.render('login');
	}
	
});
app.get('/exit', (req, res)=>{
	req.session.destroy();
	res.redirect('/');
});
app.get('/st-*', (req, res)=>{
	if (req.session.loggedin) {
		var id = req.url.slice(4, req.url.length);
		conn.query('SELECT * FROM tasks WHERE id_settask = ?', [id], function(error, results, fields) {
			if (results != null) {
				
				req.session.tasks = results;
				res.render('settask', {
					username: req.session.username,
					idaccount: req.session.idaccount,
					settask_id: id,
					settasks: req.session.settasks,
					tasks: req.session.tasks
				});
			}
			else{
				res.redirect('index');
			}
			
		});
		
	} else {
		// res.send('Please login to view this page!');
		res.render('login');
	}
});
app.get('/task-*', (req, res)=>{
	if (req.session.loggedin) {
		var id = req.url.slice(6, req.url.length);
		conn.query('SELECT * FROM tasks WHERE id = ? LIMIT 1', [id], function(error, results, fields) {
			if (results != null) {
				
				req.session.task = results;
				res.render('task', {
					username: req.session.username,
					idaccount: req.session.idaccount,
					task: req.session.task,
					tasks: req.session.tasks
				});
			}
			else{
				res.redirect('index');
			}
			
		});
		
	} else {
		res.render('login');
	}
});
app.post('/task', function(request, response) {
	if (request.session.loggedin) {
		var task_id = request.body.task_idx;
		conn.query('SELECT * FROM tasks WHERE id = ? LIMIT 1', [task_id], function(error, results, fields) {
			if (results.length > 0) {
				request.session.task = results;
				response.render('task', {
					username: request.session.username,
					idaccount: request.session.idaccount,
					task: request.session.task,
					tasks: request.session.tasks
				});
			} else {
				// response.send('Incorrect Username and/or Password!');
				res.redirect('index');
			}			
			response.end();
		});
	} else {
		// res.send('Please login to view this page!');
		response.redirect('/index');
	}
});
// app.post('/exit', function(req, res){
// 	req.session.destroy();
// 	res.redirect('/');
// });
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



const { exec } = require("child_process");

exec("py scripts/test_py.py < input.txt",{timeout: 3000}, (error, stdout, stderr) => {
    if (error) {
        console.log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
    console.log(stdout);
    if (stdout=='5') {
        console.log("Тест пройден");
    } else{
        console.log("Тест не пройден");
    }
});