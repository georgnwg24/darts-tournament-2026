import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { TranslatePipe } from './pipes/translate.pipe';
import { I18nService } from './services/i18n.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor(protected readonly i18nService: I18nService) {}

  protected setLanguage(event: Event): void {
    const language = (event.target as HTMLSelectElement).value;
    if (language === 'en' || language === 'de') {
      this.i18nService.setLanguage(language);
    }
  }
}
