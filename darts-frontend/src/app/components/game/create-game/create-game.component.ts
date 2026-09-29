import { Component } from '@angular/core';
import { CreateGameDto } from '../../../models/game.models';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { GameService } from '../../../services/game.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TeamService } from '../../../services/team.service';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Team } from '../../../models/team.model';
import { map, Observable, startWith } from 'rxjs';
import {
  OverviewTab,
  OverviewTabService,
} from '../../../services/overview-tab.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { MatTooltipModule } from '@angular/material/tooltip';
import { integerValidator } from '../../../validators/integer.validator';
import { filterTeams } from '../../../utils/team-selection.utils';

@Component({
  selector: 'app-create-game',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    MatCardModule,
    MatAutocompleteModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './create-game.component.html',
  styleUrl: './create-game.component.scss',
})
export class CreateGame {
  gameForm: FormGroup;
  teams: Team[] = [];
  isLoadingTeams = true;
  filteredStartingTeams!: Observable<Team[]>;
  filteredOpposingTeams!: Observable<Team[]>;

  constructor(
    private fb: FormBuilder,
    private gameService: GameService,
    private teamService: TeamService,
    private router: Router,
    private overviewTabService: OverviewTabService,
  ) {
    this.gameForm = this.fb.group(
      {
        legsToWin: [
          1,
          [Validators.required, Validators.min(1), integerValidator],
        ],
        roundLimit: ['', [Validators.required, Validators.min(1)]],
        scoreLimit: [''],
        startingTeamId: [null, [Validators.required]],
        opposingTeamId: [null, [Validators.required]],
      },
      { validators: this.teamIdsMatchValidator },
    );
  }

  ngOnInit(): void {
    this.teamService.findAll().subscribe({
      next: (teams) => {
        this.teams = teams;

        this.filteredStartingTeams = this.gameForm
          .get('startingTeamId')!
          .valueChanges.pipe(
            startWith(''),
            map((value) => filterTeams(this.teams, value)),
          );

        this.filteredOpposingTeams = this.gameForm
          .get('opposingTeamId')!
          .valueChanges.pipe(
            startWith(''),
            map((value) => filterTeams(this.teams, value)),
          );
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

  private teamIdsMatchValidator = (
    control: AbstractControl,
  ): { [key: string]: boolean } | null => {
    const startingTeam: Team | null =
      control.get('startingTeamId')?.value ?? null;
    const opposingTeam: Team | null =
      control.get('opposingTeamId')?.value ?? null;

    if (!startingTeam || !opposingTeam) return null;
    return startingTeam._id === opposingTeam._id
      ? { teamIdsMatch: true }
      : null;
  };

  displayTeamName = (team: Team | null): string => team?.name ?? '';

  get shouldShowTeamMatchError(): boolean {
    const startingTeamControl = this.gameForm.get('startingTeamId');
    const opposingTeamControl = this.gameForm.get('opposingTeamId');

    if (!startingTeamControl || !opposingTeamControl) return false;

    return (
      this.gameForm.hasError('teamIdsMatch') &&
      (startingTeamControl.dirty ||
        opposingTeamControl.dirty ||
        this.gameForm.touched)
    );
  }

  onSubmit(): void {
    if (this.gameForm.invalid) return;

    const startingTeam: Team = this.gameForm.get('startingTeamId')!.value;
    const opposingTeam: Team = this.gameForm.get('opposingTeamId')!.value;

    const formValue = this.gameForm.value;

    const createGameDto: CreateGameDto = {
      legsToWin: Number(formValue.legsToWin),
      roundLimit: formValue.roundLimit,
      ...(formValue.scoreLimit
        ? { scoreLimit: Number(formValue.scoreLimit) }
        : {}),
      teamIds: [startingTeam._id, opposingTeam._id],
    };

    this.gameService.create(createGameDto).subscribe({
      next: () => this.navigateToGamesList(),
      error: (err) => console.error('Error creating game:', err),
    });
  }

  navigateToCreateTeam(): void {
    this.overviewTabService.setSelectedTab(OverviewTab.Teams);
    this.router.navigate(['/teams/create']);
  }

  navigateToGamesList(): void {
    this.overviewTabService.setSelectedTab(OverviewTab.Games);
    this.router.navigate(['/']);
  }
}
