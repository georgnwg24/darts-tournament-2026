import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { Team } from '../../../models/team.model';
import { OverviewTabService } from '../../../services/overview-tab.service';
import { TeamService } from '../../../services/team.service';
import { TournamentService } from '../../../services/tournament.service';
import { CreateLeagueTournamentComponent } from './create-league-tournament.component';

describe('CreateLeagueTournamentComponent', () => {
  const teams: Team[] = [
    { _id: 'one', name: 'The Arrows', players: ['Alice'] },
    { _id: 'two', name: 'Bullseyes', players: ['Bob'] },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateLeagueTournamentComponent],
      providers: [
        {
          provide: TeamService,
          useValue: { findAll: () => of(teams) },
        },
        { provide: TournamentService, useValue: {} },
        { provide: Router, useValue: { navigate: jasmine.createSpy() } },
        OverviewTabService,
      ],
    }).compileComponents();
  });

  it('enables only the applicable bulk-selection action', () => {
    const fixture = TestBed.createComponent(CreateLeagueTournamentComponent);
    fixture.detectChanges();
    const buttons = fixture.debugElement.queryAll(
      By.css('.selection-actions button'),
    );

    expect(buttons[0].nativeElement.disabled).toBeFalse();
    expect(buttons[1].nativeElement.disabled).toBeTrue();
    expect(buttons[0].nativeElement.classList).toContain('action-btn-primary');

    buttons[0].nativeElement.click();
    fixture.detectChanges();

    expect(buttons[0].nativeElement.disabled).toBeTrue();
    expect(buttons[1].nativeElement.disabled).toBeFalse();
  });
});
