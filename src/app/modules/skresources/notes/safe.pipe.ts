import { Pipe, PipeTransform } from '@angular/core';
import {
  DomSanitizer,
  SafeHtml,
  SafeStyle,
  SafeScript,
  SafeUrl,
  SafeResourceUrl
} from '@angular/platform-browser';

@Pipe({
  name: 'safe',
  standalone: true
})
export class SafePipe implements PipeTransform {
  constructor(protected sanitizer: DomSanitizer) {}

  public transform(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
    type: string
  ): SafeHtml | SafeStyle | SafeScript | SafeUrl | SafeResourceUrl {
    switch (type) {
      case 'html':
        return this.sanitizer.bypassSecurityTrustHtml(value);
      case 'style':
        return this.sanitizer.bypassSecurityTrustStyle(value);
      case 'script':
        return this.sanitizer.bypassSecurityTrustScript(value);
      case 'url':
        return this.sanitizer.bypassSecurityTrustUrl(value);
      case 'resourceUrl':
        return this.sanitizer.bypassSecurityTrustResourceUrl(value);
      default:
        throw new Error(`Invalid safe type specified: ${type}`);
    }
  }
}

@Pipe({
  name: 'addTarget',
  standalone: true
})
export class AddTargetPipe implements PipeTransform {
  constructor(protected sanitizer: DomSanitizer) {}

  public transform(value: string, target: string): string {
    if (typeof value === 'string') {
      const a = value.split('<a ');
      return a.join(`<a target="${target}" `);
    } else {
      return value;
    }
  }
}
