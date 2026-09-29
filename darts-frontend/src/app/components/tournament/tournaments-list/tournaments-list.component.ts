import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Tournament } from '../../../models/tournament.models';
import { Team } from '../../../models/team.model';
import { TeamService } from '../../../services/team.service';
import { TournamentService } from '../../../services/tournament.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { I18nService } from '../../../services/i18n.service';

@Component({
  selector: 'app-tournaments-list.component',
  imports: [
    CommonModule,
    MatButtonModule,
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './tournaments-list.component.html',
})
export class TournamentsListComponent {
  tournaments: Tournament[] = [];
  teamsMap = new Map<string, Team>();

  constructor(
    private readonly tournamentService: TournamentService,
    private readonly teamService: TeamService,
    private readonly router: Router,
    private readonly i18nService: I18nService,
  ) {}

  get activeTournaments(): Tournament[] {
    return this.tournaments.filter((tournament) => tournament.status === 'active');
  }

  get completeTournaments(): Tournament[] {
    return this.tournaments.filter((tournament) => tournament.status === 'complete');
  }

  ngOnInit(): void {
    this.loadTournaments();
  }

  loadTournaments(): void {
    this.teamService.findAll().pipe(
      switchMap((teams) => {
        teams.forEach((team) => this.teamsMap.set(team._id, team));
        return this.tournamentService.findAll();
      }),
    ).subscribe((tournaments) => {
      this.tournaments = tournaments;
    });
  }

  redirectToCreateKoTournament(): void {
    this.router.navigate(['/tournaments/ko/create']);
  }

  redirectToCreateLeagueTournament(): void {
    this.router.navigate(['/tournaments/league/create']);
  }

  redirectToTournamentDetails(id: string): void {
    this.router.navigate(['/tournaments', id]);
  }

  deleteTournament(id: string): void {
    if (confirm(this.i18nService.t('tournaments.confirmDelete'))) {
      this.tournamentService.delete(id).subscribe(() => {
        this.tournaments = this.tournaments.filter((tournament) => tournament._id !== id);
      });
    }
  }

  teamNames(teamIds: string[]): string {
    return teamIds
      .map((teamId) => this.teamsMap.get(teamId)?.name)
      .filter((teamName): teamName is string => !!teamName)
      .join(', ');
  }
}
