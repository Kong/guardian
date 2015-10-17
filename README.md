# Guardian

![][guardian-logo]


[Guardian](http://guardianjs.com/) was created with love by [nijikokun](http://github.com/nijikokun) and is maintained by [Mashape](https://github.com/Mashape), who also maintain the open-source API Gateway [Kong](https://github.com/Mashape/kong). 

##Summary

Avoid dealing with OAuth logic in your code, and spend more time creating your product. Guardian reduces the OAuth footprint in your code to a *single* request.

Built with modularity in mind, Guardian leverages plugins to handle OAuth flows, should you encounter a flow that Guardian doesn't handle, create a small flow plugin to do so and carry on. Guardian comes with **5** pre-made plugins that cover **99%** of OAuth services.

Not to mention, Guardian is perfect for **both** production *and* testing. Services like Github require you to enter a single callback url, this is fine when in production, but move to another environment and soon you'll have conflicts, require building complex services to juggle environment scenarios and more. Guardian is centralized and easily configurable to allow multiple environments giving you the flexibility you need.

## Requirements

- [Node.js](http://nodejs.org/download/)
- [Redis](http://redis.io/topics/quickstart)

## Install

1. Install [Redis](http://redis.io/topics/quickstart)
2. Globally install Guardian

   ```bash
   $ npm install -g guardian
   ```

## Usage

```bash
$ guardian
```

### Configuration

Configuration files are loaded from the current working directory of where you call Guardian. Should no configuration argument be passed `./config/default.js` is loaded.

```bash
$ guardian -c <relative configuration path>
```

**Options**

| Property                    | Default                                  | Description                                                       |
| --------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| `host`                      | `localhost:3000`                         | Public IP or Domain Name, used to generate the callback uri.      |
| `protocol`                  | `http`                                   | Host Protocol                                                     |
| `port`                      | `3000`                                   | Server Port                                                       |
| `workers`                   | `require('os').cpus().length`            | Number of forked instances of the Guardian server to run, suggested amount is CPU count. |
| `pid.dir`                   | `./`                                     | `.guardian.pid` file output directory, for production we suggest placing this under the `/home/<user>/` directory, requires trailing slash. |
| `redis.host`                | `127.0.0.1`                              | Host redis can be reached on                                      |
| `redis.port`                | `6379`                                   | Port redis is current running on                                  |
| `redis.pass`                |                                          | Redis password                                                    |
| `redis.expire`              | `60`                                     | Guardian store expiration timeout in Seconds                      |
| `cookie.secret`             |                                          | Guardian cookie secret                                            |
| `session.secret`            |                                          | Guardian session secret                                           |

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


| Key                        | Default                                  | Description                                                       |
| -------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| `client_id`                |                                          | OAuth Client Identifier                                           |
| `client_secret`            |                                          | OAuth Client Secret                                               |
| `grant_type`               |                                          | Common values (dependant on OAuth flow used): `authorization_code`, `client_credentials`, `password`, `refresh_token`, ... |
| `access_name`              | `access_token`                           | Access token name                                                 |
| `authorize_method`         | `Bearer`                                 | *Optional* - Authorization header method, some possible values: `Bearer`, `OAuth`, `Digest` |
| `state`                    |                                          | State identifier, depends on provider                             |
| `scope`                    |                                          | OAuth request scopes, depends on provider                         |

###### OAuth 1

Details specific to OAuth 1.0a

| Key                        | Default                                  | Description                                                       |
| -------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| `consumer_key`             |                                          | OAuth Consumer Identifier                                         |
| `consumer_secret`          |                                          | OAuth Consumer Secret                                             |
| `signature_method`         | `HMAC-SHA1`                              | OAuth Header encryption method, possible values: `PLAINTEXT`, `HMAC-SHA1`, `RSA-SHA1` |
| `oauth_token`              |                                          | *Optional;* OAuth Token. Used in OAuth 1.0a 1-Legged (Resource request) |

###### Plugin (*required*)

Parameters combined to create the [plugin file name](https://github.com/Mashape/guardian/blob/master/lib/core.js#L100-L118).

| Key                        | Default                                  | Description                                                       |
| -------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| `auth_type`                | `oauth`                                  | Authentication type, `a-z` characters accepted only.              |
| `auth_flow`                |                                          | *Optional;* Authentication flow, would be `echo`, `owner_resources`, etc... `a-z` characters accepted only. |
| `auth_version`             |                                          | *Optional;* Authentication version, for OAuth 2, we would use `2`, numeric only. |
| `auth_leg`                 |                                          | *Optional;* Authentication leg, for OAuth 2 (3-legged), we would use `3`, numeric only. |

For example, [`plugins/oauth_2_3-legged.js`](/plugins/oauth_2_3-legged.js) (OAuth 2, 3-legged), would look like:

```js
{
  ...
  auth_type: 'oauth',
  auth_version: 2,
  auth_leg: 3
  ...
}
```

###### General

| Key                        | Description                                                       |
| -------------------------- | ----------------------------------------------------------------- |
| `request_url`              | Authentication Request Url, e.g. `https://github.com/login/oauth/request_url` |
| `access_url`               | Authentication Access Url, e.g. `https://github.com/login/oauth/access_token` |
| `authorize_url`            | Authentication Authorization Url, e.g. `https://github.com/login/oauth/authorize` |
| `callback`                 | Authentication Callback URL on requesting server to obtain `access_token` and `access_secret`, e.g. `http://localhost:3001/callback` |

#### Example

Request:

```js
> POST https://<guardian-host>/store

{
  client_id: 'Client Identifier',
  client_secret: 'Client Secret',
  access_name: 'access_token',
  authorize_url: 'https://github.com/login/oauth/authorize',
  access_url: 'https://github.com/login/oauth/access_token',
  request_url: 'https://github.com/login/oauth/request_url',
  auth_type: "oauth",
  auth_version: 2,
  auth_leg: 3,
  callback: "http://localhost:3001/callback"
}
```

Response:

```js
< 200 OK
< Header: Content-Type=application/json

{
  hash: '<guardian session hash>',
  url: 'https://<guardian-host>/start?hash=<guardian session hash>'
}
```

### Hash Check

```http
GET /hash-check
```

Allows you to preview / verify your stored information in-case of error or malformed response.

Once again, stored information by default lasts only `10` seconds.

#### Parameters


| Key                        | Description                                                       |
| -------------------------- | ----------------------------------------------------------------- |
| `hash`                     | Guardian session hash obtained from [Storage](#storage)           |

### Start

```http
GET /start?hash=<guardian store hash>
```

Redirecting the client to this route starts the Guardian authentication steps, Each steps are done with `302` response code and should be followed.

#### Parameters

| Key                        | Description                                                       |
| -------------------------- | ----------------------------------------------------------------- |
| `hash`                     | Guardian session hash obtained from [Storage](#storage)           |

###### OAuth 1.0a

Used in the OAuth 1.0a Signature Process for 1-Legged requests. [Example](https://github.com/Mashape/guardian/blob/master/tests/factual.js#L46).


| Key                        | Description                                                       |
| -------------------------- | ----------------------------------------------------------------- |
| `url`                      | Request URL, query parameters will be parsed from here as well as parameters property. |
| `method`                   | Request Method.                                                   |
| `body`                     | Request Payload / Body. |
| `parameters`               | Request Parameters for Request Signatures or etc... |

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

## License

[MIT](/LICENSE)

--- 

[guardian-logo]: http://cl.ly/image/263j2G2x2Z1r/Image%202015-10-16%20at%207.46.53%20PM.png
