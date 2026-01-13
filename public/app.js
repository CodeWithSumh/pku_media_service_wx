var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// vue dist
app.use(express.static(path.join(__dirname, '../dist')));
app.get(/.*/, function(req, res) {
  res.sendFile(path.resolve(__dirname, '../dist', 'index.html'));
});

// error handler
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.send(err.message);
});

/**
 * ★ 关键：监听云托管端口
 */
const port = process.env.PORT || 8080;

app.listen(port, '0.0.0.0', () => {
  console.log('Server listening on port', port);
});
