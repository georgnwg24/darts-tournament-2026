import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DetailedGame, Status } from '../../../models/game.models';
import { Team } from '../../../models/team.model';
import {
  KoMatch,
  KoStage,
  LeagueMatchday,
  Tournament,
  TournamentType,
} from '../../../models/tournament.models';
import { GameService } from '../../../services/game.service';
import {
  OverviewTab,
  OverviewTabService,
} from '../../../services/overview-tab.service';
import { TeamService } from '../../../services/team.service';
import { TournamentService } from '../../../services/tournament.service';
import { I18nService } from '../../../services/i18n.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  collectTournamentGameIds,
  completedGameScore,
  buildLeagueTableRows,
  LeagueTableRow,
} from '../../../utils/tournament-view.utils';

type PodiumPlacement = {
  teamId?: string;
  label: string;
  icon: string;
};

@Component({
  selector: 'app-tournament-details',
  standalone: true,
  imports: [
    CommonModule,
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './tournament-details.component.html',
  styleUrl: './tournament-details.component.scss',
})
export class TournamentDetailsComponent implements OnInit {
  protected tournament: Tournament | null = null;
  protected isLoading = true;
  protected viewedMatchdayIndex = 0;

  protected readonly teamsById = new Map<string, Team>();
  protected readonly gamesById = new Map<string, DetailedGame>();

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly tournamentService: TournamentService,
    private readonly teamService: TeamService,
    private readonly gameService: GameService,
    private readonly overviewTabService: OverviewTabService,
    private readonly i18nService: I18nService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((pm) => {
          const id = pm.get('id');
          if (!id) return of(null);
          return this.tournamentService.findById(id);
        }),
        switchMap((tournament) => {
          if (!tournament) return of(null);

          const teamIds = tournament.teamIds ?? [];
          const gameIds = collectTournamentGameIds(tournament);

          return forkJoin({
            tournament: of(tournament),
            teams:
              teamIds.length > 0
                ? this.teamService.findManyByIds(teamIds)
                : of([]),
            games:
              gameIds.length > 0
                ? forkJoin(
                    gameIds.map((gameId) => this.gameService.findById(gameId)),
                  )
                : of([]),
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (payload) => {
          this.isLoading = false;
          if (!payload) {
            this.tournament = null;
            return;
          }

          this.tournament = payload.tournament;

          this.teamsById.clear();
          payload.teams.forEach((team) => this.teamsById.set(team._id, team));

          this.gamesById.clear();
          payload.games.forEach((game) => this.gamesById.set(game._id, game));

          const activeIdx = (this.tournament.leagueMatchdays ?? []).findIndex(
            (day) => day.status === 'active',
          );
          this.viewedMatchdayIndex = activeIdx >= 0 ? activeIdx : 0;
        },
        error: () => {
          this.isLoading = false;
          this.tournament = null;
        },
      });
  }

  protected get isTournamentComplete(): boolean {
    return this.tournament?.status === 'complete';
  }

  protected get isKo(): boolean {
    return this.tournament?.type === TournamentType.KO;
  }

  protected get isLeague(): boolean {
    return this.tournament?.type === TournamentType.LEAGUE;
  }

  protected get koStages(): KoStage[] {
    return this.tournament?.koStages ?? [];
  }

  protected get showKoPodium(): boolean {
    return this.isKo && this.isTournamentComplete;
  }

  protected get koPodiumPlacements(): PodiumPlacement[] {
    const finalMatch = this.stageByName('final')?.matches[0];
    const thirdPlaceMatch = this.stageByName('thirdPlace')?.matches[0];
    const semifinalMatches = this.stageByName('semifinal')?.matches ?? [];

    const firstTeamId = finalMatch?.winnerTeamId;
    const secondTeamId = finalMatch?.loserTeamId;

    let thirdTeamId = thirdPlaceMatch?.winnerTeamId;
    if (!thirdTeamId) {
      const semifinalLosers = semifinalMatches
        .map((match) => match.loserTeamId)
        .filter((teamId): teamId is string => !!teamId);
      thirdTeamId =
        semifinalLosers.length > 0 ? semifinalLosers.join(' | ') : undefined;
    }

    return [
      {
        teamId: secondTeamId,
        label: this.i18nService.t('tournaments.details.place2'),
        icon: 'military_tech',
      },
      {
        teamId: firstTeamId,
        label: this.i18nService.t('tournaments.details.place1'),
        icon: 'emoji_events',
      },
      {
        teamId: thirdTeamId,
        label: this.i18nService.t('tournaments.details.place3'),
        icon: 'workspace_premium',
      },
    ];
  }

  protected get matchdays(): LeagueMatchday[] {
    return this.tournament?.leagueMatchdays ?? [];
  }

  protected get viewedMatchday(): LeagueMatchday | null {
    return this.matchdays[this.viewedMatchdayIndex] ?? null;
  }

  protected get canGoToPreviousMatchday(): boolean {
    return this.viewedMatchdayIndex > 0;
  }

  protected get canGoToNextMatchday(): boolean {
    return this.viewedMatchdayIndex < this.matchdays.length - 1;
  }

  protected get canAdvanceTournament(): boolean {
    if (this.isTournamentComplete) return true;

    if (this.isKo) {
      const activeStage = this.koStages.find(
        (stage) => stage.status === 'active',
      );
      if (!activeStage) return false;
      return activeStage.matches.every((match) =>
        this.isKoMatchResolved(match),
      );
    }

    const day = this.matchdays.find((matchday) => matchday.status === 'active');
    if (!day || !this.isViewedMatchdayActive()) return false;
    return day.matches.every(
      (match) => this.gameById(match.gameId)?.status === Status.COMPLETE,
    );
  }

  protected get advanceButtonLabel(): string {
    if (this.isTournamentComplete)
      return this.i18nService.t('tournaments.details.returnToTournaments');
    if (this.isActiveKoStageLast || this.isActiveLeagueMatchdayLast)
      return this.i18nService.t('tournaments.details.finishTournament');
    if (this.isLeague)
      return this.i18nService.t('tournaments.details.concludeMatchday');
    return this.i18nService.t('tournaments.details.advanceToNextStage');
  }

  protected get leagueTableRows(): LeagueTableRow[] {
    return this.tournament
      ? buildLeagueTableRows(this.tournament, this.gamesById)
      : [];
  }

  protected previousMatchday(): void {
    if (!this.canGoToPreviousMatchday) return;
    this.viewedMatchdayIndex -= 1;
  }

  protected nextMatchday(): void {
    if (!this.canGoToNextMatchday) return;
    this.viewedMatchdayIndex += 1;
  }

  protected isViewedMatchdayActive(): boolean {
    return this.viewedMatchday?.status === 'active';
  }

  protected openGameDetails(gameId: string | undefined): void {
    if (!gameId) return;
    this.router.navigate(['/games', gameId]);
  }

  protected navigateBackToTournaments(): void {
    this.overviewTabService.setSelectedTab(OverviewTab.Tournaments);
    this.router.navigate(['/']);
  }

  protected teamName(teamId: string | undefined): string {
    if (!teamId) return '—';
    if (teamId.includes('|')) {
      return teamId
        .split('|')
        .map((id) => this.teamName(id.trim()))
        .join(' / ');
    }
    return (
      this.teamsById.get(teamId)?.name ??
      this.i18nService.t('common.unknownTeam')
    );
  }

  protected stageLabel(stage: string): string {
    if (stage === 'quarterfinal')
      return this.i18nService.t('tournaments.ko.quarterFinals');
    if (stage === 'semifinal')
      return this.i18nService.t('tournaments.ko.semiFinals');
    if (stage === 'final') return this.i18nService.t('tournaments.ko.final');
    if (stage === 'thirdPlace')
      return this.i18nService.t('tournaments.ko.thirdPlace');
    return stage;
  }

  protected stageStatusLabel(stage: KoStage): string {
    if (stage.status === 'active')
      return this.i18nService.t('tournaments.details.stageActive');
    if (stage.status === 'completed')
      return this.i18nService.t('tournaments.details.completed');
    return this.i18nService.t('tournaments.details.pending');
  }

  protected stageStatusClass(stage: KoStage): string {
    if (stage.status === 'active') return 'status-active';
    if (stage.status === 'completed') return 'status-complete';
    return 'status-pending';
  }

  protected gameById(gameId: string | undefined): DetailedGame | null {
    if (!gameId) return null;
    return this.gamesById.get(gameId) ?? null;
  }

  protected isKoMatchClickable(stage: KoStage, match: KoMatch): boolean {
    return stage.status === 'active' && !!match.gameId;
  }

  protected koMatchResult(match: KoMatch): string {
    const game = this.gameById(match.gameId);
    if (!game) {
      if (match.resolvedBy === 'walkover')
        return this.i18nService.t('tournaments.details.walkover');
      if (match.resolvedBy === 'empty')
        return this.i18nService.t('tournaments.details.emptySlot');
      return this.i18nService.t('tournaments.details.notPlayedYet');
    }

    return (
      completedGameScore(game) ??
      this.i18nService.t('tournaments.details.inProgress')
    );
  }

  protected koMatchWinnerLabel(match: KoMatch): string | null {
    if (!match.winnerTeamId) return null;
    return this.i18nService.t('tournaments.details.winner', {
      team: this.teamName(match.winnerTeamId),
    });
  }

  protected leagueMatchResult(gameId: string): string {
    const game = this.gameById(gameId);
    return game ? (completedGameScore(game) ?? '—') : '—';
  }

  protected leagueMatchStatus(gameId: string): string {
    const game = this.gameById(gameId);
    if (!game) return this.i18nService.t('tournaments.details.pending');
    return game.status === Status.COMPLETE
      ? this.i18nService.t('tournaments.details.completed')
      : this.i18nService.t('tournaments.details.inProgress');
  }

  protected advanceTournament(): void {
    if (this.isTournamentComplete) {
      this.navigateBackToTournaments();
      return;
    }

    const id = this.tournament?._id;
    if (!id || !this.canAdvanceTournament) return;

    this.tournamentService
      .advance(id)
      .pipe(
        switchMap((tournament) => {
          const gameIds = collectTournamentGameIds(tournament);
          return forkJoin({
            tournament: of(tournament),
            games:
              gameIds.length > 0
                ? forkJoin(
                    gameIds.map((gameId) => this.gameService.findById(gameId)),
                  )
                : of([]),
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ tournament, games }) => {
          this.tournament = tournament;
          this.gamesById.clear();
          games.forEach((game) => this.gamesById.set(game._id, game));

          const activeIdx = (tournament.leagueMatchdays ?? []).findIndex(
            (day) => day.status === 'active',
          );
          if (activeIdx >= 0) this.viewedMatchdayIndex = activeIdx;
        },
      });
  }

  private isKoMatchResolved(match: KoMatch): boolean {
    if (match.winnerTeamId || match.resolvedBy === 'empty') return true;
    if (!match.gameId) return false;

    const game = this.gameById(match.gameId);
    return !!game && game.status === Status.COMPLETE && !!game.gameWinner;
  }

  private stageByName(stageName: string): KoStage | undefined {
    return this.koStages.find((stage) => stage.stage === stageName);
  }

  private get isActiveKoStageLast(): boolean {
    const activeIdx = this.koStages.findIndex(
      (stage) => stage.status === 'active',
    );
    return activeIdx >= 0 && activeIdx === this.koStages.length - 1;
  }

  private get isActiveLeagueMatchdayLast(): boolean {
    const activeIdx = this.matchdays.findIndex(
      (matchday) => matchday.status === 'active',
    );
    return activeIdx >= 0 && activeIdx === this.matchdays.length - 1;
  }
}
