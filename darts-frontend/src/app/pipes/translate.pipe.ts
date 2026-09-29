import { Pipe, PipeTransform } from '@angular/core';

import { I18nService } from '../services/i18n.service';

@Pipe({
  name: 't',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  constructor(private readonly i18nService: I18nService) {}

  transform(key: string, params?: Record<string, string | number>): string {
    return this.i18nService.t(key, params);
  }
}
