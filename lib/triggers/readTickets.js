/* eslint no-invalid-this: 0 no-console: 0 */

'use strict';

const Q = require('q');
const zendesk = require('node-zendesk');
const { messages } = require('elasticio-node');
const odinErrorHandling = require('../odin_error_handling');

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 * @param snapshot saves the current state of integration step for the future reference
 */
function processTrigger(msg, cfg, snapshot = {}) {
  console.log(
    'Action started, cfg=%j msg=%j, snapshot=%j, env=%j',
    cfg,
    msg,
    snapshot,
    process.env,
  );

  odinErrorHandling.initialize(cfg);

  let latestSeen = snapshot.latestSeen || null;
  let tickets = [];
  // eslint-disable-next-line consistent-this
  const self = this;

  async function getTickets() {
    let token = null;
    if (cfg.oauth) {
      token = cfg.oauth.access_token;
    } else {
      token = cfg.accessToken;
    }

    try {
      const client = zendesk.createClient({
        username: 'username',
        token,
        oauth: true,
        disableGlobalState: true,
        remoteUri: `https://${cfg.subdomain}.zendesk.com/api/v2`,
        debug: true, // if you want to debug in library only mode, you'll have to include this
      });

      const promise = new Promise((resolve, reject) => {
        const query =
          'type:ticket order_by:created status:closed status:solved';

        client.search.queryAll(query, (err, req, result) => {
          if (err) {
            reject(err);
            console.log(err);
            return;
          }

          resolve(result);
        });
      });

      const returnedPromise = new Promise((resolve, reject) => {
        promise
          .then((all) => {
            const after = [];
            for (let i = 0; i < all.length; i += 1) {
              if (
                !latestSeen ||
                new Date(all[i].created_at) > new Date(latestSeen) ||
                new Date(all[i].updated_at) > new Date(latestSeen)
              ) {
                after.push(all[i]);
              }
            }

            tickets = after;

            resolve(tickets);
          })
          .catch((err) => {
            console.log(err);
            reject(err);
          });
      });

      return returnedPromise;
    } catch (e) {
      console.log(e);
      throw new Error(e);
    }
  }

  function emitData() {
    console.log(`Found ${tickets.length} new records.`);
    if (tickets.length > 0) {
      tickets.forEach((elem) => {
        if (
          latestSeen === null ||
          new Date(elem.created_at) > new Date(latestSeen)
        ) {
          latestSeen = elem.created_at;
        }
        if (new Date(elem.updated_at) > new Date(latestSeen)) {
          latestSeen = elem.updated_at;
        }

        elem.from_channel = '';
        elem.from_address = '';
        elem.from_name = '';
        elem.to_address = '';
        elem.to_name = '';
        if (elem.via && elem.via.channel) {
          elem.from_channel = elem.via.channel;

          if (
            elem.via.channel === 'email' &&
            elem.via.source &&
            elem.via.source.from &&
            elem.via.source.from.address
          ) {
            elem.from_address = elem.via.source.from.address;
          }

          if (elem.via.source && elem.via.source.from) {
            elem.from_name = elem.via.source.from.name;
          }

          if (
            elem.via.channel === 'email' &&
            elem.via.source &&
            elem.via.source.to &&
            elem.via.source.to.address
          ) {
            elem.to_address = elem.via.source.to.address;
          }

          if (elem.via.source && elem.via.source.to) {
            elem.to_name = elem.via.source.to.name;
          }
        }

        self.emit('data', messages.newMessageWithBody(elem));
      });

      if (latestSeen) {
        snapshot.latestSeen = latestSeen;
      }
      console.log(`New snapshot: ${JSON.stringify(snapshot)}`);
      self.emit('snapshot', snapshot);
    } else {
      self.emit('snapshot', snapshot);
    }
  }

  function emitError(e) {
    console.log(`ERROR: ${e}`);
    self.emit('error', e);

    odinErrorHandling.onError(e);
  }

  function emitEnd() {
    console.log('Finished execution');
    self.emit('end');
  }

  Q()
    .then(getTickets)
    .then(emitData)
    .fail(emitError)
    .done(emitEnd);
}

module.exports.process = processTrigger;
