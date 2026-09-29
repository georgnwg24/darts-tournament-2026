import { Component } from '@angular/core';
import { TeamService } from '../../../services/team.service';
import { Router } from '@angular/router';
import { Team } from '../../../models/team.model';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { I18nService } from '../../../services/i18n.service';

@Component({
  selector: 'app-teams-list.component',
  imports: [
    CommonModule,
    MatButtonModule,
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatTooltipModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './teams-list.component.html',
  styleUrl: './teams-list.component.scss',
})
export class TeamsListComponent {
  teams: Team[] = [];

  constructor(
    private teamService: TeamService,
    private router: Router,
    private readonly i18nService: I18nService,
  ) {}

  ngOnInit(): void {
    this.teamService.findAll().subscribe((teams) => {
      this.teams = teams;
    });
  }

  deleteTeam(id: string): void {
    if (confirm(this.i18nService.t('teams.confirmDelete'))) {
      this.teamService.delete(id).subscribe(() => {
        this.teams = this.teams.filter((team) => team._id !== id);
      });
    }
  }

  redirectToCreateTeam(): void {
    this.router.navigate(['/teams/create']);
  }

  redirectToEditTeam(id: string): void {
    this.router.navigate(['/teams/edit', id]);
  }
}
