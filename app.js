
/**
 * Module dependencies.
 */

var express = require('express');
var app = express();
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var mysql = require('mysql');			//mysql 연동
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);
var client = mysql.createConnection({	//host컴퓨터인 자신의 컴퓨터 연결
	hostname:"127.0.0.1:3306",
	user:"root",
	password:"kswsuu7113",
	database:"darack"
});

client.connect(function(err){
	console.log('MySQLConnect');
	if(err){
		console.error('MySQL Connection Error');
		console.error(err);
		throw err;
	}
});

var sessionStore = new MySQLStore({
	hostname:"localhost",
	port:"3306",
	user:"root",
	password:"kswsuu7113",
	database:"darack"
});

app.use(session({
	secret:'secret',
	resave:false,
	savdUninitialized:true,
	store:sessionStore
}));

// all environments
app.set('port', process.env.PORT || 3006);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));



// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', function(req, res){
	if(req.session.user_id){
		res.redirect('/main');
	}
	else
		res.render('index.html');
});

app.get('/sign_up', function(req, res){
   res.render('sign_up.html');
});

app.get('/main', function(req, res){
	var n = 1;
	if(!req.session.user_id){
		res.redirect('/');
	}
	else{
		var query = client.query('SELECT user_nick, b_no, b_title, b_date, b_count FROM user join board on user.user_id = board.user_id ORDER BY b_no DESC LIMIT ?, 10',[(n-1)*10], function(err, rows){
			if(err)	console.error('err', err);
			var rows1=rows;
			var query = client.query('SELECT count(*) cnt FROM user join board on user.user_id = board.user_id ORDER BY b_no DESC', function(err, rows){
				if(err)	console.error('err', err);
				res.render('main',{
					id:rows1[0].user_nick,
					rows:rows1,
					rows2length:rows[0].cnt
				});
			});
		});
	}
});
app.get('/main:number', function(req, res){

	var n=req.params.number;
	if(!req.session.user_id){
		res.redirect('/');
	}
	else{
		var query = client.query('SELECT user_nick, b_no, b_title, b_date, b_count FROM user join board on user.user_id = board.user_id ORDER BY b_no DESC LIMIT ?, 10',[(n-1)*10], function(err, rows){
			if(err)	console.error('err', err);
			var rows1=rows;
			var query = client.query('SELECT count(*) cnt FROM user join board on user.user_id = board.user_id ORDER BY b_no DESC', function(err, rows){
				if(err)	console.error('err', err);
				res.render('main',{
					id:rows1[0].user_nick,
					rows:rows1,
					rows2length:rows[0].cnt
				});
			});
		});
	}
});

app.get('/write', function(req, res){
	var query = client.query('SELECT user_nick FROM user WHERE user_id = ?',[req.session.user_id], function(err, rows){
		if(err)	console.error('err', err);
		res.render('write',{
			id:rows[0].user_nick,
		});
	});
});

