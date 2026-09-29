import { FormArray, FormControl } from '@angular/forms';
import { Team } from '../models/team.model';
import {
  filterTeams,
  minimumStringSelections,
  minimumTeamSlots,
  uniqueTeamSlots,
  validTeamSelection,
} from './team-selection.utils';

describe('team selection utilities', () => {
  const teams: Team[] = [
    { _id: 'one', name: 'The Arrows', players: ['Alice', 'Alex'] },
    { _id: 'two', name: 'Bullseyes', players: ['Bob', 'Bea'] },
  ];

  it('filters by team or player name without case sensitivity', () => {
    expect(filterTeams(teams, 'arrow')).toEqual([teams[0]]);
    expect(filterTeams(teams, 'BEA')).toEqual([teams[1]]);
  });

  it('validates selected team identities', () => {
    const validator = validTeamSelection(() => teams);

    expect(validator(new FormControl(teams[0]))).toBeNull();
    expect(validator(new FormControl('The Arrows'))).toEqual({
      invalidTeamSelection: true,
    });
  });

  it('validates minimum and unique selections', () => {
    const ids = new FormControl(['one']);
    expect(minimumStringSelections(2)(ids)).toEqual({
      insufficientTeams: true,
    });

    const slots = new FormArray([
      new FormControl<Team | null>(teams[0]),
      new FormControl<Team | null>(teams[0]),
    ]);
    expect(minimumTeamSlots(2)(slots)).toBeNull();
    expect(uniqueTeamSlots(slots)).toEqual({ duplicateTeams: true });
  });
});
