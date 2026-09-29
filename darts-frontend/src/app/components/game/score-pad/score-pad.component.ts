import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-score-pad',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './score-pad.component.html',
  styleUrl: './score-pad.component.scss',
})
export class ScorePadComponent {
  @Input() isClickable = true;

  @Output() throwRecorded = new EventEmitter<number>();

  protected readonly rows = [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15],
    [16, 17, 18, 19, 20],
  ];

  protected multiplier: 1 | 2 | 3 = 1;

  protected selectMultiplier(value: 2 | 3): void {
    if (!this.isClickable) return;
    this.multiplier = this.multiplier === value ? 1 : value;
  }

  protected isScoreDisabled(baseValue: number): boolean {
    if (!this.isClickable) return true;
    return (
      (baseValue === 0 && this.multiplier > 1) ||
      (baseValue === 25 && this.multiplier === 3)
    );
  }

  protected displayedValue(baseValue: number): number {
    if (baseValue === 0) return 0;

    if (baseValue === 25) {
      const bullMultiplier = this.multiplier === 1 ? 1 : 2;
      return 25 * bullMultiplier;
    }

    return baseValue * this.multiplier;
  }

  protected shouldShowProjectedValue(baseValue: number): boolean {
    if (this.multiplier === 1 || this.isScoreDisabled(baseValue)) return false;
    return this.displayedValue(baseValue) !== baseValue;
  }

  protected pickScore(baseValue: number): void {
    if (this.isScoreDisabled(baseValue)) return;
    this.throwRecorded.emit(this.displayedValue(baseValue));
    this.multiplier = 1;
  }
}
