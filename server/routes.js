var app = require('./server');
var sendEmail = require('../senders/email');

var kue = require('kue');
var url = require('url');
var redis = require('kue/lib/redis');

var kueOptions = {};

if (process.env.REDISTOGO_URL) {
  var redisUrl = url.parse(process.env.REDISTOGO_URL);
  kueOptions.redis = {
    port: parseInt(redisUrl.port),
    host: redisUrl.hostname,
  };
  if (redisUrl.auth) {
    kueOptions.redis.auth = redisUrl.auth.split(':')[1];
  }
}

var queue = kue.createQueue(kueOptions);

queue.on('job enqueue', function(id, type) {
  console.log('Job %s got queued of type %s', id, type);
}).on('job complete', function(id, result) {
  kue.Job.get(id, function(err, job) {
    if (err) return;
    job.remove(function(err) {
      if (err) throw err;
      console.log('removed completed job #%d', job.id);
    });
  });
});

app.post('/email', function(req, res) {
  // console.log('REQ.BODY:', req.body);
  var email = req.body.email;
  var message = req.body.message;

  // TODO: handle timezone differences, timezone currently not sent from client
  var datetime = req.body.datetime;
  var date = new Date(datetime);

  // console.log(datetime);
  // console.log(date);
  var job = queue.create('email', {
    to: email,
    from: 'rmindrdev@gmail.com',
    message: message,
    datetime: date,
  }).save(function(err) {
    if (err) console.log(err);
  });

  // TODO: Figure out why these don't work, queue level events here and in clock.js do

  // job.on('complete', function(result) {
  //   console.log('Job completed with data ', result);

  // }).on('failed attempt', function(errorMessage, doneAttempts) {
  //   console.log('Job failed');

  // }).on('failed', function(errorMessage) {
  //   console.log('Job failed');

  // }).on('progress', function(progress, data) {
  //   console.log('\r  job #' + job.id + ' ' + progress + '% complete with data ', data);
  // });

  res.status(200).end('Awesome. Check your email!');
});
