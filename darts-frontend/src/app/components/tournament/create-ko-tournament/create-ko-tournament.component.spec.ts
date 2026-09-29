import { TestBed } from '@angular/core/testing';
import { FormControlName } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { Team } from '../../../models/team.model';
import { Tournament } from '../../../models/tournament.models';
import { OverviewTabService } from '../../../services/overview-tab.service';
import { TeamService } from '../../../services/team.service';
import { TournamentService } from '../../../services/tournament.service';
import { CreateKoTournamentComponent } from './create-ko-tournament.component';

describe('CreateKoTournamentComponent', () => {
  const teams: Team[] = [
    { _id: 'one', name: 'The Arrows', players: ['Alice'] },
    { _id: 'two', name: 'Bullseyes', players: ['Bob'] },
  ];

  let tournamentService: jasmine.SpyObj<TournamentService>;

  beforeEach(async () => {
    tournamentService = jasmine.createSpyObj<TournamentService>(
      'TournamentService',
      ['createKo'],
    );
    tournamentService.createKo.and.returnValue(of({} as Tournament));

    await TestBed.configureTestingModule({
      imports: [CreateKoTournamentComponent],
      providers: [
        {
          provide: TeamService,
          useValue: { findAll: () => of(teams) },
        },
        { provide: TournamentService, useValue: tournamentService },
        { provide: Router, useValue: { navigate: jasmine.createSpy() } },
        OverviewTabService,
      ],
    }).compileComponents();
  });

  it('binds semifinal inputs to the rebuilt slots and submits selected teams', () => {
    const fixture = TestBed.createComponent(CreateKoTournamentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.startRoundControl.setValue('semifinal');
    fixture.detectChanges();

    const slotInputs = fixture.debugElement.queryAll(
      By.css('.bracket-grid input[formControlName]'),
    );
    expect(slotInputs.length).toBe(4);

    const slotDirectives = slotInputs.map((input) =>
      input.injector.get(FormControlName),
    );
    slotDirectives.forEach((directive, index) => {
      expect(directive.control).toBe(component.initialSlots.at(index));
    });

    component.koForm.get('name')!.setValue('Summer Cup');
    slotDirectives[0].control!.setValue(teams[0]);
    expect(component.initialSlots.hasError('insufficientTeams')).toBeTrue();

    slotDirectives[1].control!.setValue(teams[0]);
    expect(component.initialSlots.hasError('duplicateTeams')).toBeTrue();

    slotDirectives[1].control!.setValue(teams[1]);
    fixture.detectChanges();

    expect(component.initialSlots.hasError('insufficientTeams')).toBeFalse();
    expect(component.initialSlots.hasError('duplicateTeams')).toBeFalse();
    expect(component.koForm.valid).toBeTrue();

    component.onSubmit();

    expect(tournamentService.createKo).toHaveBeenCalledWith(
      jasmine.objectContaining({
        startRound: 'semifinal',
        initialSlots: ['one', 'two', null, null],
      }),
    );
  });
});
