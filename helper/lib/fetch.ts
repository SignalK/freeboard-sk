import * as https from 'https';
import * as url from 'url';
import * as http from 'http';

// HTTP GET
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fetch = (href: string): Promise<any> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opt: any = url.parse(href);
  opt.headers = { 'User-Agent': 'Mozilla/5.0' };

  const req = href.indexOf('https') !== -1 ? https : http;

  return new Promise((resolve, reject) => {
    req
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .get(opt, (res: any) => {
        let data = '';
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(data.toString());
            resolve(json);
          } catch (error) {
            reject(new Error(data));
          }
        });
      })
      .on('error', (error: Error) => {
        reject(error);
      });
  });
};

// HTTP POST
export const post = (href: string, data: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opt: any = url.parse(href);
  ((opt.method = 'POST'),
    (opt.headers = {
      'Content-Type': 'application/json'
    }));

  const req = href.indexOf('https') !== -1 ? https : http;

  return new Promise((resolve, reject) => {
    const postReq = req
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .request(opt, (res: any) => {
        let resText = '';
        res.on('data', (chunk: string) => {
          resText += chunk;
        });
        res.on('end', () => {
          if (Math.floor(res.statusCode / 100) === 2) {
            resolve({
              statusCode: res.statusCode,
              state: 'COMPLETED'
            });
          } else {
            reject({
              statusCode: res.statusCode,
              state: 'FAILED',
              message: resText
            });
          }
        });
      })
      .on('error', (error: Error) => {
        reject({
          statusCode: 400,
          state: 'FAILED',
          message: error.message
        });
      });

    postReq.write(data);
    postReq.end();
  });
};
