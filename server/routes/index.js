const _ = require('lodash');
const router = require('express').Router;
const middlewares = require('auth0-extension-express-tools').middlewares;

const config = require('../lib/config');
const htmlRoute = require('./html');

module.exports = (storage) => {
  const app = router();
  const authenticateAdmins = middlewares.authenticateAdmins({
    credentialsRequired: true,
    secret: config('EXTENSION_SECRET'),
    audience: 'urn:logs-to-google-cloud',
    baseUrl: config('PUBLIC_WT_URL') || config('WT_URL'),
    onLoginSuccess: (req, res, next) => next()
  });

  const managementApi = middlewares.managementApiClient({
    domain: config('AUTH0_DOMAIN'),
    clientId: config('AUTH0_CLIENT_ID'),
    clientSecret: config('AUTH0_CLIENT_SECRET'),
  });

  app.get('/', managementApi, htmlRoute());

  app.get('/api/report', authenticateAdmins, (req, res, next) =>
    storage.read()
      .then((data) => {
        const allLogs = (data && data.logs) ? _.sortByOrder(data.logs, 'start', 'desc') : [];
        const logs = (req.query.filter && req.query.filter === 'errors') ? _.filter(allLogs, log => !!log.error) : allLogs;
        const page = (req.query.page && parseInt(req.query.page)) ? parseInt(req.query.page) - 1 : 0;
        const perPage = (req.query.per_page && parseInt(req.query.per_page)) || 10;
        const offset = perPage * page;

        return res.json({ logs: logs.slice(offset, offset + perPage), total: logs.length });
      })
      .catch(next));

  return app;
};
