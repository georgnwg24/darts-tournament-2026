import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DetailedGame, MinimalGame } from '../../../models/game.models';
import { Team } from '../../../models/team.model';
import { GameService } from '../../../services/game.service';
import { TeamService } from '../../../services/team.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { I18nService } from '../../../services/i18n.service';

interface DisplayedGame {
  game: MinimalGame;
  team1?: Team;
  team2?: Team;
  legsToWin?: number;
  team1LegWins: number;
  team2LegWins: number;
}

@Component({
  selector: 'app-games-list.component',
  imports: [CommonModule, MatButtonModule, MatCard, MatCardHeader, MatCardContent, MatIconModule, MatTooltipModule, TranslatePipe],
  templateUrl: './games-list.component.html',
})
export class GamesListComponent {
  displayedGames: DisplayedGame[] = [];
  teamsMap = new Map<string, Team>();

  constructor(
    private readonly gameService: GameService,
    private readonly teamService: TeamService,
    private readonly router: Router,
    private readonly i18nService: I18nService,
  ) {}

  get activeGames(): DisplayedGame[] {
    return this.displayedGames.filter(({ game }) => game.status === 'active');
  }

  get completeGames(): DisplayedGame[] {
    return this.displayedGames.filter(({ game }) => game.status === 'complete');
  }

  ngOnInit(): void {
    this.loadGames();
  }

  loadGames(): void {
    this.teamService.findAll().pipe(
      switchMap((teams) => {
        teams.forEach((team) => this.teamsMap.set(team._id, team));
        return this.gameService.findAllStandaloneGames();
      }),
      switchMap((games) => {
        if (!games.length) return of([] as DisplayedGame[]);

        const detailedRequests = games.map((game) =>
          this.gameService.findById(game._id).pipe(
            map((details) => ({ game, details })),
            catchError(() => of({ game, details: null as DetailedGame | null })),
          ),
        );

        return forkJoin(detailedRequests).pipe(
          map((items) => items.map(({ game, details }) => {
            const team1Id = game.teamIds[0] ?? null;
            const team2Id = game.teamIds[1] ?? null;
            const completedLegs = details?.legs?.filter((leg) => leg.status === 'complete') ?? [];

            return {
              game,
              team1: team1Id ? this.teamsMap.get(team1Id) : undefined,
              team2: team2Id ? this.teamsMap.get(team2Id) : undefined,
              legsToWin: details?.legsToWin,
              team1LegWins: team1Id ? completedLegs.filter((leg) => leg.legWinner === team1Id).length : 0,
              team2LegWins: team2Id ? completedLegs.filter((leg) => leg.legWinner === team2Id).length : 0,
            };
          })),
        );
      }),
    ).subscribe((displayedGames) => {
      this.displayedGames = displayedGames;
    });
  }

  deleteGame(id: string): void {
    if (confirm(this.i18nService.t('games.confirmDelete'))) {
      this.gameService.delete(id).subscribe(() => {
        this.displayedGames = this.displayedGames.filter((item) => item.game._id !== id);
      });
    }
  }

  redirectToCreateGame(): void {
    this.router.navigate(['/games/create']);
  }

  redirectToGameDetails(id: string): void {
    this.router.navigate(['/games', id]);
  }
}
