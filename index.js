var cluster = require('cluster'),
    ascii   = require('asciimo').Figlet,
    colors  = require('colors'),
    winston = require('winston'),
    args    = require('optimist').options('h', {
      "alias": 'host',
      "default": 'localhost:3000'
    }).options('p', {
      "alias": 'protocol',
      "default": 'http'
    }).options('w', {
      "alias": 'workers',
      "default": require('os').cpus().length
    }).options('port', {
      "default": 3000
    }).argv;

/*
  Logger setup
*/
var log = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)(),
    new (winston.transports.File)({ filename: './logs/console.log' })
  ]
});

ascii.write("gatekeeper", "Thick", function (art) {
  if (cluster.isMaster) {

    console.info("\n" + art.rainbow);

    var i = 0; for (i; i < args.workers; i++)
      cluster.fork();
  } else {
    /* 
      Gatekeeper Setup 
    */
    var gate    = require('./lib/core'), keeper;

    /*
      Express setup
    */
    var express = require('express'),
        redis   = require('redis'),
        query   = require('querystring'),
        utils   = require('mashape-oauth').utils,
        nuu     = require('nuuid'),
        http    = require('http'),
        https   = require('https'),
        url     = require('url');

    /*
      Setup Express & Logger
    */
    var app = express();

    /*
      Setup Redis Storage for Sessions
    */
    var RedisStore = require('connect-redis')(express);
    var RedisClient = redis.createClient();
    var RedisSession = new RedisStore({ client: RedisClient });

    // Configuration
    app.configure(function () {
      app.set('view engine', 'ejs');
      app.set('views', __dirname + '/_views');
      app.use(express.static(__dirname + '/_assets'));
      app.use(express.bodyParser());
      app.use(express.cookieParser('maeby, lets keep it a secret?'));
      app.use(express.session({ store: RedisSession, key: 'gate.keeper', secret: 'no-more-secrets' }));
    });

    app.post('/store', function (req, res) {
      var opts = {
        clientId: req.param('client_id'),
        clientSecret: req.param('client_secret'),
        consumerKey: req.param('consumer_key'),
        consumerSecret: req.param('consumer_secret'),
        grantType: req.param('grant_type'),
        state: req.param('state'),
        scope: req.param('scope'),
        baseUrl: req.param('base_url'),
        requestUrl: req.param('request_url'),
        accessUrl: req.param('access_url'),
        accessName: req.param('access_name'),
        authorizeUrl: req.param('authorize_url'),
        authorizeMethod: req.param('authorize_method'),
        signatureMethod: req.param('signature_method'),
        oauth_token: req.param('oauth_token'),
        auth: {
          type: (req.param('auth_type') || 'oauth').replace(/[^a-z]/g, ''),
          flow: (req.param('auth_flow') || '').replace(/[^a-z\_]/g, ''),
          version: isNaN(parseInt(req.param('auth_version'), 10)) ? false : parseInt(req.param('auth_version'), 10),
          leg: isNaN(parseInt(req.param('auth_leg'), 10)) ? false : parseInt(req.param('auth_leg'), 10)
        },
        callbackUrl: req.param('redirect') ? req.param('redirect') : args.p + '://' + args.h + '/callback',
        done: {
          callback: req.param('callback')
        },
        version: req.param('version')
      }, id = nuu.id(opts.consumerKey);

      // Retrieve additional pylons here -- api authentication details
      RedisClient.set(id, JSON.stringify(opts), redis.print);
      RedisClient.expire(id, 360);

      res.jsonp({ hash: id });
    });

    app.get('/hash-check', function (req, res) {
      var opts = RedisClient.get(req.param('hash'), function (err, reply) {
        if (err) return res.send(500, err.message);
        res.json(JSON.parse(reply));
      });
    });

    app.all('/start', function (req, res) {
      var opts = RedisClient.get(req.param('hash'), function (err, reply) {
        if (err) return res.send(500, err.message);
        req.session.data = JSON.parse(reply);

        if (req.param('url')) req.session.data.call_url = req.param('url');
        if (req.param('method')) req.session.data.call_method = req.param('method');
        if (req.param('body')) req.session.data.call_body = req.param('body');
        if (req.param('parameters')) req.session.data.parameters = req.param('parameters');

        keeper = gate({ req: req, res: res });
        keeper.invokeStep(1);
      });
    });

    app.get('/step/:number', function (req, res) {
      keeper = gate({ req: req, res: res });
      keeper.invokeStep(parseInt(req.params.number, 10));
    });

    app.get('/callback', function (req, res) {
      if (!req.session.data) throw new Error('MISSING_SESSION_DETAILS');

      var data = JSON.parse(JSON.stringify(req.session.data));
      var plugin = require('./plugins/' + data.auth.type.toLowerCase() + (data.auth.flow ? '_' + data.auth.flow : '') + (data.auth.version && typeof data.auth.version === 'number' ? '_' + data.auth.version : '') + (data.auth.leg && typeof data.auth.leg === 'number' ? '_' + data.auth.leg + '-legged' : '') + '.js');
      if (!plugin.step.callback) throw new Error('MISSING_CALLBACK_STEP');

      // here we grab the data previously set
      var step = req.session.data.step;

      // Verifier & Token
      var args = {};
      if (req.param('oauth_token')) args.token = req.param('oauth_token');
      if (req.param('oauth_verifier')) args.verifier = req.param('oauth_verifier');
      if (req.param('code')) args.code = req.param('code');
      if (req.param('state')) args.state = req.param('state');

      // Next?
      plugin.step.callback.next({ req: req, res: res }, args, function (response) {
        if (response) {
          if (!$this.data.done.callback || $this.data.done.callback == "oob") 
            return response.json(data);

          return response.redirect($this.data.done.callback + '?' + query.stringify(data));
        }

        if ((step + 1) > plugin.steps) 
          return res.json(500, { error: 'All steps have been completed, authentication should have happened.' });

        res.redirect('/step/' + (step + 1));
      });
    });

    app.listen(args.port);

    log.info(('Worker #' + cluster.worker.id + ' on duty!').grey);
  }

  // Listen for dying workers
  cluster.on('exit', function (worker) {
      log.warn('STAB!'.red + (' Another worker has died :( RIP Worker #' + worker.id + '!').grey);
      cluster.fork();
  });
});
