import * as https from 'https';
import * as url from 'url';

export const fetch = (href: string) => {
  const opt: any = url.parse(href);
  opt.headers = { 'User-Agent': 'Mozilla/5.0' };

  return new Promise((resolve, reject) => {
    https
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
