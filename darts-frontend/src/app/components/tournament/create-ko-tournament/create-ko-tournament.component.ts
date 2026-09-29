import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { map, Observable, startWith } from 'rxjs';
import { Team } from '../../../models/team.model';
import { CreateKoTournamentDto } from '../../../models/tournament.models';
import {
  OverviewTab,
  OverviewTabService,
} from '../../../services/overview-tab.service';
import { TeamService } from '../../../services/team.service';
import { TournamentService } from '../../../services/tournament.service';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { MatTooltipModule } from '@angular/material/tooltip';
import { integerValidator } from '../../../validators/integer.validator';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  filterTeams,
  minimumTeamSlots,
  uniqueTeamSlots,
  validTeamSelection,
} from '../../../utils/team-selection.utils';

type StartRound = 'quarterfinal' | 'semifinal';
type StageKey =
  | 'quarterfinalConfig'
  | 'semifinalConfig'
  | 'finalConfig'
  | 'thirdPlaceConfig';
type StageConfig = {
  legsToWin: number;
  roundLimit: number;
  scoreLimit: number;
};

const DEFAULT_STAGE_CONFIGS: Record<StageKey, StageConfig> = {
  quarterfinalConfig: { legsToWin: 2, roundLimit: 12, scoreLimit: 301 },
  semifinalConfig: { legsToWin: 3, roundLimit: 12, scoreLimit: 301 },
  finalConfig: { legsToWin: 3, roundLimit: 16, scoreLimit: 501 },
  thirdPlaceConfig: { legsToWin: 2, roundLimit: 12, scoreLimit: 301 },
};

@Component({
  selector: 'app-create-ko-tournament',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatAutocompleteModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './create-ko-tournament.component.html',
  styleUrl: './create-ko-tournament.component.scss',
})
export class CreateKoTournamentComponent {
  readonly startRoundOptions: Array<{ value: StartRound; label: string }> = [
    { value: 'quarterfinal', label: 'tournaments.ko.quarterFinals' },
    { value: 'semifinal', label: 'tournaments.ko.semiFinals' },
  ];

  readonly stageLabelMap: Record<StageKey, string> = {
    quarterfinalConfig: 'tournaments.ko.quarterFinals',
    semifinalConfig: 'tournaments.ko.semiFinals',
    finalConfig: 'tournaments.ko.final',
    thirdPlaceConfig: 'tournaments.ko.thirdPlace',
  };

  readonly modeStageKeys: Record<StartRound, StageKey[]> = {
    quarterfinal: ['quarterfinalConfig', 'semifinalConfig', 'finalConfig'],
    semifinal: ['semifinalConfig', 'finalConfig'],
  };

  koForm: FormGroup;
  teams: Team[] = [];
  isLoadingTeams = true;
  filteredSlotTeams: Observable<Team[]>[] = [];