//로그인
app.post('/logincheck',function(req, res){
	var uid = req.body.id;
	var upw = req.body.password;
	var query = client.query('SELECT count(*) cnt, user_id, user_nick FROM user WHERE user_email=? and user_pw=?',[uid,upw],function(err, rows){
	   if(err)	console.error('err', err);
	   var cnt = rows[0].cnt;
	   if(cnt === 1){
	 	  //req.session.user_id=uid;
		  req.session.user_id=rows[0].user_id;
		  console.log(rows[0].user_id+" ");
	 	  res.send('<script> alert("'+rows[0].user_nick+', welcome!!");location.href="/main"</script>');
	   }else{ 
	 	  res.send('<script> alert("id or password is wrong");history.back();</script>');
	   }
	});
});
//로그아웃
app.get('/logout', function(req, res){
	delete req.session.user_id;
	res.redirect("/");
})
//회원가입
app.post('/signupCheck', function(req, res){
	var uid=req.body.id;
	var upw=req.body.pw;
	var upwCheck=req.body.confirm;
	var uname=req.body.name;
	var unick=req.body.nick;
	var ubirth=req.body.birth;
	var uphone=req.body.phone;
	var insertCheck=false;
	
	if(upw != upwCheck){
		res.send('<script> alert("Check password!");history.back(); </script>');
		console.log("check password");
	}
	else if(req.body.check != 1){
		res.send('<script> alert("Need check!");history.back(); </script>');
	}
	else {
		var query1 = client.query('SELECT count(*) cnt FROM user WHERE user_email=?',[uid],function(err, rows){	//같은 아이디가 있다면 실행
			if(err)	console.error('err', err);
			var cnt = rows[0].cnt;
			if(cnt == 1){
				//req.session.user_id=uid;
				res.send('<script> alert ("use another id");history.back(); </script>');
				console.log("id is already exist");
			}
			else{
				var query2 = client.query('INSERT INTO user(user_email, user_pw, user_name, user_nick, user_birth, user_phone) VALUE (?, ?, ?, ?, ?, ?)',[uid,upw,uname,unick,ubirth,uphone],function(err, rows){
					if(err)	console.error('err', err);
					else{
						console.log("new user inserted");	//닉네임 보이게 출력
						res.send('<script> alert ("congraturation sign up! please login!"); location.href="/"</script>');
						
						
					}
				});
			}
		});
	}
});
//글 올리기
app.post('/writeCheck', function(req, res){
	var title=req.body.title;
	var contents=req.body.contents;
	var category=req.body.category;
	var user_id=req.session.user_id;
	var date = new Date();
	var query = client.query('INSERT INTO board(b_title, b_contents, user_id, b_count, b_date) VALUE (?,?,?,0,?)', [title, contents, user_id, date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate()], function(err, rows){
		if(err) console.error('err', err);
		else{
			console.log(user_id+"new post!");
			res.redirect('/main');
		}
	});
});
//게시글 내용 보기
app.get('/writeView:number', function(req, res){
	var bNo=req.params.number;
	var query1 = client.query('SELECT user_nick FROM user WHERE user_id = ?',[req.session.user_id], function(err, rows){
		if(err)	console.error('err', err);
		var nick = rows[0].user_nick;
		var query2 = client.query('SELECT user.user_id, user_nick, b_no, b_title, b_contents, b_date, b_count FROM user join board ON user.user_id = board.user_id AND b_no = ?', [bNo], function(err, rows){
			if(err) console.err('err', err);
			var query3 = client.query('UPDATE board SET b_count = ? WHERE b_no = ?', [rows[0].b_count+1, bNo], function(err,rows){
				if(err) condole.err('err', err);
			});
			res.render('writeView.ejs',{
				id:nick,
				rows:rows,
			});
		});
	});
});
//게시글 수정하러 넘어가기
app.post('/editPage', function(req, res){
	var user_id=req.body.user_id;
	var b_no=req.body.b_no;
	if(user_id==req.session.user_id){
		var query = client.query('SELECT b_no, b_title, b_contents FROM board WHERE b_no = ?', [b_no*1], function(err, rows){
			if(err) console('err', err);
			else{
				res.render('editPage', {
					rows:rows
				});
			}
		});
	}
	else{
		res.send('<script>alert("you dont have permission for edit");history.back();</script>')
	}
});
//수정하기
app.post('/edit', function(req, res){
	var title = req.body.title;
	var contents = req.body.contents;
	var b_no = req.body.bno;
	var query = client.query('UPDATE board SET b_title=?, b_contents=? WHERE b_no = ?', [title, contents, b_no*1], function(err, rows){
		if(err) console.log('err', err);
		else
			res.redirect('writeView'+b_no);
	});
});
//게시글 삭제하기
app.post('/remove', function(req, res){
	var user_id=req.body.uid;
	var b_no=req.body.bno;
	console.log(b_no*1);
	if(user_id == req.session.user_id){
		var query = client.query('DELETE FROM board WHERE b_no = ?', [b_no*1], function(err, rows){
			if(err) console.log('err',err);
			else
				res.send('<script>alert("you successfully remove");location.href="/main";</script>');
		});
		
	}
	else{
		res.send('<script>alert("you dont have permission for remove");history.back();</script>');
	}
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
