import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { Team } from '../../../models/team.model';
import { CreateLeagueTournamentDto } from '../../../models/tournament.models';
import {
  OverviewTab,
  OverviewTabService,
} from '../../../services/overview-tab.service';
import { TeamService } from '../../../services/team.service';
import { TournamentService } from '../../../services/tournament.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { MatTooltipModule } from '@angular/material/tooltip';
import { integerValidator } from '../../../validators/integer.validator';
import { minimumStringSelections } from '../../../utils/team-selection.utils';

@Component({
  selector: 'app-create-league-tournament',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './create-league-tournament.component.html',
  styleUrl: './create-league-tournament.component.scss',
})
export class CreateLeagueTournamentComponent {
  leagueForm: FormGroup;
  teams: Team[] = [];
  isLoadingTeams = true;

  constructor(
    private fb: FormBuilder,
    private teamService: TeamService,
    private tournamentService: TournamentService,
    private router: Router,
    private overviewTabService: OverviewTabService,
  ) {
    this.leagueForm = this.fb.group(
      {
        name: ['', [Validators.required, Validators.maxLength(100)]],
        teamIds: [[], [minimumStringSelections(2)]],
        gamesPerTeam: ['', [Validators.required, Validators.min(1)]],
        legsToWin: [
          1,
          [Validators.required, Validators.min(1), integerValidator],
        ],
        roundLimit: [8, [Validators.required, Validators.min(1)]],
        scoreLimit: ['', [Validators.min(1)]],
      },
      { validators: this.feasibleLeagueValidator() },
    );
  }

  get teamIdsControl(): FormControl<string[]> {
    return this.leagueForm.get('teamIds') as FormControl<string[]>;
  }

  get areAllTeamsSelected(): boolean {
    return (
      this.teams.length > 0 &&
      this.teams.every((team) => this.isSelected(team._id))
    );
  }

  get areNoTeamsSelected(): boolean {
    return this.teamIdsControl.value.length === 0;
  }

  ngOnInit(): void {
    this.teamService.findAll().subscribe({
      next: (teams) => {
        this.teams = teams;
        this.teamIdsControl.updateValueAndValidity();
        this.leagueForm.updateValueAndValidity();
      },
      error: (err) => {
        console.error('Error loading teams:', err);
        this.isLoadingTeams = false;
      },
      complete: () => {
        this.isLoadingTeams = false;
      },
    });
  }

  navigateToCreateTeam(): void {
    this.overviewTabService.setSelectedTab(OverviewTab.Teams);
    this.router.navigate(['/teams/create']);
  }

  navigateToTournamentList(): void {
    this.overviewTabService.setSelectedTab(OverviewTab.Tournaments);
    this.router.navigate(['/']);
  }

  isSelected(teamId: string): boolean {
    return this.teamIdsControl.value.includes(teamId);
  }

  toggleTeamSelection(teamId: string, checked: boolean): void {
    const selected = new Set(this.teamIdsControl.value);
    if (checked) {
      selected.add(teamId);
    } else {
      selected.delete(teamId);
    }

    this.teamIdsControl.setValue([...selected]);
    this.teamIdsControl.markAsTouched();
    this.teamIdsControl.updateValueAndValidity();
    this.leagueForm.updateValueAndValidity();
  }

  selectAllTeams(): void {
    this.teamIdsControl.setValue(this.teams.map((team) => team._id));
    this.teamIdsControl.markAsTouched();
    this.leagueForm.updateValueAndValidity();
  }

  clearTeamSelection(): void {
    this.teamIdsControl.setValue([]);
    this.teamIdsControl.markAsTouched();
    this.leagueForm.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.leagueForm.invalid) {
      this.leagueForm.markAllAsTouched();
      return;
    }

    const value = this.leagueForm.value;
    const dto: CreateLeagueTournamentDto = {
      name: value.name,
      teamIds: value.teamIds,
      gamesPerTeam: Number(value.gamesPerTeam),
      legsToWin: Number(value.legsToWin),
      roundLimit: Number(value.roundLimit),
      ...(value.scoreLimit ? { scoreLimit: Number(value.scoreLimit) } : {}),
    };

    this.tournamentService.createLeague(dto).subscribe({
      next: () => this.navigateToTournamentList(),
      error: (err) => console.error('Error creating league tournament:', err),
    });
  }

  private feasibleLeagueValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const teamIds = (control.get('teamIds')?.value as string[]) ?? [];
      const gamesPerTeam = Number(control.get('gamesPerTeam')?.value ?? 0);

      if (teamIds.length < 2 || !gamesPerTeam) return null;
      return (teamIds.length * gamesPerTeam) % 2 === 0
        ? null
        : { infeasibleLeague: true };
    };
  }
}
