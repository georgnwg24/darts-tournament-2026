import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TeamService } from '../../../services/team.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateTeamDto } from '../../../models/team.model';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  OverviewTab,
  OverviewTabService,
} from '../../../services/overview-tab.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';

enum Mode {
  Edit = 'EDIT',
  Create = 'CREATE',
}

@Component({
  selector: 'app-create-edit-team.component',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './create-edit-team.component.html',
  styleUrl: './create-edit-team.component.scss',
})
export class CreateEditTeamComponent {
  teamForm: FormGroup;
  mode: Mode = Mode.Create;
  teamId: string | null = null;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private fb: FormBuilder,
    private teamService: TeamService,
    private router: Router,
    private route: ActivatedRoute,
    private overviewTabService: OverviewTabService,
  ) {
    this.teamForm = this.fb.group(
      {
        teamName: [
          '',
          [
            Validators.required,
            Validators.minLength(1),
            Validators.maxLength(30),
          ],
        ],
        player1: [
          '',
          [
            Validators.required,
            Validators.minLength(1),
            Validators.maxLength(20),
          ],
        ],
        player2: [
          '',
          [
            Validators.required,
            Validators.minLength(1),
            Validators.maxLength(20),
          ],
        ],
      },
      { validators: this.playersMatchValidator },
    );
  }

  private playersMatchValidator(
    control: AbstractControl,
  ): { [key: string]: boolean } | null {
    const player1 = control.get('player1')?.value;
    const player2 = control.get('player2')?.value;

    return player1 && player2 && player1 === player2
      ? { playersMatch: true }
      : null;
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.teamId = params.get('id');
        if (this.teamId) {
          this.mode = Mode.Edit;
          this.fillFields();
        } else {
          this.mode = Mode.Create;
        }
      });
  }

  private fillFields(): void {
    if (!this.teamId) return;

    this.teamService
      .findById(this.teamId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((team) => {
        this.teamForm.patchValue({
          teamName: team.name,
          player1: team.players[0],
          player2: team.players[1],
        });
      });
  }

  onSubmit(): void {
    if (this.teamForm.invalid) return;

    const formValue = this.teamForm.value;
    const teamDto: CreateTeamDto = {
      name: formValue.teamName,
      players: [formValue.player1, formValue.player2],
    };

    const action =
      this.isEditMode && this.teamId
        ? this.teamService.update(this.teamId, teamDto)
        : this.teamService.create(teamDto);

    action.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.navigateToTeamsList(),
      error: (err) => console.error('Error saving team:', err),
    });
  }

  navigateToTeamsList(): void {
    this.overviewTabService.setSelectedTab(OverviewTab.Teams);
    this.router.navigate(['/']);
  }

  protected get isEditMode(): boolean {
    return this.mode === Mode.Edit;
  }
}
