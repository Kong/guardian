# Guardian

Avoid dealing with OAuth logic in your code, and spend more time creating your product. Guardian reduces the OAuth footprint in your code to a *single* request.

Built with modularity in mind, Guardian leverages plugins to handle OAuth flows, should you encounter a flow that Guardian doesn't handle, create a small flow plugin to do so and carry on. Guardian comes with **5** pre-made plugins that cover **99%** of OAuth services.

Not to mention, Guardian is perfect for **both** production *and* testing. Services like Github require you to enter a single callback url, this is fine when in production, but move to another environment and soon you'll have conflicts, require building complex services to juggle environment scenarios and more. Guardian is centralized and easily configurable to allow multiple environments giving you the flexibility you need.

Created with love by [nijikokun](http://github.com/nijikokun) at http://mashape.com

## Requirements

- [Node.js](http://nodejs.org/download/)
- [Redis](http://redis.io/topics/quickstart)

## Install

1. Install [Redis](http://redis.io/topics/quickstart)
2. Globally install Guardian

   ```bash
   $ npm install -g guardian
   ```

## Starting

```bash
$ guardian
```

### Configuration

Configuration files are loaded from the current working directory of where you call Guardian. Should no configuration argument be passed `./config/default.js` is loaded.

```bash
$ guardian -c <relative configuration path>
```

**Options**

- `host` - *Public IP or Domain Name, used to generate the callback uri.*

  Default: `localhost:3000`
- `protocol` - *Host protocol*

  Default: `http`
- `port`- *Server port*

  Default: `3000`
- `workers` - *Number of forked instances of the Guardian server to run, suggested amount is CPU count.*

  Default: `require('os').cpus().length`
- `pid.dir` - *`.guardian.pid` file output directory, for production we suggest placing this under the `/home/<user>/` directory, requires trailing slash.*

  Default: `./`
- `redis.host`
- `redis.port`
- `redis.pass`
- `redis.expire` - *TTL in seconds for Guardian session hash*
- `cookie.secret` - *Guardian cookie secret*
- `session.secret` - *Guardian session secret*

## Routes

Guardian HTTP API for handling authentication flows.

### Storage

```http
POST /store
```

Stores information given, returns a session hash to be used later on. 
Information stored lives for `60` seconds by default, change `redis.expire` to alter timeout duration.

#### Parameters

###### OAuth 2

Details specific to OAuth2

- `client_id`
- `client_secret`
- `grant_type`
  
  Common values (heavily dependant on OAuth flow used):
  - `authorization_code`
  - `client_credentials`
  - `password`
  - `refresh_token`
  - ...
- `access_name` - *access token name, default `access_token`*
- `authorize_method` - *Optional; Authorization Header Method*
  
  Some Possible Values:
  - `Bearer` - *default*
  - `OAuth`
  - `Digest`
  - ...
- `state`
- `scope`

###### OAuth 1

Details specific to OAuth 1.0a

- `consumer_key`
- `consumer_secret`
- `signature_method`
- `oauth_token`

###### Authentication (*required*)

General information regarding authentication flow to load plugin, e.g.

- `auth_type` *a-z chars accepted only*

  Default: `oauth`
- `auth_flow` *optional; a-z_ chars accepted only*

  > This would be a specific flow, a niche if you may. Echo, Owner Resources, etc..
- `auth_version` *optional; numeric chars only*

  > What version of `auth_type` are we dealing with?
- `auth_leg` *optional; numeric chars only*

  > What leg of `auth_type` is this?

These are combined to create the [plugin file name](https://github.com/Mashape/guardian/blob/master/lib/core.js#L100-L118).

For example, `plugins/oauth_2_3-legged.js` (OAuth 2 (3-legged)), would look like:

```js
{
  auth_type: 'oauth',
  auth_version: 2,
  auth_leg: 3
}
```

###### General

- `request_url`
- `access_url`
- `authorize_url`
- `callback` *for access_token & access_secret response*

### Hash Check

```http
GET /hash-check
```

Allows you to preview / verify your stored information in-case of error or malformed response.

Once again, stored information by default lasts only `10` seconds.

#### Parameters

- `hash`

### Start

```http
GET /start?hash=<guardian store hash>
```

Begins guardian transactions and authentication steps. 
These steps are passed with a `302` request and should be followed.

#### Parameters

- `hash` - *(Guardian storage hash)*

###### OAuth 1.0a

Used in the OAuth 1.0a Signature Process for 1-Legged requests. [Example](https://github.com/Mashape/guardian/blob/master/tests/factual.js#L46).

- `url` *Calling URL, query parameters will be parsed from here as well as parameters property.*
- `method` *Calling Method*
- `body` *Calling Payload or Body*
- `parameters` *Calling Parameters for Request Signatures or etc...*

## Tests & Examples

Each test in the test folder is based on an API or feature of guardian rather than TDD or BDD based tests, we verify successful authentication and we can retrieve information while authenticated from the API using tokens Guardian provides.

In this manner the tests also serve as very good [examples](tests/) of how to use Guardian.

To run one of these test you'll need to have keys ready and run the following command:

```bash
$ node tests/<provider name>.js \
  -k {Your Consumer/Client Key/Id} \ 
  -s {Your Consumer/Client Secret} \
  -h {host, ie: localhost or domain}
```

Then visit the server running on port `3001` to start the authentication process.

You will recieve a response with the headers sent, and the returned response from the API, Guardian must be running locally on port `3000` for these examples to work correctly.
