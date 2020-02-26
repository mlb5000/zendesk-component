/*eslint no-invalid-this: 0 no-console: 0*/
'use strict';
const Zendesk = require('zendesk-node-api');
const utils = require('elasticio-node').messages;

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
function processAction(msg, cfg) {
  console.log('Action started, cfg=%j msg=%j', cfg, msg);
  var token = null;
  if (cfg.oauth) {
    token = cfg.oauth.access_token;
  } else {
    token = cfg.accessToken;
  }

  const zendesk = new Zendesk({
    url: `https://${cfg.subdomain}.zendesk.com`,
    token: token,
    oauth: true,
  });
  return zendesk.tickets.create(msg.body).then((result) => {
    if (result.error) {
      throw new Error(
        'Failed to create new ticket - ' +
          (result.error_description || JSON.stringify(result)),
      );
    }
    console.log('Have got response=%j', result);
    return utils.newMessageWithBody(result.ticket || result);
  });
}

module.exports.process = processAction;
