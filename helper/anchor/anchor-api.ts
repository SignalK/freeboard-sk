// **** Signal K Standard ALARMS notifier ****
import { Request, Response } from 'express';
import { FreeboardHelperApp } from '../index';
import { fetch, post } from '../lib/fetch';
import { ActionResult } from '../lib/types';

let server: FreeboardHelperApp;

let hostPath!: string;
const apiBasePath = '/signalk/v2/api/vessels/self/navigation/anchor';

const anchorPlugin = {
  has: false,
  enabled: false,
  version: ''
};
let pluginPath!: string;
const msgPluginNotFound = 'signalk-anchor-alarm is not installed!';

export const initAnchorApi = async (app: FreeboardHelperApp) => {
  server = app;
  server.debug(`** initAnchorApi() **`);

  // detect signalk-anchor-alarm plugin
  anchorPlugin.has = true;
  

  try {
    let port = 3000;
    if (typeof server.config?.getExternalPort === 'function') {
      server.debug('*** getExternalPort()', server.config.getExternalPort());
      port = server.config.getExternalPort();
    }
    hostPath = `${server.config.ssl ? 'https' : 'http'}://localhost:${port}`;

    // temp patch for detection issue
    pluginPath = `/plugins/anchoralarm`;
    anchorPlugin.enabled = true;
    /*
    const url = `${hostPath}/plugins`;
    const r: Array<{ id: string }> = await fetch(url);
    r.forEach(
      (plugin: { id: string; version: string; data: { enabled: boolean } }) => {
        if (plugin.id === 'anchoralarm') {
          pluginPath = `/plugins/${plugin.id}`;
          anchorPlugin.has = true;
          anchorPlugin.version = plugin.version;
          anchorPlugin.enabled = plugin.data.enabled;
        }
      }
    );*/
  } catch (e) {
    anchorPlugin.has = false;
  }
  
  server.debug('*** Anchor Alarm Plugin detected:', anchorPlugin.has);
  server.debug('*** Anchor Alarm Plugin enabled:', anchorPlugin.enabled);
  server.debug('*** Anchor Alarm Plugin API Path', `${hostPath}${pluginPath}`);

  if (anchorPlugin.has) {
    initApiEndpoints();
  }
};

const initApiEndpoints = () => {
  server.debug(`** Registering Anchor API endpoint(s) **`);

  server.post(`${apiBasePath}/drop`, async (req: Request, res: Response) => {
    server.debug(`** POST ${apiBasePath}/drop`);
    if (!anchorPlugin.has) {
      res.status(400).json({
        state: 'COMPLETED',
        statusCode: 400,
        message: msgPluginNotFound
      });
      return;
    }
    try {
      const r: ActionResult = await post(
        `${hostPath}${pluginPath}/dropAnchor`,
        '{}'
      );
      res.status(r.statusCode).json(r);
    } catch (e) {
      // fix plugin returned 401 error code when no position is available
      if (e.statusCode === 401 && e.message.indexOf('no position') !== -1) {
        e.statusCode = 400;
      }
      res.status(e.statusCode).json(e);
    }
  });

  server.post(`${apiBasePath}/raise`, async (req: Request, res: Response) => {
    server.debug(`** POST ${apiBasePath}/raise`);
    if (!anchorPlugin.has) {
      res.status(400).json({
        state: 'COMPLETED',
        statusCode: 400,
        message: msgPluginNotFound
      });
      return;
    }
    try {
      const r: ActionResult = await post(
        `${hostPath}${pluginPath}/raiseAnchor`,
        '{}'
      );
      res.status(r.statusCode).json(r);
    } catch (e) {
      res.status(e.statusCode).json(e);
    }
  });

  server.post(`${apiBasePath}/radius`, async (req: Request, res: Response) => {
    server.debug(`** POST ${apiBasePath}/radius`);
    if (!anchorPlugin.has) {
      res.status(400).json({
        state: 'COMPLETED',
        statusCode: 400,
        message: msgPluginNotFound
      });
      return;
    }
    try {
      const val =
        req.body.value && typeof req.body.value === 'number'
          ? { radius: req.body.value }
          : {};

      const r: ActionResult = await post(
        `${hostPath}${pluginPath}/setRadius`,
        JSON.stringify(val)
      );
      res.status(r.statusCode).json(r);
    } catch (e) {
      res.status(e.statusCode).json(e);
    }
  });
};
