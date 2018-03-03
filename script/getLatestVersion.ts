import { get } from 'https';
import { format, parse } from 'url';

export interface Package {
  name: string;
  publishConfig?: PublishConfig;
}

export interface PublishConfig {
  registry?: string;
}

export default async function getLatestVersion(pkg: Package): Promise<string> {
  let url = parse(pkg.publishConfig && pkg.publishConfig.registry || 'https://registry.npmjs.com/');
  url.pathname = `/${pkg.name}`;

  return new Promise((resolve, reject) => {
    get(format(url), response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => body += chunk);
      response.on('end', () => {
        if (response.statusCode !== 200) {
          reject(new Error(`unable to get latest version (code=${response.statusCode}): ${body}`));
        }

        let packageInfo = JSON.parse(body);
        resolve(packageInfo['dist-tags']['latest']);
      });
    }).on('error', reject);
  });
}