  constructor(
    private fb: FormBuilder,
    private teamService: TeamService,
    private tournamentService: TournamentService,
    private router: Router,
    private overviewTabService: OverviewTabService,
  ) {
    this.koForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      startRound: ['quarterfinal', [Validators.required]],
      hasThirdPlaceMatch: [true],
      initialSlots: this.fb.array([]),
      quarterfinalConfig: this.createStageConfigGroup(
        DEFAULT_STAGE_CONFIGS.quarterfinalConfig,
      ),
      semifinalConfig: this.createStageConfigGroup(
        DEFAULT_STAGE_CONFIGS.semifinalConfig,
      ),
      finalConfig: this.createStageConfigGroup(
        DEFAULT_STAGE_CONFIGS.finalConfig,
      ),
      thirdPlaceConfig: this.createStageConfigGroup(
        DEFAULT_STAGE_CONFIGS.thirdPlaceConfig,
      ),
    });

    this.rebuildInitialSlots('quarterfinal');

    this.startRoundControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value: StartRound) => {
        const safeValue: StartRound =
          value === 'semifinal' ? 'semifinal' : 'quarterfinal';
        this.rebuildInitialSlots(safeValue);
        this.initialSlots.updateValueAndValidity();
      });

    this.hasThirdPlaceMatchControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((enabled: boolean) => {
        if (enabled) {
          this.koForm
            .get('thirdPlaceConfig')
            ?.patchValue(DEFAULT_STAGE_CONFIGS.thirdPlaceConfig, {
              emitEvent: false,
            });
        }
      });
  }

  ngOnInit(): void {
    this.teamService.findAll().subscribe({
      next: (teams) => {
        this.teams = teams;
        this.resetSlotAutocompletes();
        this.initialSlots.updateValueAndValidity();
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

  get startRoundControl(): FormControl {
    return this.koForm.get('startRound') as FormControl;
  }

  get hasThirdPlaceMatchControl(): FormControl {
    return this.koForm.get('hasThirdPlaceMatch') as FormControl;
  }

  get currentStartRound(): StartRound {
    return this.startRoundControl.value === 'semifinal'
      ? 'semifinal'
      : 'quarterfinal';
  }

  get initialSlots(): FormArray<FormControl<Team | null>> {
    return this.koForm.get('initialSlots') as FormArray<
      FormControl<Team | null>
    >;
  }

  get activeStageKeys(): StageKey[] {
    const keys = [...this.modeStageKeys[this.currentStartRound]];
    if (this.hasThirdPlaceMatchControl.value) {
      keys.push('thirdPlaceConfig');
    }
    return keys;
  }

  get initialStageTitle(): string {
    return this.currentStartRound === 'quarterfinal'
      ? 'tournaments.ko.quarterFinals'
      : 'tournaments.ko.semiFinals';
  }

  get bracketMatches(): Array<{
    slotAIndex: number;
    slotBIndex: number;
    title: string;
  }> {
    const matches: Array<{
      slotAIndex: number;
      slotBIndex: number;
      title: string;
    }> = [];
    const stagePrefix = this.currentStartRound === 'quarterfinal' ? 'QF' : 'SF';

    for (let index = 0; index < this.initialSlots.length; index += 2) {
      const matchNumber = index / 2 + 1;
      matches.push({
        slotAIndex: index,
        slotBIndex: index + 1,
        title: `${stagePrefix}${matchNumber}`,
      });
    }

    return matches;
  }

  displayTeamName = (team: Team | null): string => team?.name ?? '';

  navigateToCreateTeam(): void {
    this.overviewTabService.setSelectedTab(OverviewTab.Teams);
    this.router.navigate(['/teams/create']);
  }

  navigateToTournamentList(): void {
    this.overviewTabService.setSelectedTab(OverviewTab.Tournaments);
    this.router.navigate(['/']);
  }

  onSubmit(): void {
    if (this.koForm.invalid) {
      this.koForm.markAllAsTouched();
      return;
    }

    const dto: CreateKoTournamentDto = {
      name: this.koForm.get('name')!.value,
      startRound: this.currentStartRound,
      hasThirdPlaceMatch: this.hasThirdPlaceMatchControl.value,
      semifinalConfig: this.readConfig('semifinalConfig'),
      finalConfig: this.readConfig('finalConfig'),
      initialSlots: this.initialSlots.controls.map(
        (control) => control.value?._id ?? null,
      ),
      ...(this.currentStartRound === 'quarterfinal'
        ? { quarterfinalConfig: this.readConfig('quarterfinalConfig') }
        : {}),
      ...(this.hasThirdPlaceMatchControl.value
        ? { thirdPlaceConfig: this.readConfig('thirdPlaceConfig') }
        : {}),
    };

    this.tournamentService.createKo(dto).subscribe({
      next: () => this.navigateToTournamentList(),
      error: (err) => console.error('Error creating KO tournament:', err),
    });
  }

  private createStageConfigGroup(defaults: StageConfig): FormGroup {
    return this.fb.group({
      legsToWin: [
        defaults.legsToWin,
        [Validators.required, Validators.min(1), integerValidator],
      ],
      roundLimit: [
        defaults.roundLimit,
        [Validators.required, Validators.min(1)],
      ],
      scoreLimit: [defaults.scoreLimit, [Validators.min(1)]],
    });
  }

  private readConfig(stage: StageKey) {
    const value = this.koForm.get(stage)!.value;
    return {
      legsToWin: Number(value.legsToWin),
      roundLimit: Number(value.roundLimit),
      ...(value.scoreLimit ? { scoreLimit: Number(value.scoreLimit) } : {}),
    };
  }

  private rebuildInitialSlots(round: StartRound): void {
    const slotCount = round === 'quarterfinal' ? 8 : 4;
    const controls = Array.from({ length: slotCount }, () =>
      this.fb.control<Team | null>(null, [
        validTeamSelection(() => this.teams),
      ]),
    );

    this.koForm.setControl(
      'initialSlots',
      this.fb.array(controls, [minimumTeamSlots(2), uniqueTeamSlots]),
    );

    this.resetSlotAutocompletes();
  }

  private resetSlotAutocompletes(): void {
    this.filteredSlotTeams = this.initialSlots.controls.map((control) =>
      control.valueChanges.pipe(
        startWith(control.value),
        map((value) => filterTeams(this.teams, value, true)),
      ),
    );
  }
}
