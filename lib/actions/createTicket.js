/*eslint no-invalid-this: 0 no-console: 0*/
'use strict';
const Zendesk = require('zendesk-node-api');

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
function processAction(msg, cfg) {
    console.log('Action started, cfg=%j msg=%j', cfg, msg);
    const zendesk = new Zendesk({
        url: `https://${cfg.subdomain}.zendesk.com`,
        oauth: cfg.access_token
    });
    return zendesk.tickets.create(msg.body).then((result) => {
        console.log('Have got response=%j', result);
        this.emit(msg);
    });
}

module.exports.process = processAction;
